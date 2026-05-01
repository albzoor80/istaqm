# Deploy hasanbzoor.com to root@194.59.206.63:/var/www/html/hasanbzoor.com (without node_modules)
# You will be prompted for the server password when SCP and SSH run.

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$server = "root@194.59.206.63"
$remotePath = "/var/www/html/istaqim_build"
$tarName = "istaqim_build.tar"

Set-Location $projectRoot

Write-Host "Creating archive (excluding node_modules, .git)..." -ForegroundColor Cyan
if (Test-Path $tarName) { Remove-Item $tarName -Force }
tar --exclude='node_modules' --exclude='.git' --exclude='*.tar' --exclude='scripts' --exclude='deploy-to-server.ps1' -cf $tarName .
if (-not (Test-Path $tarName)) { throw "Failed to create $tarName" }

Write-Host "Uploading to server (enter password when prompted)..." -ForegroundColor Cyan
scp $tarName "${server}:/tmp/"

Write-Host "Extracting on server (enter password when prompted)..." -ForegroundColor Cyan
ssh $server "mkdir -p $remotePath && tar -xf /tmp/$tarName -C $remotePath && rm /tmp/$tarName && cd $remotePath && npm install --production"

Remove-Item $tarName -Force -ErrorAction SilentlyContinue
Write-Host "Done. Site is at ${server}:$remotePath" -ForegroundColor Green
Write-Host "On server, run: sudo systemctl restart istaqim" -ForegroundColor Yellow
