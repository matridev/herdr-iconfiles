#!/bin/sh
# Installs (or removes) the `file-icons` mod into the Herdr desktop app.
#
#   sh scripts/install.sh install     copy the mod, add the "main-file-icons" layout, switch to it
#   sh scripts/install.sh uninstall   switch back to "main", remove the layout and the mod
#
# The app's home is $HERDR_APP_HOME, else ~/.config/herdr-app. Under WSL the
# app usually runs on Windows, so its Windows home is used too when present.
set -eu

ACTION=${1:-install}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MOD=file-icons
LAYOUT=main-file-icons

say() { printf '[herdr-iconfiles] %s\n' "$*"; }
is_wsl() { grep -qi microsoft /proc/version 2>/dev/null; }
# cmd.exe complains when started from a Linux folder, so start it from C:.
win_env() { (cd /mnt/c 2>/dev/null && cmd.exe /c "echo %$1%" 2>/dev/null | tr -d '\r') || true; }
to_unix() { case "$1" in [A-Za-z]:\\*|[A-Za-z]:/*) if command -v wslpath >/dev/null 2>&1; then wslpath -u "$1"; else printf '%s' "$1"; fi ;; *) printf '%s' "$1" ;; esac; }
to_native() { case "$1" in /mnt/[a-z]/*) wslpath -w "$1" ;; *) printf '%s' "$1" ;; esac; }

# --- where is the app? -------------------------------------------------------
HOMES=""
add_home() { [ -d "$1" ] && HOMES="$HOMES
$1"; return 0; }
APP=""

if [ -n "${HERDR_APP_HOME:-}" ]; then
  add_home "$(to_unix "$HERDR_APP_HOME")"
else
  if is_wsl; then
    WIN_PROFILE=$(win_env USERPROFILE)
    WIN_LOCAL=$(win_env LOCALAPPDATA)
    [ -n "$WIN_PROFILE" ] && add_home "$(to_unix "$WIN_PROFILE")/.config/herdr-app"
    if [ -n "$WIN_LOCAL" ] && [ -x "$(to_unix "$WIN_LOCAL")/Programs/herdr-app/herdr-app.exe" ]; then
      APP="$(to_unix "$WIN_LOCAL")/Programs/herdr-app/herdr-app.exe"
    fi
  fi
  add_home "$HOME/.config/herdr-app"
fi

if [ -z "$APP" ]; then
  for c in herdr-app herdr-app.exe /Applications/Herdr.app/Contents/MacOS/herdr-app; do
    if command -v "$c" >/dev/null 2>&1; then APP=$(command -v "$c"); break; fi
    if [ -x "$c" ]; then APP=$c; break; fi
  done
fi

if [ -z "$HOMES" ]; then
  say "Herdr desktop app not found (no ~/.config/herdr-app). Open the app once, then run:"
  say "  herdr plugin action invoke matridev.iconfiles.install"
  exit 0
fi

app() { [ -n "$APP" ] && "$APP" "$@" 2>/dev/null; }
current_layout() { sed -n 's/.*"layout"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1/shared.json" 2>/dev/null | head -n 1; }

# --- install / uninstall -----------------------------------------------------
echo "$HOMES" | while IFS= read -r home; do
  [ -n "$home" ] || continue
  case "$ACTION" in
    install)
      mkdir -p "$home/mods" "$home/layouts"
      # Copy over the existing files instead of deleting the folder first: the
      # app watches it, and on Windows drives a watched folder can't be removed.
      mkdir -p "$home/mods/$MOD"
      cp -R "$ROOT/mods/$MOD/." "$home/mods/$MOD/"
      say "mod installed: $home/mods/$MOD"

      if [ -f "$home/layouts/$LAYOUT.json" ]; then
        say "layout kept: $home/layouts/$LAYOUT.json"
      elif [ -f "$home/layouts/main.json" ]; then
        sed 's/"mod"[[:space:]]*:[[:space:]]*"files"/"mod": "file-icons"/' "$home/layouts/main.json" > "$home/layouts/$LAYOUT.json"
        say "layout created: $home/layouts/$LAYOUT.json (Herdr's main layout, Files panel with icons)"
      else
        say "no layouts/main.json yet; point a layout block's content.mod to \"$MOD\" to use it"
      fi

      if [ -n "$APP" ]; then
        if out=$(HERDR_APP_HOME="$(to_native "$home")" "$APP" check "$(to_native "$home/mods/$MOD")" 2>&1); then
          say "check passed"
        else
          say "check reported a problem:"; printf '%s\n' "$out"
        fi
        if [ -f "$home/layouts/$LAYOUT.json" ] && HERDR_APP_HOME="$(to_native "$home")" app do layout.switch --name "$LAYOUT" >/dev/null; then
          say "switched the open window to the \"$LAYOUT\" layout (ctrl-shift-l cycles layouts)"
        fi
      fi
      ;;
    uninstall)
      if [ "$(current_layout "$home")" = "$LAYOUT" ]; then
        HERDR_APP_HOME="$(to_native "$home")" app do layout.switch --name main >/dev/null || true
      fi
      rm -f "$home/layouts/$LAYOUT.json"
      rm -rf "$home/mods/$MOD" 2>/dev/null || { sleep 2; rm -rf "$home/mods/$MOD"; }
      say "removed from $home"
      ;;
    *) say "usage: install.sh [install|uninstall]"; exit 2 ;;
  esac
done
