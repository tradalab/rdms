package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"io/fs"
	"log"
	"os"

	"github.com/tradalab/rdms/internal/handler"
	"github.com/tradalab/rdms/internal/svc"
	"github.com/tradalab/scorix/app"
	browsermod "github.com/tradalab/scorix/module/browser"
	traymod "github.com/tradalab/scorix/module/systemtray"
	updatermod "github.com/tradalab/scorix/module/updater"
)

//go:embed all:.scorix/dist
var embeddedPublic embed.FS

//go:embed scorix.yaml
var manifest []byte

//go:embed assets/icon.ico
var trayIcon []byte

func main() {
	log.SetFlags(log.Ltime)
	mode := flag.String("mode", envOr("SCORIX_MODE", "app"), "run mode: app | web (env: SCORIX_MODE)")
	addr := flag.String("addr", "", "web listen address override (default: manifest web.host:port / SCORIX_WEB_*)")
	webToken := flag.String("web-token", "", "web mode access token; required for non-loopback deployments (empty = trust the network)")
	configPath := flag.String("config", "", "runtime config overlay YAML (or set SCORIX_CONFIG)")
	flag.Parse()

	site, err := fs.Sub(embeddedPublic, ".scorix/dist")
	if err != nil {
		log.Fatal(err)
	}

	a, err := app.New(app.Options{
		URL:               "scorix://app/index.html",
		Manifest:          manifest,
		WebToken:          *webToken,
		RuntimeConfigPath: *configPath,
	})
	if err != nil {
		log.Fatal(err)
	}
	a.Serve("scorix", site)

	a.Module(traymod.New(trayIcon))
	a.Module(browsermod.New())
	a.Module(updatermod.New())

	sc := svc.NewServiceContext(a)
	defer sc.RedisManager.CloseAll()
	handler.RegisterHandlers(a, sc)

	a.OnReady(func(*app.App) {
		ctx := context.Background()
		if err := sc.MigrateSchema(ctx); err != nil {
			log.Printf("schema migration failed: %v", err)
		}
		if err := sc.MigrateSecrets(ctx); err != nil {
			log.Printf("secrets migration failed (will retry next start): %v", err)
		}
	})

	if *mode == "web" {
		listen := *addr
		if listen == "" {
			listen = a.WebAddr()
		}
		log.Printf("RedisHub (web) on http://%s", listen)
		if err := a.RunWeb(listen); err != nil {
			log.Fatal(err)
		}
		return
	}
	if err := a.Run(); err != nil {
		if errors.Is(err, app.ErrAlreadyRunning) {
			return // the running instance was activated
		}
		log.Fatal(err)
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
