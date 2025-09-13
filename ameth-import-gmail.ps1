param(
  [string]$Key = "mi-super-clave",
  [string]$Q = "in:inbox newer_than:1d from:bancochile.cl (transferencia OR ""cargo en cuenta"" OR abono)",
  [int]$Max = 50,
  [int]$Port = 8080
)

$body = @{ q = $Q; max = $Max } | ConvertTo-Json -Compress
$uri = "http://localhost:{0}/finance/import-from-gmail" -f $Port
try {
  $res = Invoke-RestMethod -Uri $uri -Method POST -Headers @{ "x-api-key" = $Key; "Content-Type"="application/json" } -Body $body -TimeoutSec 120
  Write-Host ("[{0}] imported={1} skipped={2}" -f (Get-Date), $res.imported, $res.skipped)
} catch {
  Write-Host ("[{0}] ERROR: {1}" -f (Get-Date), $_.Exception.Message)
  exit 1
}
