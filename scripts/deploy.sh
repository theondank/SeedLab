#!/usr/bin/env bash
# =============================================================================
# SeedLab - Déploiement par polling (le serveur tire main depuis GitHub)
# Usage:                bash scripts/deploy.sh
# Tous les X min (cron):   */1 * * * * bash /var/www/seedlab/scripts/deploy.sh >> /var/log/seedlab-deploy.log 2>&1
# =============================================================================
set -euo pipefail

# --- Configuration (à adapter si besoin) -------------------------------------
GIT_URL="https://github.com/theondank/SeedLab.git"
BRANCH="main"
REPO_DIR="/var/www/seedlab"   # dossier du clone git
WEB_DIR="/var/www/html"       # racine web servie par Apache (où va dist/)
# -----------------------------------------------------------------------------

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Clone initial si besoin
if [ ! -d "$REPO_DIR/.git" ]; then
  log "Clone initial de $GIT_URL dans $REPO_DIR"
  mkdir -p "$REPO_DIR"
  git clone --branch "$BRANCH" "$GIT_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"

# Récupérer le nouvel état remote sans toucher au working tree
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Aucun changement sur $BRANCH, rien à faire."
  exit 0
fi

log "Nouvelle version détectée ($LOCAL -> $REMOTE), déploiement..."

# Mettre le working tree à l'état exact de origin/main
git reset --hard "origin/$BRANCH"

# BACK : dépendances + redémarrage
log "Installation des dépendances backend..."
( cd "$REPO_DIR/seedlab_backend" && npm ci )
log "Redémarrage du backend..."
( cd "$REPO_DIR/seedlab_backend" && pm2 restart seedlab-backend 2>/dev/null ) \
  || ( cd "$REPO_DIR/seedlab_backend" && pm2 start src/server.js --name seedlab-backend )
pm2 save > /dev/null 2>&1 || true

# FRONT : dépendances + build + copie dans la racine web
log "Build du frontend..."
( cd "$REPO_DIR/seedlab-front" && npm ci && npm run build )
log "Copie de dist/ vers $WEB_DIR..."
rsync -av --delete \
  --exclude '.git/' \
  --exclude 'seedlab_backend/' \
  --exclude 'seedlab-front/' \
  --exclude 'scripts/' \
  "$REPO_DIR/seedlab-front/dist/" \
  "$WEB_DIR/"

log "Déploiement terminé."