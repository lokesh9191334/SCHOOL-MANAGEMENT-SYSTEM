param(
    [string]$Command
)

# Ensure directories
New-Item -ItemType Directory -Force -Path .\logs | Out-Null
New-Item -ItemType Directory -Force -Path .\reports | Out-Null
New-Item -ItemType Directory -Force -Path .\backups | Out-Null

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    $line | Out-File -FilePath .\logs\workflow.log -Append -Encoding UTF8
}

# Setup environment and dependencies
function Setup-Environment {
    Write-Host "Setting up Python virtual environment..." -ForegroundColor Green
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install --upgrade pip
    pip install -r requirements.txt
    Write-Log "Environment setup complete"
}

# Initialize/reset database
function Reset-Database {
    Write-Host "Initializing database..." -ForegroundColor Green
    if (Test-Path .\instance\school.db) {
        Remove-Item .\instance\school.db -Force
        Write-Log "Deleted existing database for reset"
    }
    python db_init.py
    Write-Log "Database initialized"
}

# Run development server
function Start-DevServer {
    Write-Host "Starting development server..." -ForegroundColor Green
    $env:FLASK_ENV = "development"
    Write-Log "Starting dev server"
    python app.py | Tee-Object -FilePath .\logs\server.log
}

# Run development server without rate limiting
function Start-DevServerNoRateLimit {
    Write-Host "Starting development server WITHOUT RATE LIMITING..." -ForegroundColor Green
    $env:FLASK_ENV = "development"
    $env:FLASK_DEBUG = "true"
    $env:DISABLE_RATE_LIMITING = "true"
    Write-Log "Starting dev server with rate limiting disabled"
    python app.py | Tee-Object -FilePath .\logs\server.log
}

# Run tests
function Run-Tests {
    param (
        [switch]$Coverage
    )
    Write-Host "Running tests..." -ForegroundColor Green
    if ($Coverage) {
        pytest --cov=./ --cov-report=html | Tee-Object -FilePath .\reports\test_output.txt
        Write-Host "Coverage report generated in htmlcov/index.html" -ForegroundColor Green
        Write-Log "Tests run with coverage"
    }
    else {
        pytest | Tee-Object -FilePath .\reports\test_output.txt
        Write-Log "Tests run"
    }
}

# Export database to CSV
function Export-Data {
    Write-Host "Exporting data..." -ForegroundColor Green
    $date = Get-Date -Format "yyyy-MM-dd"
    New-Item -ItemType Directory -Force -Path .\exports
    
    # Call the export endpoints using curl
    curl "http://localhost:5000/students/export" -o ".\exports\students_$date.csv"
    curl "http://localhost:5000/fees/export" -o ".\exports\fees_$date.csv"
    curl "http://localhost:5000/attendance/export" -o ".\exports\attendance_$date.csv"
    
    Write-Host "Data exported to exports/ directory" -ForegroundColor Green
    Write-Log "Data exported for $date"
}

# Backup database with integrity verification
function Backup-Database {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $source = ".\instance\school.db"
    if (-not (Test-Path $source)) {
        Write-Host "Database not found at $source" -ForegroundColor Red
        Write-Log "Backup failed: database not found" "ERROR"
        return
    }
    $dest = ".\backups\school_$timestamp.db"
    Copy-Item $source $dest -Force
    $hash = Get-FileHash -Algorithm SHA256 -Path $dest
    $meta = ".\backups\school_$timestamp.hash.txt"
    "$($hash.Algorithm): $($hash.Hash)" | Out-File -FilePath $meta -Encoding UTF8
    Write-Host "Backup created: $dest" -ForegroundColor Green
    Write-Log "Backup created $dest with hash $($hash.Hash)"
}

# Restore latest backup safely with rollback
function Restore-Backup {
    $backups = Get-ChildItem ".\backups" -Filter "school_*.db" | Sort-Object LastWriteTime -Descending
    if ($backups.Count -eq 0) {
        Write-Host "No backups found" -ForegroundColor Yellow
        Write-Log "Restore failed: no backups found" "ERROR"
        return
    }
    $latest = $backups[0].FullName
    $target = ".\instance\school.db"
    $rollback = ".\instance\school_rollback.db"
    if (Test-Path $target) {
        Copy-Item $target $rollback -Force
        Write-Log "Created rollback copy $rollback"
    }
    try {
        Copy-Item $latest $target -Force
        Write-Host "Restored database from $latest" -ForegroundColor Green
        Write-Log "Restored database from $latest"
    } catch {
        Write-Host "Restore failed, rolling back..." -ForegroundColor Red
        if (Test-Path $rollback) {
            Copy-Item $rollback $target -Force
            Write-Log "Rollback completed from $rollback" "WARN"
        }
    }
}

# Health check integrations API
function Health-Check {
    try {
        $resp = curl "http://localhost:5000/api/integrations/health-check"
        $json = $resp.Content | ConvertFrom-Json
        $json | ConvertTo-Json -Depth 5 | Out-File -FilePath .\reports\health_check.json -Encoding UTF8
        Write-Host "Health report saved to reports/health_check.json" -ForegroundColor Green
        Write-Log "Health check executed, status: $($json.overall_status)"
    } catch {
        Write-Host "Health check failed. Ensure server is running." -ForegroundColor Yellow
        Write-Log "Health check failed: $_" "ERROR"
    }
}

# Lint and type-check
function Code-Quality {
    Write-Host "Running code quality checks..." -ForegroundColor Green
    try {
        ruff check . | Tee-Object -FilePath .\reports\ruff.txt
    } catch {
        Write-Host "ruff not found. Skipping." -ForegroundColor Yellow
    }
    try {
        mypy . | Tee-Object -FilePath .\reports\mypy.txt
    } catch {
        Write-Host "mypy not found. Skipping." -ForegroundColor Yellow
    }
    Write-Log "Code quality checks completed"
}

# Vulnerability scanning and dependency updates
function Security-Scan {
    Write-Host "Running security scan..." -ForegroundColor Green
    try {
        pip-audit -f json | Tee-Object -FilePath .\reports\pip_audit.json
    } catch {
        Write-Host "pip-audit not found. Installing..." -ForegroundColor Yellow
        pip install pip-audit
        pip-audit -f json | Tee-Object -FilePath .\reports\pip_audit.json
    }
    pip list --outdated | Tee-Object -FilePath .\reports\outdated.txt
    Write-Log "Security scan and dependency check completed"
}

# Project statistics
function Project-Stats {
    Write-Host "Generating project statistics..." -ForegroundColor Green
    $files = Get-ChildItem -Recurse -Include *.py,*.html,*.css,*.js | Where-Object { $_.FullName -notmatch "\\.venv" }
    $count = $files.Count
    $lines = 0
    foreach ($f in $files) {
        try {
            $lines += (Get-Content $f.FullName -ErrorAction SilentlyContinue).Length
        } catch {}
    }
    $stats = @{
        file_count = $count
        total_lines = $lines
        timestamp = (Get-Date).ToString("s")
    } | ConvertTo-Json
    $stats | Out-File -FilePath .\reports\stats.json -Encoding UTF8
    Write-Host "Stats saved to reports/stats.json" -ForegroundColor Green
    Write-Log "Project stats generated: files=$count lines=$lines"
}

# Main menu
function Show-Menu {
    Write-Host "School Management System - Admin Tools" -ForegroundColor Cyan
    Write-Host "1. Setup Environment"
    Write-Host "2. Reset Database"
    Write-Host "3. Start Development Server"
    Write-Host "4. Start Dev Server (No Rate Limit)"
    Write-Host "5. Run Tests"
    Write-Host "6. Run Tests with Coverage"
    Write-Host "7. Export Data"
    Write-Host "8. Backup Database"
    Write-Host "9. Restore Latest Backup"
    Write-Host "10. Health Check"
    Write-Host "11. Code Quality (ruff + mypy)"
    Write-Host "12. Security Scan (pip-audit + outdated)"
    Write-Host "13. Project Stats"
    Write-Host "Q. Quit"
    
    $choice = Read-Host "Select an option"
    
    switch ($choice) {
        "1" { Setup-Environment }
        "2" { Reset-Database }
        "3" { Start-DevServer }
        "4" { Start-DevServerNoRateLimit }
        "5" { Run-Tests }
        "6" { Run-Tests -Coverage }
        "7" { Export-Data }
        "8" { Backup-Database }
        "9" { Restore-Backup }
        "10" { Health-Check }
        "11" { Code-Quality }
        "12" { Security-Scan }
        "13" { Project-Stats }
        "Q" { return }
        Default { Write-Host "Invalid option" -ForegroundColor Red }
    }
    
    if ($choice -ne "Q") {
        Read-Host "Press Enter to continue"
        Clear-Host
        Show-Menu
    }
}

# CLI support
if ($PSBoundParameters.ContainsKey('Command') -and $Command) {
    switch ($Command) {
        "env" { Setup-Environment }
        "db:reset" { Reset-Database }
        "dev" { Start-DevServer }
        "dev:noratelimit" { Start-DevServerNoRateLimit }
        "test" { Run-Tests }
        "test:coverage" { Run-Tests -Coverage }
        "export" { Export-Data }
        "backup" { Backup-Database }
        "restore" { Restore-Backup }
        "health" { Health-Check }
        "quality" { Code-Quality }
        "security" { Security-Scan }
        "stats" { Project-Stats }
        Default { Write-Host "Unknown command. Use interactive menu." -ForegroundColor Yellow }
    }
} else {
    # Start the menu
    Show-Menu
}
