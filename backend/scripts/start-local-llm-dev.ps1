param(
    [string]$Model = $env:OLLAMA_MODEL,
    [string]$BaseUrl = $env:OLLAMA_BASE_URL
)

$ErrorActionPreference = "Stop"

if (-not $Model) {
    $Model = "llama3.2:3b"
}

if (-not $BaseUrl) {
    $BaseUrl = "http://localhost:11434"
}

$env:GREENBLOCK_LLM_PROVIDER = "ollama"
$env:OLLAMA_MODEL = $Model
$env:OLLAMA_BASE_URL = $BaseUrl

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
$ollamaExe = if ($ollama) { $ollama.Source } else { "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" }

if (-not (Test-Path $ollamaExe)) {
    Write-Host "Ollama is not installed or not on PATH."
    Write-Host "Install Ollama, then run: ollama pull $Model"
    Write-Host "Backend will still start, but LLM calls will fail until Ollama is running."
} else {
    Write-Host "Using local Ollama model: $Model"
    Write-Host "If the model is missing, run: ollama pull $Model"
}

Set-Location $PSScriptRoot\..
.\gradlew.bat bootRun
