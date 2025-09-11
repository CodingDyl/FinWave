# Improved Stripe CLI Authentication Script for Finwave
# This script provides better error handling and timeout management

param(
    [int]$TimeoutMinutes = 3,
    [switch]$Verbose
)

Write-Host "Stripe CLI Authentication (Improved)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "Docker is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker is not available. Please install and start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ docker-compose.yml not found. Please run this script from the infra directory." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Stripe authentication process..." -ForegroundColor Green
Write-Host "Timeout: $TimeoutMinutes minutes" -ForegroundColor Yellow
Write-Host ""

# Clean up any existing containers
Write-Host "Cleaning up any existing auth containers..." -ForegroundColor Yellow
docker-compose --file docker-compose.yml --profile dev rm -f stripe-auth 2>$null

# Start authentication with improved monitoring
Write-Host "🚀 Starting authentication container..." -ForegroundColor Green
$currentDir = Get-Location

# Create a more robust authentication job
$authJob = Start-Job -ScriptBlock {
    param($workingDir, $verbose)
    
    Set-Location $workingDir
    
    if ($verbose) {
        Write-Host "Starting authentication in directory: $workingDir" -ForegroundColor Cyan
    }
    
    # Run the authentication command
    $result = docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth 2>&1
    
    return @{
        Success = $LASTEXITCODE -eq 0
        Output = $result
        ExitCode = $LASTEXITCODE
    }
} -ArgumentList $currentDir, $Verbose

Write-Host "⏳ Waiting for authentication..." -ForegroundColor Yellow
Write-Host "This will open a browser window for Stripe authentication." -ForegroundColor Cyan
Write-Host "If no browser opens, check the logs below for the authentication URL." -ForegroundColor Yellow
Write-Host ""

# Monitor the job with better feedback
$timeoutSeconds = $TimeoutMinutes * 60
$startTime = Get-Date
$lastOutput = ""

while ($authJob.State -eq "Running") {
    $elapsed = (Get-Date) - $startTime
    $remaining = $timeoutSeconds - $elapsed.TotalSeconds
    
    if ($remaining -le 0) {
        Write-Host ""
        Write-Host "⏰ Authentication timed out after $TimeoutMinutes minutes" -ForegroundColor Red
        Write-Host "This usually means:" -ForegroundColor Yellow
        Write-Host "  • The browser didn't open automatically" -ForegroundColor White
        Write-Host "  • You need to manually visit the authentication URL" -ForegroundColor White
        Write-Host "  • There's a network connectivity issue" -ForegroundColor White
        Write-Host ""
        Write-Host "Troubleshooting steps:" -ForegroundColor Cyan
        Write-Host "  1. Check if a browser window opened" -ForegroundColor White
        Write-Host "  2. Look for an authentication URL in the logs below" -ForegroundColor White
        Write-Host "  3. Try running: docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth" -ForegroundColor White
        Write-Host "  4. Check your internet connection" -ForegroundColor White
        Write-Host ""
        
        Remove-Job -Job $authJob -Force
        exit 1
    }
    
    # Show progress every 10 seconds
    if ($elapsed.TotalSeconds % 10 -lt 1) {
        $minutes = [math]::Floor($elapsed.TotalMinutes)
        $seconds = [math]::Floor($elapsed.TotalSeconds % 60)
        $remainingSeconds = [math]::Floor($remaining)
        Write-Host "⏱️  Elapsed: ${minutes}m ${seconds}s (${remainingSeconds}s remaining)" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 1
}

# Get the result
Write-Host ""
Write-Host "Authentication completed!" -ForegroundColor Green
Write-Host ""

try {
    $result = Receive-Job -Job $authJob
    Remove-Job -Job $authJob
    
    if ($result.Success) {
        Write-Host "✅ Authentication successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now:" -ForegroundColor Cyan
        Write-Host "  • Start the development environment: .\stripe-setup.ps1 start" -ForegroundColor White
        Write-Host "  • Check status: .\stripe-setup.ps1 status" -ForegroundColor White
        Write-Host "  • View logs: .\stripe-setup.ps1 logs" -ForegroundColor White
        Write-Host ""
        
        # Show the output for reference
        if ($result.Output) {
            Write-Host "Authentication output:" -ForegroundColor Yellow
            Write-Host $result.Output -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Authentication failed!" -ForegroundColor Red
        Write-Host "Exit code: $($result.ExitCode)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Yellow
        Write-Host $result.Output -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Cyan
        Write-Host "  1. Make sure you have a Stripe account" -ForegroundColor White
        Write-Host "  2. Check your internet connection" -ForegroundColor White
        Write-Host "  3. Try running the command manually:" -ForegroundColor White
        Write-Host "     docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "❌ Error processing authentication result: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Job -Job $authJob -Force
    exit 1
}

Write-Host ""
Write-Host "🎉 Stripe CLI is ready to use!" -ForegroundColor Green
