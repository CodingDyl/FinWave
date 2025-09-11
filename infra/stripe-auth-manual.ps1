# Manual Stripe CLI Authentication Script
# Use this if the automated authentication fails

Write-Host "🔧 Manual Stripe CLI Authentication" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you authenticate with Stripe manually." -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker is not running" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker is not available" -ForegroundColor Red
    exit 1
}

# Check docker-compose.yml
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ docker-compose.yml not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Step 1: Clean up
Write-Host "Step 1: Cleaning up any existing containers..." -ForegroundColor Yellow
docker-compose --file docker-compose.yml --profile dev rm -f stripe-auth 2>$null
Write-Host "✅ Cleanup completed" -ForegroundColor Green
Write-Host ""

# Step 2: Start authentication
Write-Host "Step 2: Starting Stripe authentication..." -ForegroundColor Yellow
Write-Host "This will open a browser window or show you a URL to visit." -ForegroundColor Cyan
Write-Host ""

Write-Host "Running authentication command..." -ForegroundColor Green
Write-Host "Command: docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth" -ForegroundColor Gray
Write-Host ""

# Run the authentication command directly
try {
    docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Authentication completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Start the development environment: .\stripe-setup.ps1 start" -ForegroundColor White
        Write-Host "  2. Check status: .\stripe-setup.ps1 status" -ForegroundColor White
        Write-Host "  3. View logs: .\stripe-setup.ps1 logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Authentication failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Common issues and solutions:" -ForegroundColor Yellow
        Write-Host "  • Browser didn't open: Look for a URL in the output above and visit it manually" -ForegroundColor White
        Write-Host "  • Network issues: Check your internet connection" -ForegroundColor White
        Write-Host "  • Docker issues: Restart Docker Desktop" -ForegroundColor White
        Write-Host "  • Stripe account: Make sure you have a valid Stripe account" -ForegroundColor White
        Write-Host ""
        Write-Host "Try running this command manually:" -ForegroundColor Cyan
        Write-Host "docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth" -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running authentication: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure Docker Desktop is running" -ForegroundColor White
    Write-Host "  2. Check that you're in the infra directory" -ForegroundColor White
    Write-Host "  3. Try restarting Docker Desktop" -ForegroundColor White
}

Write-Host ""
Write-Host "🔧 Manual authentication process completed" -ForegroundColor Cyan
