$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$node = Get-Command node -ErrorAction SilentlyContinue
$bundledNodePath = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if ($node) {
  & $node.Source .\scripts\server.js
  exit $LASTEXITCODE
}

if (Test-Path $bundledNodePath) {
  & $bundledNodePath .\scripts\server.js
  exit $LASTEXITCODE
}

Write-Host "Node.js was not found. Please install Node.js or run this inside Codex Desktop."
exit 1
