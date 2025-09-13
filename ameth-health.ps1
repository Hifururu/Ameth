Write-Host "PWD: $(Get-Location)"
Invoke-WebRequest -Uri http://localhost:8080/health | Select-Object -ExpandProperty Content
