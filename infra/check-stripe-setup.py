#!/usr/bin/env python3
"""
Script to check Stripe account setup and external accounts
"""

import stripe
import os

def check_stripe_setup():
    # Set up Stripe API key
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    
    if not stripe.api_key:
        print("❌ Error: STRIPE_SECRET_KEY environment variable not set")
        return False
    
    try:
        print("🔍 Checking Stripe account setup...")
        
        # Get account info
        account = stripe.Account.retrieve()
        print(f"✅ Account ID: {account.id}")
        print(f"✅ Account Type: {account.type}")
        print(f"✅ Country: {account.country}")
        
        # Check if we can create a test payout (this will tell us about external accounts)
        print("\n🧪 Testing payout creation...")
        
        try:
            # Try to create a test payout
            test_payout = stripe.Payout.create(
                amount=100,  # $1.00
                currency='usd',
                description='Test payout to check external accounts'
            )
            print("✅ USD payouts are working!")
            print(f"   Test payout ID: {test_payout.id}")
            
        except stripe.error.InvalidRequestError as e:
            if "external accounts" in str(e).lower():
                print("❌ No external accounts configured")
                print("💡 Please set up external accounts in your Stripe dashboard:")
                print("   1. Go to https://dashboard.stripe.com/test")
                print("   2. Settings → External accounts")
                print("   3. Add external accounts for USD and ZAR")
                return False
            else:
                print(f"❌ Other error: {e}")
                return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking Stripe setup: {e}")
        return False

if __name__ == "__main__":
    if check_stripe_setup():
        print("\n🎉 Stripe is properly configured for payouts!")
    else:
        print("\n⚠️  Stripe needs external accounts to be set up manually.")
