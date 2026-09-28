$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$output = Join-Path $workspace 'output'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$archive = Join-Path $output 'ReviewMind-source.zip'

$entries = @(
  '.dockerignore', '.env.example', '.gitignore', 'Dockerfile', 'README.md',
  'BUILD_STATUS.md', 'REQUIREMENTS.md', 'package.json', 'package-lock.json',
  'tsconfig.json', 'vitest.config.ts', 'apps', 'packages', 'fixtures', 'scripts',
  'supabase', 'tests', 'docs'
)

if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
Push-Location $workspace
try {
  & tar.exe -a -c -f $archive @entries
  if ($LASTEXITCODE -ne 0) { throw 'Archive creation failed.' }
} finally {
  Pop-Location
}

$names = & tar.exe -tf $archive
$forbidden = $names | Where-Object { $_ -match '(^|/)(\.env$|node_modules/|private/|\.git/)|\.(log|key|pem)$' }
if ($forbidden) { throw "Archive contains a forbidden path: $($forbidden -join ', ')" }
Write-Output "Created secret-excluding source archive: $archive"
