# Installs (or removes) the `file-icons` mod into the Herdr desktop app on Windows.
#
#   powershell -File scripts/install.ps1 install
#   powershell -File scripts/install.ps1 uninstall
param([string]$Action = "install")
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Mod = "file-icons"
$Layout = "main-file-icons"
function Say($m) { Write-Output "[herdr-iconfiles] $m" }

$AppHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $env:USERPROFILE ".config\herdr-app" }
$App = Join-Path $env:LOCALAPPDATA "Programs\herdr-app\herdr-app.exe"
if (-not (Test-Path $App)) { $cmd = Get-Command herdr-app -ErrorAction SilentlyContinue; $App = if ($cmd) { $cmd.Source } else { $null } }

if (-not (Test-Path $AppHome)) {
  Say "Herdr desktop app not found ($AppHome). Open the app once, then run:"
  Say "  herdr plugin action invoke matridev.iconfiles.install-windows"
  exit 0
}

$ModDir = Join-Path $AppHome "mods\$Mod"
$LayoutFile = Join-Path $AppHome "layouts\$Layout.json"
$Main = Join-Path $AppHome "layouts\main.json"

switch ($Action) {
  "install" {
    New-Item -ItemType Directory -Force -Path (Join-Path $AppHome "mods"), (Join-Path $AppHome "layouts") | Out-Null
    # Copy over the existing files: the app watches the folder, so it isn't deleted first.
    New-Item -ItemType Directory -Force -Path $ModDir | Out-Null
    Copy-Item -Recurse -Force (Join-Path $Root "mods\$Mod\*") $ModDir
    Say "mod installed: $ModDir"

    if (Test-Path $LayoutFile) { Say "layout kept: $LayoutFile" }
    elseif (Test-Path $Main) {
      $json = [IO.File]::ReadAllText($Main) -replace '"mod"\s*:\s*"files"', '"mod": "file-icons"'
      [IO.File]::WriteAllText($LayoutFile, $json, (New-Object System.Text.UTF8Encoding $false))
      Say "layout created: $LayoutFile"
    }
    else { Say "no layouts\main.json yet; point a layout block's content.mod to `"$Mod`" to use it" }

    if ($App) {
      # Native commands write to stderr when no window is open; that's not an install failure.
      $ErrorActionPreference = "Continue"
      & $App check $ModDir 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) { Say "check passed" } else { Say "check reported a problem: run '$App check $ModDir'" }
      if (Test-Path $LayoutFile) {
        & $App do layout.switch --name $Layout 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Say "switched the open window to the `"$Layout`" layout (ctrl-shift-l cycles layouts)" }
      }
    }
  }
  "uninstall" {
    $shared = Join-Path $AppHome "shared.json"
    $ErrorActionPreference = "Continue"
    if ($App -and (Test-Path $shared) -and ((Get-Content -Raw $shared) -match "`"layout`"\s*:\s*`"$Layout`"")) {
      & $App do layout.switch --name main 2>&1 | Out-Null
    }
    if (Test-Path $LayoutFile) { Remove-Item -Force $LayoutFile }
    if (Test-Path $ModDir) { Remove-Item -Recurse -Force $ModDir }
    Say "removed from $AppHome"
  }
  default { Say "usage: install.ps1 [install|uninstall]"; exit 2 }
}
