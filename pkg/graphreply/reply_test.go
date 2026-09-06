package graphreply

import (
	"reflect"
	"testing"
)

// node and edge as the verbose protocol sends them: an array of [key, value].
func node(id int64, label, propKey, propVal string) []any {
	return []any{
		[]any{"id", id},
		[]any{"labels", []any{label}},
		[]any{"properties", []any{[]any{propKey, propVal}}},
	}
}

func edge(id, src, dst int64, kind string) []any {
	return edgeWith("dst_node", id, src, dst, kind)
}

func edgeWith(dstKey string, id, src, dst int64, kind string) []any {
	return []any{
		[]any{"id", id},
		[]any{"type", kind},
		[]any{"src_node", src},
		[]any{dstKey, dst},
		[]any{"properties", []any{}},
	}
}

func TestParseStatsOnly(t *testing.T) {
	// CREATE with no RETURN: the server answers with the statistics block alone.
	res, err := Parse([]any{[]any{"Nodes created: 1", "Query internal execution time: 0.3 milliseconds"}})
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(res.Rows) != 0 || len(res.Columns) != 0 {
		t.Fatalf("want no table, got %d columns / %d rows", len(res.Columns), len(res.Rows))
	}
	if len(res.Stats) != 2 || res.Stats[0] != "Nodes created: 1" {
		t.Fatalf("stats not carried through: %#v", res.Stats)
	}
}

func TestParseNodeRow(t *testing.T) {
	reply := []any{
		[]any{"n"},
		[]any{[]any{node(0, "Person", "name", "Alice")}},
		[]any{"Query internal execution time: 0.5 milliseconds"},
	}

	res, err := Parse(reply)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if !reflect.DeepEqual(res.Columns, []string{"n"}) {
		t.Fatalf("columns = %#v", res.Columns)
	}
	want := `{"id":0,"labels":["Person"],"properties":{"name":"Alice"}}`
	if len(res.Rows) != 1 || res.Rows[0][0] != want {
		t.Fatalf("cell = %#v, want %s", res.Rows, want)
	}
	if len(res.Nodes) != 1 || res.Nodes[0].Labels[0] != "Person" {
		t.Fatalf("nodes = %#v", res.Nodes)
	}
	if len(res.Edges) != 0 {
		t.Fatalf("edges = %#v", res.Edges)
	}
}

func TestParseCollectsGraphAcrossRows(t *testing.T) {
	// MATCH (a)-[r]->(b) RETURN a, r, b over two rows sharing node 0: the
	// node-link view must see three distinct nodes and two edges, not five.
	row := func(src, dst int64, edgeID int64, dstName string) []any {
		return []any{
			node(0, "Person", "name", "Alice"),
			edge(edgeID, src, dst, "KNOWS"),
			node(dst, "Person", "name", dstName),
		}
	}
	reply := []any{
		[]any{"a", "r", "b"},
		[]any{row(0, 1, 100, "Bob"), row(0, 2, 101, "Carol")},
		[]any{"Query internal execution time: 1.0 milliseconds"},
	}

	res, err := Parse(reply)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(res.Rows) != 2 || len(res.Rows[0]) != 3 {
		t.Fatalf("table = %#v", res.Rows)
	}
	if len(res.Nodes) != 3 {
		t.Fatalf("want 3 deduped nodes, got %d: %#v", len(res.Nodes), res.Nodes)
	}
	if res.Nodes[0].ID != 0 || res.Nodes[1].ID != 1 || res.Nodes[2].ID != 2 {
		t.Fatalf("nodes not ordered by id: %#v", res.Nodes)
	}
	if len(res.Edges) != 2 || res.Edges[0].Type != "KNOWS" || res.Edges[1].Dst != 2 {
		t.Fatalf("edges = %#v", res.Edges)
	}
}

func TestParseScalarsAndMaps(t *testing.T) {
	reply := []any{
		[]any{"count", "name", "props"},
		[]any{[]any{
			int64(3),
			"Alice",
			[]any{[]any{"city", "Hanoi"}, []any{"age", int64(30)}},
		}},
		[]any{},
	}

	res, err := Parse(reply)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	got := res.Rows[0]
	if got[0] != "3" || got[1] != `"Alice"` {
		t.Fatalf("scalars = %#v", got)
	}
	// A plain Cypher map keeps its own keys and must not be mistaken for a node.
	if got[2] != `{"age":30,"city":"Hanoi"}` {
		t.Fatalf("map = %s", got[2])
	}
	if len(res.Nodes) != 0 {
		t.Fatalf("a map became a node: %#v", res.Nodes)
	}
}

func TestParseMapMissingNodeKeysStaysMap(t *testing.T) {
	// "id" alone does not make a node - labels and properties must be there too,
	// otherwise every user map with an id column would land in the graph view.
	reply := []any{
		[]any{"m"},
		[]any{[]any{[]any{[]any{"id", int64(7)}, []any{"title", "release"}}}},
		[]any{},
	}

	res, err := Parse(reply)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(res.Nodes) != 0 {
		t.Fatalf("nodes = %#v", res.Nodes)
	}
	if res.Rows[0][0] != `{"id":7,"title":"release"}` {
		t.Fatalf("cell = %s", res.Rows[0][0])
	}
}

func TestParseNestedListOfNodes(t *testing.T) {
	// collect(n) returns a list of nodes: the elements must still reach the
	// node-link view, and the cell must stay a JSON array.
	reply := []any{
		[]any{"people"},
		[]any{[]any{[]any{node(0, "Person", "name", "Alice"), node(1, "Person", "name", "Bob")}}},
		[]any{},
	}

	res, err := Parse(reply)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(res.Nodes) != 2 {
		t.Fatalf("nodes = %#v", res.Nodes)
	}
	if res.Rows[0][0][0] != '[' {
		t.Fatalf("cell should be a JSON array: %s", res.Rows[0][0])
	}
}

func TestParseRejectsNonArrayReply(t *testing.T) {
	if _, err := Parse("OK"); err == nil {
		t.Fatal("want an error for a non-array reply")
	}
}

func TestParseFalkorDBDestNode(t *testing.T) {
	// FalkorDB spells the far end dest_node where RedisGraph spells it dst_node;
	// missing that turns every edge into an anonymous map and empties the view.
	reply := []any{
		[]any{"r"},
		[]any{[]any{edgeWith("dest_node", 5, 0, 1, "KNOWS")}},
		[]any{},
	}

	res, err := Parse(reply)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(res.Edges) != 1 {
		t.Fatalf("edges = %#v", res.Edges)
	}
	if res.Edges[0].Src != 0 || res.Edges[0].Dst != 1 || res.Edges[0].Type != "KNOWS" {
		t.Fatalf("edge = %#v", res.Edges[0])
	}
}
