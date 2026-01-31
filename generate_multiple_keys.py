#!/usr/bin/env python3
"""
Generate multiple 6-digit keys for parent registration
"""
import sys
import os
import random
import string

def generate_6digit_key():
    """Generate 6-digit key with mixed characters"""
    chars = string.ascii_uppercase + string.digits + '!@#$%&*'
    key = ''.join(random.choice(chars) for _ in range(6))
    return key

def generate_multiple_keys(count=10):
    """Generate multiple 6-digit keys"""
    print(f"\n🔑 GENERATING {count} 6-DIGIT KEYS")
    print("=" * 60)
    
    keys = []
    for i in range(count):
        key = generate_6digit_key()
        keys.append(key)
        print(f"{i+1:2d}. {key}")
    
    print(f"\n📝 ADD THESE KEYS TO YOUR ROUTE:")
    print("valid_keys = [")
    for i, key in enumerate(keys):
        if i == len(keys) - 1:
            print(f"    '{key}'")
        else:
            print(f"    '{key}',")
    print("]")
    
    print(f"\n🎯 KEY FEATURES:")
    print(f"  - 6 characters long")
    print(f"  - Mix of uppercase letters (A-Z)")
    print(f"  - Mix of numbers (0-9)")
    print(f"  - Mix of special characters (!@#$%&*)")
    print(f"  - Case-sensitive")
    print(f"  - Easy to remember")
    print(f"  - Secure enough for registration")
    
    return keys

if __name__ == "__main__":
    generate_multiple_keys(10)
