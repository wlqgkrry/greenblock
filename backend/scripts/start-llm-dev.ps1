param(
    [string]$ApiKey = $env:OPENAI_API_KEY,
    [string]$Model = $env:OPENAI_MODEL
)

$ErrorActionPreference = "Stop"

if (-not $Model) {
    $Model = "gpt-5.4-nano"
}

if (-not $ApiKey) {
    $ApiKey = Read-Host "Enter OPENAI_API_KEY. Press Enter to run local fallback mode"
}

$env:OPENAI_MODEL = $Model
$env:GREENBLOCK_LLM_PROVIDER = "openai"

if ($ApiKey) {
    $env:OPENAI_API_KEY = $ApiKey
    Write-Host "Starting backend with OpenAI API. model=$Model"
} else {
    Remove-Item Env:\OPENAI_API_KEY -ErrorAction SilentlyContinue
    Write-Host "Starting backend in local fallback mode. model=$Model"
}

Set-Location $PSScriptRoot\..
.\gradlew.bat bootRun
