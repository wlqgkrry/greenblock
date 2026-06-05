param(
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function U([string]$Hex) {
    -join ($Hex -split " " | ForEach-Object { [char][Convert]::ToInt32($_, 16) })
}

$parsedMansaeSummary = @(
    (U "005B AC10 C9C0 B41C 0020 C0AC C8FC 0020 D6C4 BCF4 005D")
    "$(U "B144 C8FC"): $(U "C784 C2E0")"
    "$(U "C6D4 C8FC"): $(U "C744 C0AC")"
    "$(U "C77C C8FC"): $(U "ACC4 C0AC")"
    "$(U "C2DC C8FC"): $(U "C744 BB18")"
    ""
    (U "005B AC10 C9C0 B41C 0020 B300 C6B4 0020 D6C4 BCF4 005D")
    (U "AC11 C9C4 002C 0020 ACC4 BB18 002C 0020 C784 C778 002C 0020 C2E0 CD95 002C 0020 ACBD C790")
) -join "`n"

$mansaeRawText = @(
    (U "C0AC C6A9 C790 AC00 0020 C9C1 C811 0020 C870 D68C D55C 0020 B9CC C138 B825 0020 ACB0 ACFC 0020 C608 C2DC C785 B2C8 B2E4 002E")
    "$(U "B144 C8FC") $(U "C784 C2E0")"
    "$(U "C6D4 C8FC") $(U "C744 C0AC")"
    "$(U "C77C C8FC") $(U "ACC4 C0AC")"
    "$(U "C2DC C8FC") $(U "C744 BB18")"
    "$(U "B300 C6B4") $(U "AC11 C9C4") $(U "ACC4 BB18") $(U "C784 C778") $(U "C2E0 CD95") $(U "ACBD C790")"
) -join "`n"

$body = @{
    teammateName        = U "AE40 C608 B098"
    role                = U "D504 B85C B355 D2B8 0020 B9E4 B2C8 C800"
    gender              = "female"
    birthDate           = "1992-05-17"
    birthTime           = "07:15"
    birthPlace          = U "C11C C6B8"
    calendarType        = "solar"
    parsedMansaeSummary = $parsedMansaeSummary
    mansaeRawText       = $mansaeRawText
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/llm/mansae-analysis" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($body))

Write-Host "provider: $($response.provider)"
Write-Host "model: $($response.model)"
Write-Host "usedFallback: $($response.usedFallback)"
Write-Host ""
Write-Host $response.analysisText
