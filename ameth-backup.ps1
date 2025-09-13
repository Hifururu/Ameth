$root = "C:\Ameth"
$dst  = Join-Path $root "backups"
New-Item -ItemType Directory -Path $dst -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zip   = Join-Path $dst ("ameth-backup-{0}.zip" -f $stamp)

$items = @(
  Join-Path $root "data\expenses.json"
  Join-Path $root ".env"
  Join-Path $root "secrets\google_tokens.json"
  Join-Path $root "src"
  Join-Path $root "logs"
) | Where-Object { Test-Path $_ }

Compress-Archive -Path $items -DestinationPath $zip -Force
Get-ChildItem $dst -Filter "ameth-backup-*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host ("Backup OK -> {0}" -f $zip)
