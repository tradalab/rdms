# RedisHub

RedisHub is a powerful, professional command center for the Redis ecosystem. Built for performance and reliability, it is available as a **Native Desktop Client** for Windows, macOS, and Linux, or as a **Centralized Web Application** for teams.

## 📺 Showcase



### Key Screenshots

| Dashboard                                        | Connection Settings | Tab Management |
|--------------------------------------------------|--------------------|----------------|
| ![Dashboard](https://redishub.tradalab.com/assets/en/dashboard.png) | ![New Connection](https://redishub.tradalab.com/assets/en/new-connection.png) | ![Tab Context Menu](https://redishub.tradalab.com/assets/en/tab-context-menu.png) |

## Key Features

- **Hybrid Platform Support**: Use it as a native desktop application or deploy it as a central web server for team collaboration.
- **Multi-Tab Interface**: Navigate multiple connections and tasks simultaneously.
- **Rich Key Inspector**: Redesigned key-detail view with a type badge, one-click copy, humanized TTL, live memory (`MEMORY USAGE`) and encoding (`OBJECT ENCODING`) insights, and infinite-scroll value tables for large collections.
- **Enhanced Tab Management**: Pin important connections and use bulk closing actions (Close All, Close Others).
- **Proxy Support**: Connect securely through HTTP and SOCKS5 proxies.
- **Advanced Topology Discovery**: Automatic node discovery for Sentinel and Cluster setups.
- **Sentinel Master Credentials**: Support for separate credentials between Sentinel and Master nodes.
- **Dynamic SSH Tunneling**: Reach internal nodes through a single gateway with one-click setup.
- **Monitor & Debugging**: Real-time command streaming with the **Monitor** tool and **Pub/Sub** pattern matching.
- **Improved Command Palette**: Advanced console with command suggestions, history, and dangerous command warnings.
- **UI Customization**: **Compact Mode** for high-density layouts and multi-theme support.
- **Bulk Operations**: Efficient **Bulk Delete** by prefix to manage large-scale data.
- **High Performance**: Optimized for browsing and searching databases with 500k+ keys.
- **Universal Support**: Native binaries for Windows, macOS (Universal), and Linux.

---

## Development Guide

Quick start:

```bash
git clone https://github.com/tradalab/redishub.git
cd redishub
make deps      # Go + pnpm dependencies
make redis-up  # local Redis: standalone + sentinel + cluster + FalkorDB (graph), via Docker
make dev       # Next.js dev server (HMR) + Go backend, opens the app window
```

The full guide lives on the docs site, which is the single source for it — this README only
points at it, so the two can't drift apart:

- **[Getting Started](https://redishub.tradalab.com/docs/development/setup)** — prerequisites,
  runtime dependencies, workspace init, the local Redis topologies and their ports, project structure.
- **[Adding IPC Commands](https://redishub.tradalab.com/docs/development/extending)** — the
  proto-driven `service:method` flow, from `proto/app.proto` through `make generate` to the frontend call.
- **[Commands Reference](https://redishub.tradalab.com/docs/development/commands)** — every `make` target.
- **Building** — [Windows](https://redishub.tradalab.com/docs/development/build-windows) ·
  [macOS](https://redishub.tradalab.com/docs/development/build-macos) ·
  [Linux](https://redishub.tradalab.com/docs/development/build-linux).
- **[Troubleshooting](https://redishub.tradalab.com/docs/development/troubleshooting)** — embed
  failures, window not opening, cluster, port conflicts.
- **[Contribution Guide](https://redishub.tradalab.com/docs/development/contribution)** — how a
  change gets in.

---

## Contributors

Thanks goes to these amazing people:

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/atdevten">
        <img src="https://github.com/atdevten.png" width="100px;" alt="atdevten"/><br />
        <sub><b>atdevten</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/0xtrungnq">
        <img src="https://github.com/0xtrungnq.png" width="100px;" alt="0xtrungnq"/><br />
        <sub><b>0xtrungnq</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/0xtrada">
        <img src="https://github.com/0xtrada.png" width="100px;" alt="0xtrada"/><br />
        <sub><b>0xtrada</b></sub>
      </a>
    </td>
  </tr>
</table>
