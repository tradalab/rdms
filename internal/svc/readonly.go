package svc

import (
	"context"
	"errors"
	"slices"
	"strings"

	"github.com/redis/go-redis/v9"
)

var ErrReadOnly = errors.New("read-only mode is enabled: write command blocked")

var staticWriteCmds = map[string]struct{}{
	// string / generic keyspace
	"set": {}, "setnx": {}, "setex": {}, "psetex": {}, "setrange": {}, "append": {},
	"getset": {}, "getdel": {}, "getex": {}, "del": {}, "unlink": {}, "rename": {},
	"renamenx": {}, "move": {}, "copy": {}, "restore": {}, "migrate": {}, "expire": {},
	"pexpire": {}, "expireat": {}, "pexpireat": {}, "persist": {}, "setbit": {},
	"bitop": {}, "bitfield": {}, "incr": {}, "decr": {}, "incrby": {}, "decrby": {},
	"incrbyfloat": {}, "mset": {}, "msetnx": {},
	// hash
	"hset": {}, "hsetnx": {}, "hmset": {}, "hdel": {}, "hincrby": {}, "hincrbyfloat": {},
	// list
	"lpush": {}, "rpush": {}, "lpushx": {}, "rpushx": {}, "lpop": {}, "rpop": {}, "lset": {},
	"linsert": {}, "lrem": {}, "ltrim": {}, "rpoplpush": {}, "lmove": {}, "blpop": {},
	"brpop": {}, "blmove": {}, "brpoplpush": {}, "lmpop": {}, "blmpop": {},
	// set
	"sadd": {}, "srem": {}, "spop": {}, "smove": {}, "sinterstore": {}, "sunionstore": {},
	"sdiffstore": {},
	// sorted set
	"zadd": {}, "zincrby": {}, "zrem": {}, "zremrangebyrank": {}, "zremrangebyscore": {},
	"zremrangebylex": {}, "zpopmin": {}, "zpopmax": {}, "bzpopmin": {}, "bzpopmax": {},
	"zrangestore": {}, "zdiffstore": {}, "zinterstore": {}, "zunionstore": {}, "zmpop": {},
	"bzmpop": {},
	// stream
	"xadd": {}, "xdel": {}, "xtrim": {}, "xsetid": {}, "xgroup": {}, "xack": {}, "xclaim": {},
	"xautoclaim": {}, "xreadgroup": {},
	// hyperloglog / geo / bitmap writes
	"pfadd": {}, "pfmerge": {}, "geoadd": {}, "geosearchstore": {}, "georadius": {},
	"georadiusbymember": {},
	// scripting (may write)
	"eval": {}, "evalsha": {}, "fcall": {},
	// RedisJSON module writes
	"json.set": {}, "json.del": {}, "json.forget": {}, "json.arrappend": {},
	"json.arrinsert": {}, "json.arrpop": {}, "json.arrtrim": {}, "json.numincrby": {},
	"json.nummultby": {}, "json.strappend": {}, "json.toggle": {}, "json.clear": {},
	"json.merge": {}, "json.mset": {},
	// RedisGraph / FalkorDB. GRAPH.QUERY carries the write flag whatever the
	// Cypher inside it says, which is why the console sends the RO twin instead
	// once a connection is read-only.
	"graph.query": {}, "graph.delete": {}, "graph.profile": {}, "graph.bulk": {},
	"graph.constraint": {}, "graph.copy": {},
	// destructive admin (also "write"-flagged on most servers)
	"flushall": {}, "flushdb": {}, "swapdb": {},
}

func buildWriteCmds(ctx context.Context, rdb redis.UniversalClient) map[string]struct{} {
	infos, err := rdb.Command(ctx).Result()
	if err != nil || len(infos) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(infos))
	for name, info := range infos {
		if info != nil && slices.Contains(info.Flags, "write") {
			set[strings.ToLower(name)] = struct{}{}
		}
	}
	return set
}

func (c *Client) isWriteCmd(cmd redis.Cmder) bool {
	name := strings.ToLower(cmd.Name())
	if name == "" {
		return false
	}

	switch name {
	case "config":
		sub := subArg(cmd, 1)
		return sub != "get" && sub != "help" // set / rewrite / resetstat
	case "script":
		sub := subArg(cmd, 1)
		return sub != "exists" && sub != "help" // load / flush / kill
	case "function":
		switch subArg(cmd, 1) {
		case "list", "dump", "stats", "help":
			return false
		default: // load / delete / flush / restore / kill
			return true
		}
	case "acl":
		switch subArg(cmd, 1) {
		case "cat", "getuser", "list", "users", "whoami", "help":
			return false
		default: // setuser / deluser / load / save / genpass
			return true
		}
	case "cluster":
		switch subArg(cmd, 1) {
		case "addslots", "addslotsrange", "delslots", "delslotsrange", "setslot",
			"reset", "failover", "forget", "meet", "set-config-epoch", "bumpepoch",
			"flushslots", "replicate":
			return true
		default:
			return false
		}
	case "graph.config":
		return subArg(cmd, 1) != "get" // set
	case "shutdown", "debug", "failover", "reset":
		return true
	}

	if c.writeCmds != nil {
		_, ok := c.writeCmds[name]
		return ok
	}
	_, ok := staticWriteCmds[name]
	return ok
}

func subArg(cmd redis.Cmder, i int) string {
	args := cmd.Args()
	if len(args) <= i {
		return ""
	}
	if s, ok := args[i].(string); ok {
		return strings.ToLower(s)
	}
	return ""
}

type readOnlyHook struct {
	cli *Client
}

func (h *readOnlyHook) DialHook(next redis.DialHook) redis.DialHook { return next }

func (h *readOnlyHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		if h.cli.ReadOnly.Load() && h.cli.isWriteCmd(cmd) {
			cmd.SetErr(ErrReadOnly)
			return ErrReadOnly
		}
		return next(ctx, cmd)
	}
}

func (h *readOnlyHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		if h.cli.ReadOnly.Load() {
			for _, cmd := range cmds {
				if h.cli.isWriteCmd(cmd) {
					for _, c := range cmds {
						c.SetErr(ErrReadOnly)
					}
					return ErrReadOnly
				}
			}
		}
		return next(ctx, cmds)
	}
}
