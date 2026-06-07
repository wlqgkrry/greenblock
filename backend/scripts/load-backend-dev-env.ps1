param(
    [string]$BackendRoot = (Split-Path -Parent $PSScriptRoot)
)

$defaultDbUrl = "jdbc:mysql://localhost:3306/greenblock?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Seoul&characterEncoding=UTF-8&allowPublicKeyRetrieval=true"
$envFile = Join-Path $BackendRoot ".env.local"

function Set-ProcessEnvValue {
    param(
        [string]$Name,
        [string]$Value
    )

    [System.Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

function Read-DotEnvFile {
    param(
        [string]$Path
    )

    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            return
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -lt 1) {
            return
        }

        $key = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        Set-ProcessEnvValue -Name $key -Value $value
    }
}

if (Test-Path $envFile) {
    Read-DotEnvFile -Path $envFile
    Write-Host "Loaded backend env from $envFile"
} else {
    Write-Host "backend/.env.local not found. Using current env vars or interactive MySQL input."
}

if (-not $env:GREENBLOCK_DB_URL) {
    Set-ProcessEnvValue -Name "GREENBLOCK_DB_URL" -Value $defaultDbUrl
}

if (-not $env:GREENBLOCK_DB_USERNAME) {
    $dbUserInput = Read-Host "MySQL username (Enter for root)"
    if ($dbUserInput) {
        Set-ProcessEnvValue -Name "GREENBLOCK_DB_USERNAME" -Value $dbUserInput
    } else {
        Set-ProcessEnvValue -Name "GREENBLOCK_DB_USERNAME" -Value "root"
    }
}

if (-not $env:GREENBLOCK_DB_PASSWORD) {
    $dbPasswordInput = Read-Host "MySQL password (press Enter if none)"
    Set-ProcessEnvValue -Name "GREENBLOCK_DB_PASSWORD" -Value $dbPasswordInput
}

if (-not $env:GREENBLOCK_DDL_AUTO) {
    Set-ProcessEnvValue -Name "GREENBLOCK_DDL_AUTO" -Value "update"
}
