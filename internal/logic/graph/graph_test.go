package graph

import (
	"testing"

	"github.com/tradalab/rdms/internal/svc"
)

func TestParseCount(t *testing.T) {
	ok := []struct {
		cell string
		want int64
	}{
		{"12", 12},     // the usual: the cell holds a JSON number
		{`"12"`, 12},   // a build that renders scalars as bulk strings
		{`" 12 "`, 12}, // ... with padding
		{"0", 0},
		{"9007199254740993", 9007199254740993}, // past float64's exact range
	}
	for _, c := range ok {
		got, err := parseCount(c.cell)
		if err != nil {
			t.Errorf("parseCount(%q): %v", c.cell, err)
			continue
		}
		if got != c.want {
			t.Errorf("parseCount(%q) = %d, want %d", c.cell, got, c.want)
		}
	}

	// A count that cannot be read must say so: returning 0 here is
	// indistinguishable from an empty graph and renders as a confident lie.
	for _, cell := range []string{"", "null", `"many"`, "1e+21", `{"id":1}`} {
		if got, err := parseCount(cell); err == nil {
			t.Errorf("parseCount(%q) = %d, want an error", cell, got)
		}
	}
}

func TestReadCmdFollowsReadOnly(t *testing.T) {
	cli := &svc.Client{}
	if got := readCmd(cli); got != "GRAPH.QUERY" {
		t.Errorf("writable connection used %s", got)
	}

	// Read-only blocks GRAPH.QUERY at the command layer whatever the Cypher
	// says, so browsing a graph there depends on picking the RO twin.
	cli.ReadOnly.Store(true)
	if got := readCmd(cli); got != "GRAPH.RO_QUERY" {
		t.Errorf("read-only connection used %s", got)
	}
}
