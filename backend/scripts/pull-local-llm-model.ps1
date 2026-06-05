param(
    [string]$Model = $env:OLLAMA_MODEL
)

$ErrorActionPreference = "Stop"

if (-not $Model) {
    $Model = "llama3.2:3b"
}

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
$ollamaExe = if ($ollama) { $ollama.Source } else { "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" }

if (-not (Test-Path $ollamaExe)) {
    Write-Host "Ollama is not installed or not on PATH."
    Write-Host "Install Ollama first: https://ollama.com/download"
    Write-Host "After installation, close and reopen PowerShell, then run this script again."
    exit 1
}

& $ollamaExe pull $Model
