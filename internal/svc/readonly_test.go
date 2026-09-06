package svc

import (
	"context"
	"testing"

	"github.com/redis/go-redis/v9"
)

func mkCmd(args ...interface{}) redis.Cmder {
	return redis.NewCmd(context.Background(), args...)
}

func TestIsWriteCmd_StaticFallback(t *testing.T) {
	c := &Client{} // writeCmds == nil

	writes := [][]interface{}{
		{"set", "k", "v"}, {"del", "k"}, {"expire", "k", "10"}, {"rename", "a", "b"},
		{"hset", "h", "f", "v"}, {"hdel", "h", "f"}, {"lpush", "l", "v"}, {"rpop", "l"},
		{"sadd", "s", "m"}, {"srem", "s", "m"}, {"zadd", "z", "1", "m"}, {"zrem", "z", "m"},
		{"xadd", "x", "*", "f", "v"}, {"flushall"}, {"flushdb"}, {"swapdb", "0", "1"},
		{"json.set", "k", ".", "1"},
		{"graph.query", "g", "MATCH (n) RETURN n"}, {"graph.delete", "g"},
	}
	for _, w := range writes {
		if !c.isWriteCmd(mkCmd(w...)) {
			t.Errorf("expected WRITE, got read for %v", w)
		}
	}

	reads := [][]interface{}{
		{"get", "k"}, {"mget", "a", "b"}, {"hget", "h", "f"}, {"hgetall", "h"},
		{"scan", "0"}, {"keys", "*"}, {"ping"}, {"info"}, {"type", "k"},
		{"lrange", "l", "0", "-1"}, {"smembers", "s"}, {"zrange", "z", "0", "-1"},
		{"publish", "ch", "msg"}, {"subscribe", "ch"}, {"ttl", "k"},
		{"graph.ro_query", "g", "MATCH (n) RETURN n"}, {"graph.explain", "g", "MATCH (n) RETURN n"},
		{"graph.list"},
	}
	for _, r := range reads {
		if c.isWriteCmd(mkCmd(r...)) {
			t.Errorf("expected READ, got write for %v", r)
		}
	}
}

func TestIsWriteCmd_AdminSubcommands(t *testing.T) {
	c := &Client{}

	blocked := [][]interface{}{
		{"config", "set", "maxmemory", "100mb"},
		{"graph.config", "set", "TIMEOUT", "1000"},
		{"config", "rewrite"},
		{"script", "load", "return 1"},
		{"script", "flush"},
		{"function", "load", "code"},
		{"acl", "setuser", "u"},
		{"cluster", "failover"},
		{"cluster", "reset"},
		{"shutdown", "nosave"},
		{"debug", "sleep", "0"},
	}
	for _, b := range blocked {
		if !c.isWriteCmd(mkCmd(b...)) {
			t.Errorf("expected admin command BLOCKED for %v", b)
		}
	}

	allowed := [][]interface{}{
		{"config", "get", "maxmemory"},
		{"script", "exists", "abc"},
		{"function", "list"},
		{"acl", "whoami"},
		{"cluster", "info"},
		{"cluster", "nodes"},
		{"graph.config", "get", "TIMEOUT"},
	}
	for _, a := range allowed {
		if c.isWriteCmd(mkCmd(a...)) {
			t.Errorf("expected admin read ALLOWED for %v", a)
		}
	}
}

func TestIsWriteCmd_DynamicSetAuthoritative(t *testing.T) {
	c := &Client{writeCmds: map[string]struct{}{"set": {}, "module.write": {}}}

	if !c.isWriteCmd(mkCmd("set", "k", "v")) {
		t.Error("set should be a write via the dynamic set")
	}
	if !c.isWriteCmd(mkCmd("module.write", "x")) {
		t.Error("module write should be detected via the dynamic set")
	}
	if c.isWriteCmd(mkCmd("get", "k")) {
		t.Error("get should be a read")
	}
}
