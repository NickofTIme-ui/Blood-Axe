param([string]$BuildRoot = 'C:\Users\nickr\Documents\Codex\Blood Axe Builds', [string]$ExistingBuild = '')
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$buildId = 'build-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss')
$archive = Join-Path $BuildRoot $buildId
$game = Join-Path $archive 'game'
if ($ExistingBuild) {
  $archive = (Resolve-Path -LiteralPath $ExistingBuild).Path
  if ([IO.Path]::GetDirectoryName($archive) -ne [IO.Path]::GetFullPath($BuildRoot)) { throw 'Existing build must be inside the build folder.' }
  $game = Join-Path $archive 'game'
  $info = Get-Content -LiteralPath (Join-Path $game 'build-info.json') -Raw
} else {
if (Test-Path -LiteralPath $archive) { throw 'Build already exists; wait a second and retry.' }
New-Item -ItemType Directory -Path $game -Force | Out-Null
foreach ($dir in 'src','assets','lib') {
  robocopy (Join-Path $sourceRoot $dir) (Join-Path $game $dir) /E /XD incoming /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copy failed: $dir" }
}
$html = [IO.File]::ReadAllText((Join-Path $sourceRoot 'index.html'))
if (-not $html.Contains('window.BUILD_TIME = 0;')) { throw 'Missing build marker.' }
[IO.File]::WriteAllText((Join-Path $game 'index.html'),$html.Replace('window.BUILD_TIME = 0;',"window.BUILD_TIME = $stamp;"))
New-Item -ItemType Directory -Path (Join-Path $game 'tools\sprite-pipeline') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'sprite-pipeline\palette.png') -Destination (Join-Path $game 'tools\sprite-pipeline\palette.png')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'serve.ps1') -Destination (Join-Path $game 'tools\serve.ps1')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'start-game.bat') -Destination $game
$info = @{ id=$buildId; buildTime=$stamp; game=$game; created=(Get-Date -Format 'o') } | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $game 'build-info.json'),$info)
}
Write-Output 'Game copied with original artwork and audio intact. Packaging ZIP...'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = Join-Path $archive 'Blood Axe.zip'
if (Test-Path -LiteralPath $zip) { [IO.File]::Delete($zip) }
$package = [IO.Compression.ZipFile]::Open($zip,'Create')
try {
  Get-ChildItem -LiteralPath $game -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($game.Length+1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($package,$_.FullName,$relative,[IO.Compression.CompressionLevel]::Fastest) | Out-Null
  }
} finally { $package.Dispose() }
# Validate the package before publishing the stable latest pointers.
$check = [IO.Compression.ZipFile]::OpenRead($zip)
try {
  foreach ($entry in 'index.html','src/view/PauseMenu.js','src/effects/SplitSeam.js','assets/fx/blood-ink-sheet.png','lib/phaser.min.js','tools/serve.ps1','build-info.json') {
    if (-not $check.GetEntry($entry)) { throw "Missing build entry: $entry" }
  }
} finally { $check.Dispose() }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'play-latest.ps1') -Destination (Join-Path $BuildRoot 'Play Latest.ps1')
[IO.File]::WriteAllText((Join-Path $BuildRoot 'Play Blood Axe.cmd'),'@echo off' + "`r`n" + 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Play Latest.ps1"' + "`r`n" + 'if errorlevel 1 pause' + "`r`n")
Copy-Item -LiteralPath $zip -Destination (Join-Path $BuildRoot 'Blood Axe - Latest.zip') -Force
[IO.File]::WriteAllText((Join-Path $BuildRoot 'latest.json'),$info)
[IO.File]::WriteAllText((Join-Path $BuildRoot 'READ ME.txt'),"BLOOD AXE`r`n`r`nDouble-click Play Blood Axe.cmd to play the latest build in your default browser.`r`nShare Blood Axe - Latest.zip. Unzip it first, then double-click start-game.bat.`r`nOlder dated builds are kept here as backups.`r`nThe original game folder is untouched.`r`n")
Write-Output "BUILD_READY $game"
Write-Output "LATEST_ZIP $(Join-Path $BuildRoot 'Blood Axe - Latest.zip')"
Write-Output ('ZIP_MB {0:N1}' -f ((Get-Item -LiteralPath $zip).Length / 1MB))
