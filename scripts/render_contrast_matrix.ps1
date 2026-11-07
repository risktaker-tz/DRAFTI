param(
  [string]$BrowseExe = 'C:\Users\Risk Taker\.codex\skills\gstack\browse\dist\browse.exe',
  [string]$ServerScript = 'C:/Users/Risk Taker/.codex/skills/gstack/browse/dist/server-node.mjs',
  [string]$OutputDirectory = 'docs/contrast-raster-samples-20261107',
  [switch]$Refresh
)
$ErrorActionPreference = 'Stop'
$env:BROWSE_SERVER_SCRIPT = $ServerScript
$themes = @('arcade','baize','club','cyberjade','glass','greenbuff','hologlass','ice','maplewood','marble','mono','neon','royale','sakura','solar','space','synth','tourney','travel','vapor','walnut')
$materials = @('theme','tourney','woodturn','ivoryjet','bakelite','steel','glass','stone')
$root = (Resolve-Path '.').Path
$out = Join-Path $root $OutputDirectory
if (-not (Test-Path -LiteralPath $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$total = $themes.Count * $materials.Count * 2
$done = if ($Refresh) { 0 } else { (Get-ChildItem -LiteralPath $out -File -Filter '*.png' | Measure-Object).Count }
if ($done -gt $total) { throw "Output folder has $done PNGs; expected at most ${total}: $out" }
$appUrl = 'http://127.0.0.1:8080/?contrast-audit'
function Invoke-BrowseJs([string]$Expression) {
  $output = & $BrowseExe js $Expression 2>&1
  if ($LASTEXITCODE -ne 0) {
    # The isolated Chromium daemon can restart between commands. Reopen the
    # same local artifact, then retry this idempotent theme/material selection.
    & $BrowseExe goto $appUrl | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not reopen the isolated local preview' }
    $output = & $BrowseExe js $Expression 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($output | Out-String) }
  }
  return $output
}
foreach ($theme in $themes) {
  foreach ($material in $materials) {
    foreach ($hv in @($false, $true)) {
      $mode = if ($hv) { 'hv' } else { 'normal' }
      $file = Join-Path $out "$theme-$material-$mode.png"
      if ((Test-Path -LiteralPath $file) -and -not $Refresh) { continue }
      $themeValue = ConvertTo-Json -InputObject $theme -Compress
      $materialValue = ConvertTo-Json -InputObject $material -Compress
      $js = '(()=>{const a=window.__drafti;if(!a?.menu)throw Error("DRAFTI preview is not ready");a.menu.open();const t=document.querySelector(".theme-sw[data-v="+' + $themeValue + '+"]");const m=document.querySelector("#segPieces [data-v="+' + $materialValue + '+"]");if(!t||!m)throw Error("Missing picker for ' + $theme + '/' + $material + '");t.click();m.click();if(a.settings.hv!==' + $hv.ToString().ToLower() + ')document.querySelector("#btnHV").click();a.menu.close();return "ready"})()'
      Invoke-BrowseJs $js | Out-Null
      & $BrowseExe hover '.brand' | Out-Null
      if ($LASTEXITCODE -ne 0) {
        & $BrowseExe goto $appUrl | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not recover the preview before capture' }
        Invoke-BrowseJs $js | Out-Null
        & $BrowseExe hover '.brand' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not move the pointer off the board' }
      }
      & $BrowseExe screenshot --selector '#board' $file | Out-Null
      if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $file)) { throw "Could not capture $theme/$material/$mode" }
      $done++
      if ($done % 16 -eq 0 -or $done -eq $total) { Write-Output "Captured $done/$total rendered boards" }
    }
  }
}
Write-Output "Complete: $total PNG board captures in $OutputDirectory"
