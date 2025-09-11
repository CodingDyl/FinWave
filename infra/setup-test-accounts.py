#!/usr/bin/env python3
"""
Script to set up test external accounts in Stripe for development/testing
This creates test bank accounts for USD, EUR, and ZAR currencies
"""

import stripe
import os
import sys

# Set up Stripe API key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

if not stripe.api_key:
    print("❌ Error: STRIPE_SECRET_KEY environment variable not set")
    print("Please set your Stripe secret key:")
    print("export STRIPE_SECRET_KEY=sk_test_...")
    sys.exit(1)

def create_test_external_account(country, currency, account_number, routing_number):
    """Create a test external account for the given currency"""
    try:
        print(f"🏦 Creating {currency.upper()} external account...")
        
        external_account = stripe.Account.create_external_account(
            'acct_test',  # This will use your default test account
            external_account={
                'object': 'bank_account',
                'country': country,
                'currency': currency,
                'account_number': account_number,
                'routing_number': routing_number,
            }
        )
        
        print(f"✅ Successfully created {currency.upper()} external account: {external_account.id}")
        return external_account
        
    except stripe.error.StripeError as e:
        print(f"❌ Error creating {currency.upper()} account: {e}")
        return None

def main():
    print("🚀 Setting up test external accounts for Stripe...")
    print("=" * 50)
    
    # Test account configurations
    test_accounts = [
        {
            'country': 'US',
            'currency': 'usd',
            'account_number': '1234567890',
            'routing_number': '110000000',
            'description': 'US Dollar Test Account'
        },
        {
            'country': 'GB',
            'currency': 'gbp',
            'account_number': '12345678',
            'routing_number': '200000',
            'description': 'British Pound Test Account'
        },
        {
            'country': 'ZA',
            'currency': 'zar',
            'account_number': '1234567890',
            'routing_number': '051001',
            'description': 'South African Rand Test Account'
        }
    ]
    
    created_accounts = []
    
    for account in test_accounts:
        result = create_test_external_account(
            account['country'],
            account['currency'],
            account['account_number'],
            account['routing_number']
        )
        
        if result:
            created_accounts.append({
                'currency': account['currency'].upper(),
                'id': result.id,
                'status': result.status
            })
    
    print("\n" + "=" * 50)
    print("📋 Summary:")
    
    if created_accounts:
        print("✅ Successfully created external accounts:")
        for account in created_accounts:
            print(f"   • {account['currency']}: {account['id']} ({account['status']})")
        
        print("\n🎉 You can now create payouts in these currencies!")
        print("💡 Try creating a payout in your application now.")
    else:
        print("❌ No external accounts were created successfully.")
        print("💡 Check your Stripe API key and try again.")

if __name__ == "__main__":
    main()
