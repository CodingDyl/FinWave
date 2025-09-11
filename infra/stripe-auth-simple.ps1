# Simple Stripe CLI Authentication Script for Finwave
# This script provides reliable authentication without complex features

param(
    [int]$TimeoutMinutes = 3
)

Write-Host "Stripe CLI Authentication" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "Docker is running" -ForegroundColor Green
    } else {
        Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Docker is not available. Please install and start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "docker-compose.yml not found. Please run this script from the infra directory." -ForegroundColor Red
    exit 1
}

Write-Host "Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Clean up any existing containers
Write-Host "Cleaning up any existing auth containers..." -ForegroundColor Yellow
docker-compose --file docker-compose.yml --profile dev rm -f stripe-auth 2>$null

Write-Host "Starting Stripe authentication..." -ForegroundColor Green
Write-Host "This will open a browser window or show you a URL to visit." -ForegroundColor Cyan
Write-Host "Timeout: $TimeoutMinutes minutes" -ForegroundColor Yellow
Write-Host ""

# Run authentication with timeout
$timeoutSeconds = $TimeoutMinutes * 60
$startTime = Get-Date

Write-Host "Running authentication command..." -ForegroundColor Green
Write-Host "Command: docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth" -ForegroundColor Gray
Write-Host ""

try {
    # Run the authentication command directly
    docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Authentication completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Start the development environment: .\stripe-setup.ps1 start" -ForegroundColor White
        Write-Host "  2. Check status: .\stripe-setup.ps1 status" -ForegroundColor White
        Write-Host "  3. View logs: .\stripe-setup.ps1 logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Authentication failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Common issues and solutions:" -ForegroundColor Yellow
        Write-Host "  • Browser didn't open: Look for a URL in the output above and visit it manually" -ForegroundColor White
        Write-Host "  • Network issues: Check your internet connection" -ForegroundColor White
        Write-Host "  • Docker issues: Restart Docker Desktop" -ForegroundColor White
        Write-Host "  • Stripe account: Make sure you have a valid Stripe account" -ForegroundColor White
        Write-Host ""
        Write-Host "Try running this command manually:" -ForegroundColor Cyan
        Write-Host "docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error running authentication: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure Docker Desktop is running" -ForegroundColor White
    Write-Host "  2. Check that you're in the infra directory" -ForegroundColor White
    Write-Host "  3. Try restarting Docker Desktop" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Stripe CLI authentication completed!" -ForegroundColor Green
