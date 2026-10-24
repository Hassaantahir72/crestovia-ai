# Crestovia AI local validation for Windows PowerShell.
# Run from the repository root: .\scripts\validate-local.ps1
# This does not use GitHub Actions, deploy anything, or modify production services.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot "apps\web"
$apiDir = Join-Path $repoRoot "apps\api"

function Invoke-Check {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )
    Write-Host ""
    Write-Host "===== $Name =====" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
    Write-Host "PASS: $Name" -ForegroundColor Green
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required. Install a supported Node.js 22 release, then reopen PowerShell." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is not available. Reinstall Node.js with npm, then reopen PowerShell." }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "Python is required. Install Python 3.11 or newer, then reopen PowerShell." }

Write-Host "Repository: $repoRoot"
node --version
npm --version
python --version

if (-not (Test-Path (Join-Path $webDir "package.json"))) { throw "Cannot find apps/web/package.json. Run this script from a complete Crestovia AI checkout." }
if (-not (Test-Path (Join-Path $apiDir "requirements.txt"))) { throw "Cannot find apps/api/requirements.txt." }

# Use deterministic local-only placeholders for public build-time config if the user
# has not already supplied values in this PowerShell session. These are not secrets.
if (-not $env:NEXT_PUBLIC_SUPABASE_URL) { $env:NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co" }
if (-not $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) { $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ci_placeholder" }

Push-Location $webDir
try {
    if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
        Invoke-Check "Install frontend dependencies (npm)" { npm install --no-audit --no-fund }
    } else {
        Write-Host "Frontend node_modules already exists; skipping dependency installation."
    }

    Invoke-Check "Preflight tests" { node --test ../../scripts/preflight.test.mjs }
    Invoke-Check "Deployment smoke-check tests" { node --test ../../scripts/health-smoke.test.mjs }
    Invoke-Check "Database backup helper tests" { node --test ../../scripts/verify-db-backup.test.mjs }
    Invoke-Check "Tenant-isolation acceptance runner tests" { node --test ../../scripts/tenant-isolation-acceptance.test.mjs }
    Invoke-Check "Provider connectivity helper tests" { node --test ../../scripts/provider-connectivity-check.test.mjs }
    Invoke-Check "Groq smoke helper tests (mocked)" { node --test ../../scripts/groq-live-smoke.test.mjs }
    Invoke-Check "AI provider guardrail tests" { node --test ../../scripts/ai-provider-guardrails.test.mjs }
    Invoke-Check "Readiness report tests" { node --test ../../scripts/readiness-report.test.mjs }
    Invoke-Check "Readiness checklist structure" { npm run readiness:validate }
    Invoke-Check "ESLint" { npm run lint }
    Invoke-Check "TypeScript" { npx tsc --noEmit }
    Invoke-Check "Next.js production build" { npm run build }
}
finally {
    Pop-Location
}

$venvPython = Join-Path $apiDir ".venv\Scripts\python.exe"
$venvPip = Join-Path $apiDir ".venv\Scripts\pip.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host ""
    Write-Host "Creating apps/api/.venv (local project folder only)..."
    Push-Location $apiDir
    try {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw "Python virtual environment creation failed." }
    }
    finally { Pop-Location }
}
if (-not (Test-Path $venvPython)) { throw "Virtual environment Python was not created at $venvPython." }

# Install API requirements only when imports/test dependencies are not available.
& $venvPython -c "import fastapi, pytest, jwt, httpx, pydantic_settings" 2>$null
if ($LASTEXITCODE -ne 0) {
    Invoke-Check "Install API dependencies into apps/api/.venv" { & $venvPip install -r (Join-Path $apiDir "requirements.txt") }
}

Push-Location $repoRoot
try {
    Invoke-Check "API tests" { & $venvPython -m pytest apps/api/tests -q }
    Invoke-Check "Python compile check" { & $venvPython -m compileall -q apps/api/app }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "LOCAL VALIDATION COMPLETED SUCCESSFULLY." -ForegroundColor Green
Write-Host "This validates local code only; it does not verify production secrets, live tenant isolation, backups, or deployment."
