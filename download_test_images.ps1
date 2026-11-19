# LifeLink evaluation image downloader
# Extract the ZIP into C:\LL\LifeLink, then run from that directory.
# It downloads only explicitly curated Commons image pages, not random search results.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$manifest = Import-Csv (Join-Path $root 'image_sources.csv') -Encoding UTF8
$baseApi = 'https://commons.wikimedia.org/w/api.php'
$headers = @{'User-Agent'='LifeLinkMealScanEvaluation/1.0 (educational image review script)'}
$log = New-Object System.Collections.Generic.List[object]
$logPath = Join-Path $root 'download_log.csv'
if (Test-Path $logPath) {
  foreach ($previous in (Import-Csv $logPath -Encoding UTF8)) { $log.Add($previous) }
}

function Escape-Field([string] $value) {
  return [System.Uri]::EscapeDataString($value)
}

foreach ($r in $manifest) {
  $target = Join-Path $root ($r.relative_path.Replace('/', '\'))
  $parent = Split-Path $target -Parent
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  if (Test-Path $target) {
    Write-Host ('既存のためスキップ: ' + $r.relative_path)
    continue
  }
  if ($r.source_type -ne 'commons') { continue }

  $title = 'File:' + $r.commons_filename
  $params = [ordered]@{
    action = 'query'; format = 'json'; formatversion = '2';
    prop = 'imageinfo'; iiprop = 'url|extmetadata|mime|size';
    iiurlwidth = '900'; titles = $title
  }
  $parts = @()
  foreach ($k in $params.Keys) {
    $parts += (Escape-Field $k) + '=' + (Escape-Field ([string] $params[$k]))
  }
  $apiUrl = $baseApi + '?' + ($parts -join '&')
  $success = $false
  for ($attempt=1; $attempt -le 3 -and -not $success; $attempt++) {
    try {
      $resp = Invoke-RestMethod -Uri $apiUrl -Headers $headers -TimeoutSec 50
      $page = @($resp.query.pages)[0]
      if ($null -ne $page.missing -or -not $page.imageinfo) {
        throw 'Wikimedia Commonsで画像が見つかりません: ' + $title
      }
      $info = @($page.imageinfo)[0]
      $uri = if ($info.thumburl) { $info.thumburl } else { $info.url }
      if (-not $uri) { throw 'ダウンロード用URLが取得できません' }
      Invoke-WebRequest -Uri $uri -OutFile $target -Headers $headers -TimeoutSec 90
      if ((Get-Item $target).Length -lt 2048) { throw '画像ファイルが小さすぎます' }
      $lic = if ($info.extmetadata.LicenseShortName) { $info.extmetadata.LicenseShortName.value } else { '' }
      $artist = if ($info.extmetadata.Artist) { $info.extmetadata.Artist.value -replace '<[^>]*>','' } else { '' }
      $licUrl = if ($info.extmetadata.LicenseUrl) { $info.extmetadata.LicenseUrl.value } else { '' }
      $log.Add([pscustomobject]@{
        file = $r.relative_path; source = $r.source_url;
        license = $lic; license_url = $licUrl; author = $artist
      })
      Write-Host ('完了: ' + $r.relative_path)
      $success = $true
      Start-Sleep -Milliseconds 500
    } catch {
      Remove-Item -Path $target -ErrorAction SilentlyContinue
      Write-Warning ("失敗 $attempt/3 : $($r.relative_path) : $($_.Exception.Message)")
      if ($attempt -lt 3) { Start-Sleep -Seconds (2 * $attempt) }
    }
  }
}
$logPath = Join-Path $root 'download_log.csv'
$log | Export-Csv -Path $logPath -NoTypeInformation -Encoding UTF8
$realCount = @((Get-ChildItem -Path (Join-Path $root 'test_images') -Recurse -Filter 'real_*.jpg' -File)).Count
$sampleCount = @((Get-ChildItem -Path (Join-Path $root 'test_images') -Recurse -Filter 'sample_*.jpg' -File)).Count
Write-Host ''
Write-Host "本物候補: $realCount/30枚　食品サンプル: $sampleCount/30枚"
Write-Host "出典・ライセンス： $logPath"
if ($realCount -eq 30 -and $sampleCount -eq 30) {
  Write-Host '60枚が揃いました。review_images.htmlで目視確認してください。'
} else {
  Write-Warning '60枚に達していません。ネット接続とエラーを確認して、もう一度実行してください。既存画像はスキップされます。'
}
