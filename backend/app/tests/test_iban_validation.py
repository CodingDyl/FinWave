#!/usr/bin/env python3
"""
Test script to verify IBAN validation works correctly
"""

import sys
import os
sys.path.append('backend')

from backend.app.schemas.destination import DestinationCreateBank

def test_iban_validation():
    print("🧪 Testing IBAN validation...")
    print("=" * 50)
    
    # Test 1: Valid IBAN only
    print("\n📋 Test 1: Valid IBAN only")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="GB82WEST12345698765432",
            bic="DEUTGB2L",
            label="Test IBAN Account"
        )
        print("✅ PASSED: Valid IBAN only")
        print(f"   IBAN: {payload.iban}")
        print(f"   BIC: {payload.bic}")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 2: Valid account number only
    print("\n📋 Test 2: Valid account number only")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="US",
            currency="USD",
            account_number="1234567890",
            routing_number="021000021",
            label="Test Account Number"
        )
        print("✅ PASSED: Valid account number only")
        print(f"   Account: {payload.account_number}")
        print(f"   Routing: {payload.routing_number}")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 3: Both IBAN and account number (should fail)
    print("\n📋 Test 3: Both IBAN and account number (should fail)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            account_number="1234567890",
            iban="GB82WEST12345698765432"
        )
        print("❌ FAILED: Should not allow both IBAN and account number")
    except ValueError as e:
        print(f"✅ PASSED: Correctly rejected both: {e}")
    except Exception as e:
        print(f"❌ FAILED: Wrong error type: {e}")
    
    # Test 4: Neither IBAN nor account number (should fail)
    print("\n📋 Test 4: Neither IBAN nor account number (should fail)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP"
        )
        print("❌ FAILED: Should require either IBAN or account number")
    except ValueError as e:
        print(f"✅ PASSED: Correctly rejected neither: {e}")
    except Exception as e:
        print(f"❌ FAILED: Wrong error type: {e}")
    
    # Test 5: Invalid IBAN format (too short)
    print("\n📋 Test 5: Invalid IBAN format (too short)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="GB123"
        )
        print("❌ FAILED: Should reject invalid IBAN format")
    except ValueError as e:
        print(f"✅ PASSED: Correctly rejected invalid IBAN: {e}")
    except Exception as e:
        print(f"❌ FAILED: Wrong error type: {e}")
    
    # Test 6: Invalid IBAN format (too long)
    print("\n📋 Test 6: Invalid IBAN format (too long)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="GB82WEST1234569876543212345678901234567890"
        )
        print("❌ FAILED: Should reject invalid IBAN format")
    except ValueError as e:
        print(f"✅ PASSED: Correctly rejected invalid IBAN: {e}")
    except Exception as e:
        print(f"❌ FAILED: Wrong error type: {e}")
    
    # Test 7: Valid IBAN with spaces (should be cleaned)
    print("\n📋 Test 7: Valid IBAN with spaces (should be cleaned)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="GB 82 WEST 1234 5698 7654 32"
        )
        print("✅ PASSED: Valid IBAN with spaces cleaned")
        print(f"   Original: 'GB 82 WEST 1234 5698 7654 32'")
        print(f"   Cleaned:  '{payload.iban}'")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 8: Valid IBAN with mixed case (should be uppercase)
    print("\n📋 Test 8: Valid IBAN with mixed case (should be uppercase)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="gb82west12345698765432"
        )
        print("✅ PASSED: Valid IBAN with mixed case converted to uppercase")
        print(f"   Original: 'gb82west12345698765432'")
        print(f"   Cleaned:  '{payload.iban}'")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 9: Empty IBAN (should be treated as None)
    print("\n📋 Test 9: Empty IBAN (should be treated as None)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="",
            account_number="1234567890"
        )
        print("✅ PASSED: Empty IBAN treated as None")
        print(f"   IBAN: {repr(payload.iban)}")
        print(f"   Account: {payload.account_number}")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    # Test 10: Whitespace-only IBAN (should be treated as None)
    print("\n📋 Test 10: Whitespace-only IBAN (should be treated as None)")
    try:
        payload = DestinationCreateBank(
            type="bank_account",
            country="GB",
            currency="GBP",
            iban="   ",
            account_number="1234567890"
        )
        print("✅ PASSED: Whitespace-only IBAN treated as None")
        print(f"   IBAN: {repr(payload.iban)}")
        print(f"   Account: {payload.account_number}")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 IBAN validation tests completed!")

def test_real_world_examples():
    print("\n🌍 Testing real-world IBAN examples...")
    print("=" * 50)
    
    # Real IBAN examples from different countries
    test_cases = [
        {
            "name": "UK IBAN",
            "country": "GB",
            "currency": "GBP",
            "iban": "GB82WEST12345698765432",
            "bic": "DEUTGB2L"
        },
        {
            "name": "German IBAN",
            "country": "DE",
            "currency": "EUR",
            "iban": "DE89370400440532013000",
            "bic": "COBADEFFXXX"
        },
        {
            "name": "French IBAN",
            "country": "FR",
            "currency": "EUR",
            "iban": "FR1420041010050500013M02606",
            "bic": "PSSTFRPPPAR"
        },
        {
            "name": "Spanish IBAN",
            "country": "ES",
            "currency": "EUR",
            "iban": "ES9121000418450200051332",
            "bic": "CAIXESBBXXX"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['name']}")
        try:
            payload = DestinationCreateBank(
                type="bank_account",
                country=test_case["country"],
                currency=test_case["currency"],
                iban=test_case["iban"],
                bic=test_case["bic"],
                label=f"{test_case['name']} Account"
            )
            print(f"✅ PASSED: {test_case['name']}")
            print(f"   IBAN: {payload.iban}")
            print(f"   BIC: {payload.bic}")
        except Exception as e:
            print(f"❌ FAILED: {test_case['name']} - {e}")

if __name__ == "__main__":
    test_iban_validation()
    test_real_world_examples()
