# Stripe CLI Setup Script for Finwave (PowerShell)
# This script helps you set up and manage Stripe CLI for webhook forwarding

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

switch ($Command) {
    "setup" {
        Write-Host "Setting up Stripe CLI..." -ForegroundColor Green
        Write-Host ""
        Write-Host "1. Add your Stripe secret key to your .env file:" -ForegroundColor Yellow
        Write-Host "   STRIPE_SECRET_KEY=sk_test_..." -ForegroundColor Blue
        Write-Host ""
        Write-Host "2. Authenticate with Stripe (run once):" -ForegroundColor Yellow
        Write-Host "   .\stripe-setup.ps1 auth" -ForegroundColor Blue
        Write-Host ""
        Write-Host "3. Start the development environment with Stripe CLI:" -ForegroundColor Yellow
        Write-Host "   .\stripe-setup.ps1 start" -ForegroundColor Blue
        Write-Host ""
        Write-Host "4. The Stripe CLI will forward webhooks to:" -ForegroundColor Yellow
        Write-Host "   http://localhost:8000/api/v1/webhooks/stripe" -ForegroundColor Blue
        Write-Host ""
        Write-Host "5. You can view webhook events in the Stripe CLI logs" -ForegroundColor Yellow
    }
    
    "auth" {
        Write-Host "Authenticating with Stripe..." -ForegroundColor Green
        Write-Host "This will open a browser window for authentication." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Starting improved authentication process..." -ForegroundColor Cyan
        Write-Host "If this gets stuck, run: .\stripe-auth-manual.ps1" -ForegroundColor Yellow
        Write-Host ""
        
        # Use the simple authentication script
        if (Test-Path "stripe-auth-simple.ps1") {
            & ".\stripe-auth-simple.ps1" -TimeoutMinutes 3
        } else {
            Write-Host "Using fallback authentication method..." -ForegroundColor Yellow
            Write-Host "If this fails, run: .\stripe-auth-manual.ps1" -ForegroundColor Cyan
            Write-Host ""
            
            # Fallback to original method with shorter timeout
            $currentDir = Get-Location
            $authJob = Start-Job -ScriptBlock {
                Set-Location $using:currentDir
                docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth
            }
            
            Write-Host "Waiting for authentication (timeout: 3 minutes)..." -ForegroundColor Yellow
            Write-Host "Check your browser for the Stripe authentication page" -ForegroundColor Cyan
            Write-Host ""
            
            try {
                $result = Wait-Job -Job $authJob -Timeout 180  # 3 minutes
                if ($result) {
                    $output = Receive-Job -Job $authJob
                    Remove-Job -Job $authJob
                    Write-Host "Authentication completed!" -ForegroundColor Green
                } else {
                    Write-Host "Authentication timed out after 3 minutes" -ForegroundColor Red
                    Write-Host "Run: .\stripe-auth-manual.ps1 for manual authentication" -ForegroundColor Yellow
                    Remove-Job -Job $authJob -Force
                }
            } catch {
                Write-Host "Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "Run: .\stripe-auth-manual.ps1 for manual authentication" -ForegroundColor Yellow
                Remove-Job -Job $authJob -Force
            }
        }
    }
    
    "auth-manual" {
        Write-Host "Running manual Stripe authentication..." -ForegroundColor Green
        if (Test-Path "stripe-auth-manual.ps1") {
            & ".\stripe-auth-manual.ps1"
        } else {
            Write-Host "Manual authentication script not found. Running fallback..." -ForegroundColor Yellow
            Write-Host "This will run the authentication command directly." -ForegroundColor Cyan
            Write-Host ""
            
            # Direct authentication command
            docker-compose --file docker-compose.yml --profile dev run --rm stripe-auth
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Authentication completed!" -ForegroundColor Green
            } else {
                Write-Host "❌ Authentication failed!" -ForegroundColor Red
            }
        }
    }
    
    "start" {
        Write-Host "Starting development environment with Stripe CLI..." -ForegroundColor Green
        docker-compose --file docker-compose.yml --profile dev up
    }
    
    "start-detached" {
        Write-Host "Starting development environment with Stripe CLI (detached)..." -ForegroundColor Green
        docker-compose --file docker-compose.yml --profile dev up -d
        Write-Host "Services started in background" -ForegroundColor Green
        Write-Host "View logs with: docker-compose logs -f stripe-cli" -ForegroundColor Blue
    }
    
    "stop" {
        Write-Host "Stopping development environment..." -ForegroundColor Red
        docker-compose --file docker-compose.yml down
    }
    
    "logs" {
        Write-Host "Viewing Stripe CLI logs..." -ForegroundColor Green
        docker-compose --file docker-compose.yml logs -f stripe-cli
    }
    
    "test-webhook" {
        Write-Host "Testing webhook endpoint..." -ForegroundColor Green
        Write-Host "Sending test webhook to localhost:8000/api/v1/webhooks/stripe" -ForegroundColor Yellow
        $body = @{
            type = "test"
            data = @{
                object = @{
                    id = "test"
                }
            }
        } | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri "http://localhost:8000/api/v1/webhooks/stripe" -Method POST -Headers @{
            "Content-Type" = "application/json"
            "Stripe-Signature" = "test"
        } -Body $body
    }
    
    "status" {
        Write-Host "Checking Stripe CLI status..." -ForegroundColor Green
        Write-Host ""
        
        # Check if Stripe CLI container is running
        $stripeStatus = docker-compose --file docker-compose.yml ps stripe-cli 2>$null
        if ($stripeStatus -match "Up") {
            Write-Host "Stripe CLI: Running" -ForegroundColor Green
        } else {
            Write-Host "Stripe CLI: Not running" -ForegroundColor Red
        }
        
        # Check authentication status
        Write-Host ""
        Write-Host "Checking authentication status..." -ForegroundColor Yellow
        try {
            $authCheck = docker-compose --file docker-compose.yml exec stripe-cli stripe config --list 2>$null
            if ($authCheck -match "test_mode") {
                Write-Host "Authentication: Connected" -ForegroundColor Green
            } else {
                Write-Host "Authentication: Not connected" -ForegroundColor Red
            }
        } catch {
            Write-Host "Authentication: Cannot check (container not running)" -ForegroundColor Yellow
        }
        
        # Show recent logs
        Write-Host ""
        Write-Host "Recent Stripe CLI logs:" -ForegroundColor Yellow
        docker-compose --file docker-compose.yml logs stripe-cli --tail=10
    }
    
    default {
        Write-Host "Stripe CLI Management for Finwave" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage: .\stripe-setup.ps1 [command]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Green
        Write-Host "  setup           - Show setup instructions" -ForegroundColor White
        Write-Host "  auth            - Authenticate with Stripe (run once)" -ForegroundColor White
        Write-Host "  auth-manual     - Manual authentication (if auth fails)" -ForegroundColor White
        Write-Host "  start           - Start dev environment with Stripe CLI" -ForegroundColor White
        Write-Host "  start-detached  - Start dev environment in background" -ForegroundColor White
        Write-Host "  stop            - Stop all services" -ForegroundColor White
        Write-Host "  logs            - View Stripe CLI logs" -ForegroundColor White
        Write-Host "  status          - Check Stripe CLI and auth status" -ForegroundColor White
        Write-Host "  test-webhook    - Test webhook endpoint" -ForegroundColor White
        Write-Host "  help            - Show this help" -ForegroundColor White
        Write-Host ""
        Write-Host "Quick Start:" -ForegroundColor Green
        Write-Host "  1. Run: .\stripe-setup.ps1 setup" -ForegroundColor Blue
        Write-Host "  2. Follow the setup instructions" -ForegroundColor Blue
        Write-Host "  3. Run: .\stripe-setup.ps1 start" -ForegroundColor Blue
    }
}