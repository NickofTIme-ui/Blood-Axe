# build-release.ps1 - Packages the game for the web (itch.io): release\stage (the files)
# and release\blood-axe-web.zip (forward-slash paths, index.html at the top).
#
# The art is ~170 MB of PNG strips as drawn. Everything a player downloads before the
# title screen is shrunk here: PNGs with no transparency (strips painted on black) are
# re-encoded as high-quality JPEG *under the same file name* (browsers read the real
# format from the data, so no code changes), the game cuts and scales them down at load
# anyway. Left untouched: anything with transparency, the flee/cower strips (their
# flat magenta wound markers must stay exact) and the parallax layers painted on magenta
# (JPEG smears the magenta into their edges and the cut-out leaves a purple fringe).

param([int]$Quality = 93)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stage = Join-Path $root 'release\stage'
$zip = Join-Path $root 'release\blood-axe-web.zip'

# Only clear the generated staging directory inside this project's release folder.
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $root 'release'))
if ([IO.Path]::GetFullPath($stage) -ne (Join-Path $releaseRoot 'stage') -or [IO.Path]::GetFullPath($zip) -ne (Join-Path $releaseRoot 'blood-axe-web.zip')) { throw 'Unexpected release output path' }

if (Test-Path $stage) { [IO.Directory]::Delete($stage, $true) }
[IO.Directory]::CreateDirectory($stage) | Out-Null
Copy-Item (Join-Path $root 'index.html') $stage
# stamp the build time (online play compares it: net/Link.js handshake)
$indexPath = Join-Path $stage 'index.html'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
[IO.File]::WriteAllText($indexPath, ([IO.File]::ReadAllText($indexPath) -replace 'window\.BUILD_TIME = 0;', "window.BUILD_TIME = $stamp;"))
foreach ($d in 'src', 'lib', 'assets') {
  robocopy (Join-Path $root $d) (Join-Path $stage $d) /E /XD incoming /NFL /NDL /NJH /NJS /NP | Out-Null
}
# BootScene reads this palette at runtime when it cuts the character strips.
$paletteDir = Join-Path $stage 'tools\sprite-pipeline'
[IO.Directory]::CreateDirectory($paletteDir) | Out-Null
Copy-Item (Join-Path $root 'tools\sprite-pipeline\palette.png') $paletteDir

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.IO; using System.Runtime.InteropServices;
public static class Shrink {
  // true if the PNG was replaced by a JPEG (same path)
  public static bool Jpeg(string path, long quality) {
    byte[] src = File.ReadAllBytes(path);
    using (var ms = new MemoryStream(src)) using (var bmp = new Bitmap(ms)) {
      var rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
      using (var b32 = bmp.Clone(rect, PixelFormat.Format32bppArgb)) {
        var d = b32.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        var px = new byte[d.Stride * d.Height];
        Marshal.Copy(d.Scan0, px, 0, px.Length);
        b32.UnlockBits(d);
        for (int i = 3; i < px.Length; i += 4) if (px[i] < 250) return false; // has transparency: keep the PNG
        using (var b24 = b32.Clone(rect, PixelFormat.Format24bppRgb)) using (var outMs = new MemoryStream()) {
          ImageCodecInfo codec = null;
          foreach (var c in ImageCodecInfo.GetImageEncoders()) if (c.MimeType == "image/jpeg") codec = c;
          var ep = new EncoderParameters(1);
          ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, quality);
          b24.Save(outMs, codec, ep);
          if (outMs.Length >= src.Length * 0.8) return false; // not worth it
          File.WriteAllBytes(path, outMs.ToArray());
          return true;
        }
      }
    }
  }
}
'@

$before = 0; $after = 0; $n = 0
Get-ChildItem (Join-Path $stage 'assets') -Recurse -Filter *.png | ForEach-Object {
  $before += $_.Length
  $skip = $_.Length -lt 200kb -or $_.Name -match '_(flee|cower)[BFN]\.png$' -or $_.Name -match '^plx_(far|mid|near|fg)\.png$' -or $_.Name -match '^warlord_' -or $_.Name -eq 'earthwall-strip.png' -or $_.Name -eq 'shrine_oath.png' -or $_.Name -eq 'cage.png' -or $_.Name -eq 'lantern.png'
  if (-not $skip) { try { if ([Shrink]::Jpeg($_.FullName, $Quality)) { $n++ } } catch { Write-Host "  kept $($_.Name): $($_.Exception.Message)" } }
  $after += (Get-Item $_.FullName).Length
}
"{0} PNGs re-encoded: {1:N1} MB -> {2:N1} MB" -f $n, ($before / 1MB), ($after / 1MB)

# zip with forward-slash entry names (Compress-Archive writes backslashes; itch needs /)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
if (Test-Path $zip) { [IO.File]::Delete($zip) }
$z = [IO.Compression.ZipFile]::Open($zip, 'Create')
Get-ChildItem $stage -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $rel, 'Optimal') | Out-Null
}
$z.Dispose()
"zip: {0:N1} MB  ({1})" -f ((Get-Item $zip).Length / 1MB), $zip
