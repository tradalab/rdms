package redisscan

import "testing"

func TestCursorStringKeepsTheZeroContract(t *testing.T) {
	cases := []struct {
		name string
		cur  Cursor
		want string
	}{
		{"start", Cursor{}, "0"},
		{"done", Done, "0"},
		{"mid first node", Cursor{Node: 0, Pos: 145}, "0:145"},
		{"start of second node", Cursor{Node: 1, Pos: 0}, "1:0"},
		{"mid second node", Cursor{Node: 2, Pos: 99}, "2:99"},
	}
	for _, c := range cases {
		if got := c.cur.String(); got != c.want {
			t.Errorf("%s: String() = %q, want %q", c.name, got, c.want)
		}
	}
}

func TestParseCursorRoundTrips(t *testing.T) {
	for _, c := range []Cursor{{}, {Node: 0, Pos: 145}, {Node: 1}, {Node: 3, Pos: 7}} {
		if got := ParseCursor(c.String()); got != c {
			t.Errorf("ParseCursor(%q) = %+v, want %+v", c.String(), got, c)
		}
	}
}

func TestParseCursorAcceptsLegacyAndJunk(t *testing.T) {
	if got := ParseCursor("4096"); got != (Cursor{Pos: 4096}) {
		t.Errorf("legacy cursor: got %+v", got)
	}
	for _, junk := range []string{"", "0", "abc", "-1:5", "1:xyz", ":", "  "} {
		if got := ParseCursor(junk); got != (Cursor{}) {
			t.Errorf("ParseCursor(%q) = %+v, want the start cursor", junk, got)
		}
	}
}

func TestDoneIsTerminal(t *testing.T) {
	if !Done.Done() {
		t.Error("Done must report Done()")
	}
	if (Cursor{}).Done() {
		t.Error("the start cursor must not report Done()")
	}
	if (Cursor{Node: 2}).Done() {
		t.Error("a later node must not report Done()")
	}
}
