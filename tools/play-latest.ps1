$ErrorActionPreference = 'Stop'
$info = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'latest.json') -Raw | ConvertFrom-Json
function Find-Game {
  foreach ($port in 8123..8140) {
    try {
      $reply = Invoke-WebRequest -UseBasicParsing "http://localhost:$port/build-info.json" -TimeoutSec 1
      if (($reply.Content | ConvertFrom-Json).id -eq $info.id) { return "http://localhost:$port/" }
    } catch { }
  }
  return $null
}
$url = Find-Game
if (-not $url) {
  $server = Join-Path $info.game 'tools\serve.ps1'
  Start-Process powershell.exe -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "' + $server + '" -NoBrowser') -WindowStyle Hidden
  $until = [DateTime]::UtcNow.AddSeconds(45)
  do { $url = Find-Game; if (-not $url) { Start-Sleep -Milliseconds 200 } } while (-not $url -and [DateTime]::UtcNow -lt $until)
}
if (-not $url) { throw 'The game server could not start. Close any old game servers and try again.' }
Start-Process ($url + '?build=' + $info.buildTime)
Write-Output "Opened $($info.id) in your default browser."
