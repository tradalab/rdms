// Package graphreply decodes a RedisGraph / FalkorDB GRAPH.QUERY reply.
package graphreply

import (
	"encoding/json"
	"fmt"
	"sort"
)

type Node struct {
	ID         int64          `json:"id"`
	Labels     []string       `json:"labels"`
	Properties map[string]any `json:"properties"`
}

type Edge struct {
	ID         int64          `json:"id"`
	Type       string         `json:"type"`
	Src        int64          `json:"src"`
	Dst        int64          `json:"dst"`
	Properties map[string]any `json:"properties"`
}

// Nodes and Edges are harvested from the cells, not fetched separately.
type Result struct {
	Columns []string
	Rows    [][]string // JSON-encoded cells, one per column
	Nodes   []Node
	Edges   []Edge
	Stats   []string
}

// Parse reads the verbose reply, not --compact: compact tags its types but then
// needs a second round trip to resolve label and property ids. The cost is that
// a node arrives in the same array-of-pairs shape a Cypher map does, so nodes
// and edges are recognised by their reserved key sets.
func Parse(reply any) (*Result, error) {
	top, ok := reply.([]any)
	if !ok {
		return nil, fmt.Errorf("graph: unexpected reply type %T", reply)
	}

	res := &Result{Columns: []string{}, Rows: [][]string{}, Nodes: []Node{}, Edges: []Edge{}, Stats: []string{}}

	// A query with no result set answers with the statistics block alone.
	switch len(top) {
	case 0:
		return res, nil
	case 1:
		res.Stats = strSlice(top[0])
		return res, nil
	}

	res.Columns = header(top[0])

	d := &decoder{nodes: map[int64]Node{}, edges: map[int64]Edge{}}
	rows, _ := top[1].([]any)
	for _, r := range rows {
		cells, _ := r.([]any)
		row := make([]string, 0, len(cells))
		for _, c := range cells {
			row = append(row, d.encode(c))
		}
		res.Rows = append(res.Rows, row)
	}

	if len(top) > 2 {
		res.Stats = strSlice(top[2])
	}

	res.Nodes, res.Edges = d.collected()
	return res, nil
}

type decoder struct {
	nodes map[int64]Node
	edges map[int64]Edge
}

func (d *decoder) encode(v any) string {
	b, err := json.Marshal(d.decode(v))
	if err != nil {
		return fmt.Sprint(v)
	}
	return string(b)
}

func (d *decoder) decode(v any) any {
	switch x := v.(type) {
	case nil:
		return nil
	case []byte:
		return string(x)
	case []any:
		if pairs, ok := asPairs(x); ok {
			return d.decodePairs(pairs)
		}
		out := make([]any, len(x))
		for i, e := range x {
			out[i] = d.decode(e)
		}
		return out
	case map[any]any: // RESP3 map, should not reach us from a module but is cheap to accept
		out := make(map[string]any, len(x))
		for k, val := range x {
			out[fmt.Sprint(k)] = d.decode(val)
		}
		return out
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, val := range x {
			out[k] = d.decode(val)
		}
		return out
	default: // string, int64, float64, bool
		return x
	}
}

func (d *decoder) decodePairs(pairs map[string]any) any {
	if n, ok := d.asNode(pairs); ok {
		return n
	}
	if e, ok := d.asEdge(pairs); ok {
		return e
	}
	out := make(map[string]any, len(pairs))
	for k, v := range pairs {
		out[k] = d.decode(v)
	}
	return out
}

func (d *decoder) asNode(pairs map[string]any) (Node, bool) {
	id, ok := intOf(pairs["id"])
	if !ok {
		return Node{}, false
	}
	labels, hasLabels := pairs["labels"]
	props, hasProps := pairs["properties"]
	if !hasLabels || !hasProps {
		return Node{}, false
	}

	n := Node{ID: id, Labels: strSlice(labels), Properties: d.properties(props)}
	d.nodes[id] = n
	return n, true
}

func (d *decoder) asEdge(pairs map[string]any) (Edge, bool) {
	id, ok := intOf(pairs["id"])
	if !ok {
		return Edge{}, false
	}
	src, hasSrc := intOf(pairs["src_node"])
	// RedisGraph named the far end dst_node; FalkorDB, the fork this also has to
	// talk to, renamed it dest_node. Reading only one silently loses every edge.
	dst, hasDst := intOf(pairs["dst_node"])
	if !hasDst {
		dst, hasDst = intOf(pairs["dest_node"])
	}
	kind, hasType := pairs["type"].(string)
	if !hasSrc || !hasDst || !hasType {
		return Edge{}, false
	}

	e := Edge{ID: id, Type: kind, Src: src, Dst: dst, Properties: d.properties(pairs["properties"])}
	d.edges[id] = e
	return e, true
}

func (d *decoder) properties(v any) map[string]any {
	props := map[string]any{}
	list, ok := v.([]any)
	if !ok {
		return props
	}
	pairs, ok := asPairs(list)
	if !ok {
		return props
	}
	for k, val := range pairs {
		props[k] = d.decode(val)
	}
	return props
}

// Ordered by id so the same result always lays out the same way on screen.
func (d *decoder) collected() ([]Node, []Edge) {
	nodes := make([]Node, 0, len(d.nodes))
	for _, n := range d.nodes {
		nodes = append(nodes, n)
	}
	sort.Slice(nodes, func(i, j int) bool { return nodes[i].ID < nodes[j].ID })

	edges := make([]Edge, 0, len(d.edges))
	for _, e := range d.edges {
		edges = append(edges, e)
	}
	sort.Slice(edges, func(i, j int) bool { return edges[i].ID < edges[j].ID })

	return nodes, edges
}

// The array-of-[key, value] shape the verbose protocol uses for maps, nodes and
// edges alike.
func asPairs(v []any) (map[string]any, bool) {
	if len(v) == 0 {
		return nil, false
	}
	pairs := make(map[string]any, len(v))
	for _, e := range v {
		kv, ok := e.([]any)
		if !ok || len(kv) != 2 {
			return nil, false
		}
		k, ok := kv[0].(string)
		if !ok {
			return nil, false
		}
		pairs[k] = kv[1]
	}
	return pairs, true
}

// Compact mode would send [type, name] pairs; reading either costs one branch.
func header(v any) []string {
	list, ok := v.([]any)
	if !ok {
		return []string{}
	}
	out := make([]string, 0, len(list))
	for _, e := range list {
		switch x := e.(type) {
		case string:
			out = append(out, x)
		case []any:
			if len(x) == 2 {
				if name, ok := x[1].(string); ok {
					out = append(out, name)
					continue
				}
			}
			out = append(out, fmt.Sprint(x))
		default:
			out = append(out, fmt.Sprint(x))
		}
	}
	return out
}

func strSlice(v any) []string {
	list, ok := v.([]any)
	if !ok {
		return []string{}
	}
	out := make([]string, 0, len(list))
	for _, e := range list {
		switch x := e.(type) {
		case string:
			out = append(out, x)
		case []byte:
			out = append(out, string(x))
		default:
			out = append(out, fmt.Sprint(x))
		}
	}
	return out
}

func intOf(v any) (int64, bool) {
	switch x := v.(type) {
	case int64:
		return x, true
	case int:
		return int64(x), true
	case float64:
		return int64(x), true
	}
	return 0, false
}
