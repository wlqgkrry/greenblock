param(
    [string]$BackendModel = $env:OLLAMA_MODEL,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

if (-not $BackendModel) {
    $BackendModel = "llama3.2:3b"
}

function Test-BackendHealth {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method Get -TimeoutSec 2
        return $response.status -eq "ok"
    } catch {
        return $false
    }
}

function Test-PortInUse([int]$Port) {
    try {
        return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

Write-Host "greenblock local dev start"
Write-Host "root: $root"
Write-Host "backend model: $BackendModel"
Write-Host ""

if (-not $SkipInstall) {
    Write-Host "Checking frontend dependencies..."
    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Push-Location $frontendDir
        npm install
        Pop-Location
    }

    $envFile = Join-Path $frontendDir ".env"
    $envExample = Join-Path $frontendDir ".env.example"
    if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
        Copy-Item $envExample $envFile
        Write-Host "Created frontend/.env from .env.example"
    }

    Write-Host "Checking local LLM model..."
    Push-Location $backendDir
    .\scripts\pull-local-llm-model.ps1 -Model $BackendModel
    Pop-Location
}

if (Test-BackendHealth) {
    Write-Host "Backend is already running at http://localhost:8080. Reusing it."
} elseif (Test-PortInUse 8080) {
    Write-Host "Port 8080 is already in use, but greenblock health check failed."
    Write-Host "Stop the process using 8080, then run this script again."
    Write-Host "Tip: netstat -ano | findstr :8080"
    exit 1
} else {
    $backendScript = Join-Path $backendDir "scripts\start-local-llm-dev.ps1"
    Start-Process powershell -WorkingDirectory $backendDir -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $backendScript,
        "-Model",
        $BackendModel
    )
    Start-Sleep -Seconds 3
}

Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "npm run dev"
)

Write-Host ""
Write-Host "Started or reused backend, and opened frontend in a separate PowerShell window."
Write-Host "Backend health: http://localhost:8080/api/health"
Write-Host "Frontend: usually http://localhost:5173"
Write-Host ""
Write-Host "If the LLM button does not work, keep both opened PowerShell windows running and check their logs."
