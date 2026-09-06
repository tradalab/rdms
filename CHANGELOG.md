# Changelog

---

## [1.15.1]

### 🐛 Fixes

- **docker:** The web image failed to build - `go.mod` moved to Go 1.27 but `Dockerfile_web` still pulled `golang:1.26-alpine`, so `go mod download` refused with `go.mod requires go >= 1.27.0`. Desktop builds were unaffected; only the container image was missing for 1.15.0

---

## [1.15.0]

### 🚀 Features

- **shell:** RedisGraph support - a `graphdata` key opens into a Cypher console with syntax highlighting and schema-aware completion, and the answer reads either as an interactive node-link graph or as the raw table. Create graph keys from the New Key dialog and filter the browser by graph type. Works against RedisGraph and FalkorDB
- **shell:** RedisJSON support - browse and edit `ReJSON-RL` documents in a dedicated editor, create JSON keys from the New Key dialog, and filter the browser by JSON type. Requires a server with the RedisJSON module (bundled in Redis 8 core)
- **shell:** New **Analysis** tab - keyspace profiling with key counts by type, power-of-two size distribution, memory overview, TTL spread and the largest keys, in three modes (INFO-only / sampled / full scan) with live progress and cancel
- **key-browser:** Advanced filtering - substring, glob and regex patterns, several at once, with exclude and ignore-case per pattern and saveable filter presets
- **app:** Run in the background - closing the window hides RedisHub to the system tray instead of quitting, with Open/Quit from the tray menu (Windows, Linux)
- **updater:** Release notes are shown when an update is offered, and the settings dialog carries the runtime version
- **i18n:** Vietnamese language support

### 🐛 Fixes

- **cluster:** The key browser, key search and bulk delete only ever saw one master's keys on a Redis Cluster - a bare `SCAN` is routed to a single node and then reports it is done. All keyspace walks now fan out across every master
- **shell:** The JSON editor failed to start its language service in web mode, logging `Monaco initialization: error` and falling back to running it on the main thread
- **shell:** Keys with no expiry showed a TTL of `0s` instead of `—` in the largest-keys table
- **updater:** Automatic update checks could not be turned off
- **shell:** External links opened inside the app window instead of the system browser

### 🔧 Chores

- **deps:** Scorix runtime v0.25.0, Lyra 2.3.0, pnpm 11.22.0, Node 24
- **dev:** A FalkorDB box joins the local Redis stack, because `redis:8` carries no graph module

---

## [1.14.0]

### 🚀 Features

- **shell:** Redesign the key-detail view — a richer header (type badge, one-click copy, humanized TTL) and a live metadata strip showing length, memory footprint (`MEMORY USAGE`), and internal encoding (`OBJECT ENCODING`) (#89)
- **shell:** Add infinite-scroll loading to the collection value tables (Hash, List, Set, ZSet, Stream) for smoother browsing of large keys

### ♻️ Improvements & Refactors

- **ui:** Adopt the **Lyra** design system across the app for a more consistent, polished interface
- **shell:** Rework the Insert Row drawer and inline value editors
- **shell:** Refine the connection form layout
- **ui:** Always-visible row actions in value tables (previously revealed only on hover)

### 🔧 Chores

- **ui:** Use the official GitHub mark for the sidebar link

---

## [1.13.0]

### 🚀 Features

- **connection:** Add per-connection **Read-only Mode** — server-enforced blocking of every write command (detected from the live Redis `COMMAND` table, with a curated fallback), gated mutating UI actions, console feedback, and clear indicators, for safely exploring production data (#88)

### 🐛 Fixes

- **windows:** Fix the application GUI failing to launch/render on Windows

### ♻️ Improvements & Refactors

- **shell:** Consolidate the key-browser header's view actions (Key List, General, Console, Pub/Sub, Monitor, Slow Query) into a single **Views** menu to reduce clutter
- **deps:** Update Scorix runtime to v0.9.2

### 🔧 Chores

- **ui:** Add settings panel icon

---

## [1.12.0]

### 🚀 Features

- **shell:** Persist open tabs and their state across restarts (#87)
- **core:** Migrate to the Scorix native runtime (no-CGO WebView2) for a lighter, faster desktop app
- **ipc:** Move Go ↔ JS communication to the auto-injected `window.scorix` bridge

### 🐛 Fixes

- **windows:** Fix blurry UI on high-DPI / scaled displays by enabling Per-Monitor-V2 DPI awareness
- **keys:** Fix load-all-keys behavior and TTL formatting

### ♻️ Improvements & Refactors

- **shell:** Rework the data layer onto TanStack Query API hooks for more predictable state (#86)
- **core:** Migrate business logic to the new Scorix model layer (#84)
- **test:** Add Vitest setup and tests for the command engine

---

## [1.11.0]

### 🚀 Features

- **monitor:** Add real-time Redis MONITOR support with performance warnings (#71)
- **ui:** Add Compact Mode for higher density layout (#69)
- **command:** Upgrade Command Palette with smart suggestions, persistent history, and safety confirmations for dangerous commands (#81)
- **keys:** Add bulk delete keys by prefix (#74)
- **connection:** Add manual and auto-refresh controls for connection details (#76)
- **core:** Upgrade to Next.js 15 and Shadcn UI (#68)
- **docker:** Support multi-platform web docker builds (#73)

### 🐛 Fixes

- **editor:** Stabilize code editor behavior and focus
- **ui:** Fix crash in key creation dialog
- **ui:** Fix handling of empty keys in tree view

---

## [1.10.0]

### 🚀 Features

- **ui:** Add table view mode for keys (#32)
- **ui:** Add server info sidebar
- **pubsub:** Add Redis Pub/Sub support (#34)
- **core:** Auto-load keys on scroll
- **deps:** Update Scorix to v0.3.0 (system tray, single instance, background running)

### 🐛 Fixes

- **ui:** Fix overflow and scroll issues
- **connection:** Fix connection group update creating duplicate groups

---

## [1.9.0]

### 🚀 Features

- **proxy:** Support HTTP and SOCKS5 proxies for Redis connections
- **ui:** Enhanced tab management with pinning and bulk closing (Close All, Close Others)
- **web:** Full support for **Web Mode**, allowing RedisHub to run as a central web server
- **web:** Improved context menu and event handling for web performance
- **seo:** Optimized meta tags and social sharing in documentation site

### 🐛 Fixes

- **ssh:** Improved SSH tunnel stability and reconnection logic
- **ui:** Fixed event bubbling issues in web tab context menu
- **sentinel:** Support for separate Sentinel credentials and NAT address mapping

---

## [1.8.0]

### 🚀 Features

- **macos:** Add macOS support (#42)
- **ui:** Add tab-based interface (#36)

### ⚡ Performance

- **search:** Improve key search performance (#27)
- **tree:** Optimize tree for handling large number of keys (#27)

### 🐛 Fixes

- **group:** Fix incorrect key count in groups (#27)

---

## [1.7.0]

### 🚀 Features

- **connection:** Enhanced Sentinel support with separate Master/Sentinel credentials and grouping
- **connection:** Robust Cluster support with seed address import functionality
- **connection:** Implement Address Mapping (NAT Traversal) for reaching internal Docker/NAT nodes
- **connection:** Dynamic SSH Dialer support for discovery-based connections (Sentinel/Cluster)
- **updater:** Add silent update setting and rate limit for check-update
- **ui:** Add multi-tab validation indicators (error dots on tabs)
- **i18n:** Added support for new connection fields and better localizations
- **linux:** Support Linux release and AppImage artifacts

### 🐛 Fixes

- **connection:** Fix "expected string, received null" Zod validation error
- **ssh:** Fix SSH connection stability and `panic in queuedNewConn` by reusing SSH clients
- **docker:** Fix dev networking with `RDH_HOST_IP` for proper node announcement
- **updater:** Refactor updater to use provider pattern and improved setting management

### ♻️ Improvements & Refactors

- **refactor:** Decouple SSH tunneling from static port forwarding using custom `Dialer`
- **ui:** Improve connection form layout and alignment
- **scripts:** Update build and dev orchestration scripts

---

## [1.6.0]

### 🚀 Features

- **release:** Add release script and update environment configuration
- **connection:** Add SSL/TLS support
- **ssh:** Support using private key content instead of file path
- **connection:** Load key size and add connection form panel options
- **deps:** Update Scorix version

### 🐛 Fixes

- **select:** Prevent unselecting the currently selected option

### ♻️ Improvements & Refactors

- **config:** Increase default timeout to 60 seconds

---

## [1.5.0]

### 🚀 Features

- **ssh:** Support SSH tunnel connections (#19)
- **settings:** Update settings dialog UI (#21)
- **group:** Use context and API hooks for group management (#20)
- **connection:** Use context and API hooks for connection management
- **windows:** Upgrade Windows packer configuration (#22)
- **config:** Add connection timeout configuration

### 🐛 Fixes

- Fix bridge logic injection

### 📝 Documentation

- Use Git-based download links
- Add documentation site using Nextra (#18)

### ♻️ Improvements & Refactors

- Update CSS styles and coding conventions

### 🔧 Chores

- Bump Go dependencies

---

## [1.4.0]

### 🚀 Features

- **shell:** Add external links (GitHub, Bug Report, Documentation) to sidebar and settings dialog
- **core:** Update Scorix version and upgrade to Go 1.26.0 (#16)
- **build:** Add Windows Docker builder (#15)
- **build:** Add Linux build support (#14)

### 🛠 CI

- **workflows:** Add Windows release workflow (#17)
- **workflows:** Update action triggers

### 🐛 Fixes

- Resolve UI blocking issue

---

## [1.3.0]

### 🚀 Features

- **key-stream:** Add key creation and entry insertion for Redis Stream (#13)
- **ui:** Handle loading states in key detail and general UI (#11)
- **ui:** Upgrade slow query screen (#10)
- **console:** Handle dangerous commands in console (#7)
- **console:** Add theme support for console (#6)
- **core:** Remove elements from data structures (#8)
- **core:** Add delete confirmation provider (#9)

### 📝 Documentation

- Upgrade documentation (#12)

---

## [1.2.0]

### 🚀 Features

- **setting:** Automatic update check
- **core:** Add test connection feature
- **core:** Use UUIDv7 for better ordering and performance (#5)

### ♻️ Improvements & Refactors

- **refactor:** UI simplification (#4)
- **refactor:** Remove unused code (#3)

---

## [1.1.0]

### 🚀 Features

- **setting:** Save user settings
- **i18n:** Japanese language support
- **i18n:** Basic internationalization system
- **ui:** Show key count

### 📝 Documentation

- Add documentation website
