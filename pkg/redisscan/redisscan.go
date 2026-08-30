package redisscan

import (
	"context"
	"sort"
	"strconv"
	"strings"

	"github.com/redis/go-redis/v9"
)

type Node struct {
	Addr   string
	Client redis.UniversalClient
}

func Masters(ctx context.Context, rdb redis.UniversalClient) []Node {
	cc, ok := rdb.(*redis.ClusterClient)
	if !ok {
		return []Node{{Client: rdb}}
	}
	var nodes []Node
	_ = cc.ForEachMaster(ctx, func(ctx context.Context, node *redis.Client) error {
		nodes = append(nodes, Node{Addr: node.Options().Addr, Client: node})
		return nil
	})
	if len(nodes) == 0 {
		return []Node{{Client: rdb}}
	}
	sort.Slice(nodes, func(i, j int) bool { return nodes[i].Addr < nodes[j].Addr })
	return nodes
}

type Cursor struct {
	Node int
	Pos  uint64
}

func ParseCursor(s string) Cursor {
	s = strings.TrimSpace(s)
	if s == "" || s == "0" {
		return Cursor{}
	}
	if node, pos, ok := strings.Cut(s, ":"); ok {
		n, err1 := strconv.Atoi(node)
		p, err2 := strconv.ParseUint(pos, 10, 64)
		if err1 != nil || err2 != nil || n < 0 {
			return Cursor{}
		}
		return Cursor{Node: n, Pos: p}
	}
	p, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return Cursor{}
	}
	return Cursor{Pos: p}
}

func (c Cursor) String() string {
	if c.Done() || (c.Node <= 0 && c.Pos == 0) {
		return "0"
	}
	return strconv.Itoa(c.Node) + ":" + strconv.FormatUint(c.Pos, 10)
}

func (c Cursor) Done() bool { return c.Node < 0 }

var Done = Cursor{Node: -1}

func Page(ctx context.Context, rdb redis.UniversalClient, cur Cursor, match string, count int64, keyType string) ([]string, Cursor, error) {
	nodes := Masters(ctx, rdb)
	if cur.Node >= len(nodes) || cur.Done() {
		return nil, Done, nil
	}
	if match == "" {
		match = "*"
	}

	node := nodes[cur.Node].Client
	var (
		keys []string
		next uint64
		err  error
	)
	if keyType != "" {
		keys, next, err = node.ScanType(ctx, cur.Pos, match, count, keyType).Result()
	} else {
		keys, next, err = node.Scan(ctx, cur.Pos, match, count).Result()
	}
	if err != nil {
		return nil, cur, err
	}

	if next != 0 {
		return keys, Cursor{Node: cur.Node, Pos: next}, nil
	}
	if cur.Node+1 < len(nodes) {
		return keys, Cursor{Node: cur.Node + 1}, nil
	}
	return keys, Done, nil
}

func Each(ctx context.Context, rdb redis.UniversalClient, match string, count int64, fn func(keys []string) error) error {
	cur := Cursor{}
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		keys, next, err := Page(ctx, rdb, cur, match, count, "")
		if err != nil {
			return err
		}
		if len(keys) > 0 {
			if err := fn(keys); err != nil {
				if err == ErrStop {
					return nil
				}
				return err
			}
		}
		if next.Done() {
			return nil
		}
		cur = next
	}
}

var ErrStop = errStop{}

type errStop struct{}

func (errStop) Error() string { return "redisscan: stop" }
