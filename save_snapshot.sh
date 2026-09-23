# 1. Create a zero-dependency physical snapshot of the entire workspace
# mkdir -p ../presbuilder_snapshots && \
tar --exclude='node_modules' --exclude='.git' \
    -czf "../presbuilder_snapshots/snapshot_$(date +%Y%m%d_%H%M%S).tar.gz" . && \
echo "✅ Snapshot secured in ../presbuilder_snapshots/"