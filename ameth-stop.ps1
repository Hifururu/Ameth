$envPath="C:\Ameth\.env"
$port=8080
try {
  $m=(Select-String -Path $envPath -Pattern '^PORT=(\d+)$' -AllMatches) | ForEach-Object { $_.Matches } | Select-Object -Last 1
  if($m){ $port=[int]$m.Groups[1].Value }
} catch {}

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$cons = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($cons) {
  $pids = $cons | Select-Object -ExpandProperty OwningProcess -Unique
  foreach($pid in $pids){ taskkill /PID $pid /F | Out-Null }
}

Write-Host "Node detenido (si estaba corriendo)."
