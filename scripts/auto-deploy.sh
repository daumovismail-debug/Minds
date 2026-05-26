#!/bin/bash
# Auto-deploy script: pulls latest commit from branch and rebuilds if changed.
# Designed to be run from cron every minute.
# Uses flock to prevent overlapping builds.

set -e

DIR=/opt/minds
BRANCH=claude/stoic-meitner-fYbTQ
LOG=/var/log/minds-deploy.log
LOCK=/var/lock/minds-deploy.lock

(
  flock -n 200 || exit 0
  exec >>"$LOG" 2>&1
  cd "$DIR"

  git fetch origin "$BRANCH" >/dev/null 2>&1 || {
    echo "$(date '+%Y-%m-%d %H:%M:%S') fetch failed"
    exit 1
  }
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse "origin/$BRANCH")

  if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
  fi

  echo ""
  echo "$(date '+%Y-%m-%d %H:%M:%S') === DEPLOY ==="
  echo "from: $LOCAL"
  echo "to:   $REMOTE"
  git reset --hard "origin/$BRANCH"
  docker compose up -d --build
  echo "$(date '+%Y-%m-%d %H:%M:%S') === DONE ==="
) 200>"$LOCK"
