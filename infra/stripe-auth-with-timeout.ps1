# Stripe CLI Authentication with Timeout (PowerShell)
# This script handles Stripe authentication with proper timeout and logging

param(
    [int]$TimeoutSeconds = 300  # 5 minutes default timeout
)

Write-Host "Starting Stripe CLI authentication with timeout handling..." -ForegroundColor Green
Write-Host ""

# Function to cleanup on exit
function Cleanup {
    Write-Host ""
    Write-Host "Cleaning up authentication process..." -ForegroundColor Yellow
    docker-compose --profile dev stop stripe-auth 2>$null
    docker-compose --profile dev rm -f stripe-auth 2>$null
}

# Set cleanup on script exit
trap { Cleanup } EXIT

Write-Host "Authentication timeout set to $TimeoutSeconds seconds (5 minutes)" -ForegroundColor Yellow
Write-Host ""

# Start authentication container
Write-Host "Starting Stripe authentication container..." -ForegroundColor Green
$authJob = Start-Job -ScriptBlock {
    docker-compose --profile dev run --rm stripe-auth
}

Write-Host "Waiting for authentication to complete..." -ForegroundColor Yellow
Write-Host "   - Check your browser for the authentication page" -ForegroundColor Cyan
Write-Host "   - Enter the pairing code when prompted" -ForegroundColor Cyan
Write-Host "   - This will timeout after $TimeoutSeconds seconds" -ForegroundColor Cyan
Write-Host ""

# Monitor the authentication process with timeout
try {
    $result = Wait-Job -Job $authJob -Timeout $TimeoutSeconds
    
    if ($result) {
        $output = Receive-Job -Job $authJob
        Remove-Job -Job $authJob
        
        Write-Host ""
        Write-Host "Stripe authentication completed successfully!" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Starting Stripe CLI webhook listener..." -ForegroundColor Green
        docker-compose --profile dev up -d stripe-cli
        
        Write-Host "Monitoring Stripe CLI logs (press Ctrl+C to stop):" -ForegroundColor Yellow
        docker-compose logs -f stripe-cli
    } else {
        Write-Host ""
        Write-Host "Authentication failed or timed out after $TimeoutSeconds seconds" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
        Write-Host "   1. Check your internet connection" -ForegroundColor White
        Write-Host "   2. Make sure you can access https://dashboard.stripe.com" -ForegroundColor White
        Write-Host "   3. Try running: docker-compose --profile dev run --rm stripe-auth" -ForegroundColor White
        Write-Host "   4. Check if you have a valid Stripe account" -ForegroundColor White
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error during authentication: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
} finally {
    Cleanup
}
