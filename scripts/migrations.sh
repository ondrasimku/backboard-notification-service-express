#!/bin/bash
set -e

export DB_HOST=localhost

COMMAND=$1
NAME=$2

case "$COMMAND" in
  create)
    if [ -z "$NAME" ]; then
      echo "Missing migration name."
      echo "Usage: ./migrations.sh create <migration_name>"
      exit 1
    fi
    echo "Generating migration: $NAME"
    npm run typeorm -- migration:generate src/migrations/$(basename "$NAME") -d src/config/database.ts
    ;;
  
  run)
    echo "Running migrations..."
    npm run typeorm -- migration:run -d src/config/database.ts
    ;;
  
  *)
    echo "Unknown command: $COMMAND"
    echo "Usage:"
    echo "  ./migrations.sh create <migration_name>   # Create a new migration"
    echo "  ./migrations.sh run                       # Run all pending migrations"
    exit 1
    ;;
esac