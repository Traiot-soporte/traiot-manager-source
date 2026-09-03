$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'logo.jpeg'
$publicDirectory = Join-Path $projectRoot 'public'
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

function Write-PwaIcon {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Size,
    [Parameter(Mandatory = $true)]
    [string]$FileName
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(25, 25, 25))
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($sourceImage, 0, 0, $Size, $Size)
    $targetPath = Join-Path $publicDirectory $FileName
    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

try {
  Write-PwaIcon -Size 180 -FileName 'apple-touch-icon.png'
  Write-PwaIcon -Size 192 -FileName 'pwa-192x192.png'
  Write-PwaIcon -Size 512 -FileName 'pwa-512x512.png'
  Write-PwaIcon -Size 512 -FileName 'pwa-maskable-512x512.png'
}
finally {
  $sourceImage.Dispose()
}
