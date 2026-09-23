# To restore from the latest snapshot at any second:
LATEST=$(ls -t ../presbuilder_snapshots/snapshot_*.tar.gz | head -1) && \
tar -xzf "$LATEST" && echo "Restored from $LATEST"