#!/bin/bash

# Configuration
COMPOSE_FILES=("-f" "docker-compose-standalone.yaml" "-f" "docker-compose-sentinel.yaml" "-f" "docker-compose-cluster.yaml" "-f" "docker-compose-falkordb.yaml")

# Detect Host IP for Redis Cluster announcement
# This is required for Windows host to connect to Cluster nodes in separate containers
# An explicitly provided RDH_HOST_IP wins; detection often picks a VPN adapter.
if [ -z "$RDH_HOST_IP" ]; then
    if command -v ipconfig.exe &>/dev/null; then
        export RDH_HOST_IP=$(ipconfig.exe | grep "IPv4 Address" | head -n 1 | awk '{print $NF}' | tr -d '\r')
    else
        export RDH_HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
fi
if [ -z "$RDH_HOST_IP" ]; then
    export RDH_HOST_IP="127.0.0.1"
fi
echo "Using Host IP for Cluster announcement: $RDH_HOST_IP"

function up() {
    echo "Starting all Redis components..."
    docker compose "${COMPOSE_FILES[@]}" up -d
}

function down() {
    echo "Stopping all Redis components..."
    docker compose "${COMPOSE_FILES[@]}" down
}

function status() {
    echo "Status of Redis components:"
    docker compose "${COMPOSE_FILES[@]}" ps
}

function logs() {
    echo "Logs for Redis components:"
    docker compose "${COMPOSE_FILES[@]}" logs -f
}

function init_cluster() {
    if [ "$RDH_HOST_IP" = "127.0.0.1" ] || [ -z "$RDH_HOST_IP" ]; then
        echo "ERROR: cluster init needs a LAN IP the containers can reach, not loopback." >&2
        echo "       Host IP detection failed; set it yourself:  RDH_HOST_IP=192.168.x.y $0 init-cluster" >&2
        exit 1
    fi
    echo "Initializing Redis Cluster (Separate Instances)..."
    # Wait for nodes
    sleep 5
    docker exec redis-node-1 redis-cli -a rdh_cluster_pwd --cluster create \
        $RDH_HOST_IP:7001 \
        $RDH_HOST_IP:7002 \
        $RDH_HOST_IP:7003 \
        --cluster-replicas 0 --cluster-yes
}

case "$1" in
    up)
        up
        ;;
    down)
        down
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    init-cluster)
        init_cluster
        ;;
    *)
        echo "Usage: $0 {up|down|status|logs|init-cluster}"
        exit 1
        ;;
esac
