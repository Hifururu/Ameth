param([switch]$Prod)

$envPath = "C:\Ameth\.env"
$port = 8080
try {
  $m = (Select-String -Path $envPath -Pattern '^PORT=(\d+)$' -AllMatches) | ForEach-Object { $_.Matches } | Select-Object -Last 1
  if ($m) { $port = [int]$m.Groups[1].Value }
} catch {}

# Si ya responde /health, no arranca otra instancia
try {
  $resp = Invoke-WebRequest -Uri ("http://localhost:{0}/health" -f $port) -TimeoutSec 2 -UseBasicParsing
  if ($resp.StatusCode -eq 200) {
    Write-Host "AMETH ya está corriendo en http://localhost:$port"
    exit 0
  }
} catch {}

Set-Location C:\Ameth
if ($Prod) { node src/index.js } else { npm run dev }
