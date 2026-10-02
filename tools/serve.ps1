# serve.ps1 - Tiny local web server for Blood Axe (Windows PowerShell, nothing to install).
# Started by start-game.bat. Close this window to stop the server.

param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# --- 1. Make sure Phaser is downloaded (one time only) ------------------------
$libDir = Join-Path $root 'lib'
$phaser = Join-Path $libDir 'phaser.min.js'
if (-not (Test-Path $phaser)) {
    Write-Host 'First run: downloading the Phaser game engine (one time only)...'
    try {
        if (-not (Test-Path $libDir)) { New-Item -ItemType Directory -Path $libDir | Out-Null }
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js' -OutFile $phaser
        Write-Host 'Phaser downloaded.'
    } catch {
        Write-Host 'Could not download Phaser right now. The game will try to load it online instead.'
        if (Test-Path $phaser) { Remove-Item $phaser }
    }
}

# --- 2. Start the server on the first free port ------------------------------
$listener = $null
$port = 0
foreach ($p in 8123..8140) {
    try {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        $l.Start()
        $listener = $l
        $port = $p
        break
    } catch { }
}
if (-not $listener) {
    Write-Host 'Could not start the local server (ports 8123-8140 are busy).'
    exit 1
}

$url = "http://localhost:$port/"
Write-Host ''
Write-Host '  BLOOD AXE: OATH OF VENGEANCE'
Write-Host "  Game running at $url"
Write-Host '  Your browser should open automatically.'
Write-Host '  Leave this window open while you play. Close it to stop.'
Write-Host ''
if (-not $NoBrowser) { Start-Process $url }

$types = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.webp' = 'image/webp'
    '.wav'  = 'audio/wav'
    '.mp3'  = 'audio/mpeg'
    '.ogg'  = 'audio/ogg'
    '.ttf'  = 'font/ttf'
    '.woff2'= 'font/woff2'
    '.ico'  = 'image/x-icon'
}

# --- 3. Serve files ------------------------------------------------------------
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
        $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
        if ($path -eq '/') { $path = '/index.html' }
        $file = [IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
        if ($file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $file -PathType Leaf)) {
            $bytes = [IO.File]::ReadAllBytes($file)
            $ext = [IO.Path]::GetExtension($file).ToLower()
            $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
            $res.Headers.Add('Cache-Control', 'no-store')   # always load your latest edits
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
    } catch {
        try { $res.StatusCode = 500 } catch { }
    } finally {
        $res.Close()
    }
}
