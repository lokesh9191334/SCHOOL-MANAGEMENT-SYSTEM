#!/usr/bin/env python3
#!/usr/bin/env python3
"""
Test script for Multi-Language Support features
Run this script to verify that the multilingual AI features are working correctly.
"""

import os
import sys
from datetime import datetime

import requests

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_language_detection():
    """Test language detection functionality"""
    print("🧪 Testing Language Detection...")

    test_cases = [
        ("Hello, how are you today?", "en", "English"),
        ("नमस्ते, आप कैसे हैं?", "hi", "Hindi"),
        ("¿Cómo estás hoy?", "es", "Spanish"),
        ("Bonjour, comment allez-vous?", "fr", "French"),
        ("你好，你今天怎么样？", "zh", "Chinese"),
    ]

    for text, expected_lang, expected_name in test_cases:
        try:
            response = requests.post(
                'http://localhost:5000/api/ai/multilingual/detect-language',
                json={'text': text},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    detected_lang = result.get('language')
                    detected_name = result.get('language_name')
                    confidence = result.get('confidence', 0)

                    if detected_lang == expected_lang:
                        print(f"  ✅ '{text[:30]}...' -> {detected_name} ({confidence:.2f} confidence)")
                    else:
                        print(f"  ❌ '{text[:30]}...' -> Expected {expected_name}, got {detected_name}")
                else:
                    print(f"  ❌ Language detection failed for: {text[:30]}...")
            else:
                print(f"  ❌ HTTP {response.status_code} for: {text[:30]}...")

        except Exception as e:
            print(f"  ❌ Error testing language detection: {str(e)}")

def test_translation():
    """Test translation functionality"""
    print("\n🧪 Testing Translation...")

    test_cases = [
        ("Welcome to our school", "en", "hi", "हमारे स्कूल में आपका स्वागत है"),
        ("Hello, how are you?", "en", "es", "Hola, ¿cómo estás?"),
        ("Thank you for your help", "en", "fr", "Merci pour votre aide"),
    ]

    for text, source_lang, target_lang, expected_contains in test_cases:
        try:
            response = requests.post(
                'http://localhost:5000/api/ai/multilingual/translate',
                json={
                    'text': text,
                    'target_language': target_lang,
                    'source_language': source_lang
                },
                timeout=15
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    translated = result.get('translated_text', '')
                    if expected_contains.lower() in translated.lower():
                        print(f"  ✅ '{text}' -> '{translated[:50]}...'")
                    else:
                        print(f"  ⚠️  '{text}' -> '{translated[:50]}...' (unexpected)")
                else:
                    print(f"  ❌ Translation failed for: {text}")
            else:
                print(f"  ❌ HTTP {response.status_code} for translation: {text}")

        except Exception as e:
            print(f"  ❌ Error testing translation: {str(e)}")

def test_multilingual_content_generation():
    """Test multilingual content generation"""
    print("\n🧪 Testing Multilingual Content Generation...")

    try:
        response = requests.post(
            'http://localhost:5000/api/ai/multilingual/generate-content',
            json={
                'prompt': 'Write a short welcome message for new students',
                'target_languages': ['hi', 'es'],
                'base_language': 'en'
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                content = result.get('multilingual_content', {})
                base_content = content.get('base_content', '')
                translations = content.get('translations', {})

                print(f"  ✅ Base content: '{base_content[:50]}...'")
                print(f"  ✅ Generated {len(translations)} translations")

                for lang_code, translation_data in translations.items():
                    translated_text = translation_data.get('text', '')
                    lang_name = translation_data.get('language_name', lang_code)
                    print(f"    - {lang_name}: '{translated_text[:50]}...'")
            else:
                print("  ❌ Multilingual content generation failed")
        else:
            print(f"  ❌ HTTP {response.status_code} for content generation")

    except Exception as e:
        print(f"  ❌ Error testing content generation: {str(e)}")

def test_accessibility_check():
    """Test accessibility check functionality"""
    print("\n🧪 Testing Accessibility Check...")

    test_content = "This is a very long sentence that contains complex vocabulary and might be difficult for some students to understand, especially those with learning disabilities or non-native speakers."

    try:
        response = requests.post(
            'http://localhost:5000/api/ai/multilingual/accessibility-check',
            json={
                'content': test_content,
                'language': 'en'
            },
            timeout=15
        )

        if response.status_code == 200:
            result = response.json()
            accessible = result.get('accessible', False)
            score = result.get('score', 0)
            issues = result.get('issues', [])
            recommendations = result.get('recommendations', [])

            print(f"  ✅ Accessibility score: {score:.1f}/10")
            print(f"  ✅ Accessible: {'Yes' if accessible else 'No'}")
            if issues:
                print(f"  📝 Issues found: {len(issues)}")
                for issue in issues[:2]:  # Show first 2 issues
                    print(f"    - {issue}")
            if recommendations:
                print(f"  💡 Recommendations: {len(recommendations)}")
                for rec in recommendations[:2]:  # Show first 2 recommendations
                    print(f"    - {rec}")
        else:
            print(f"  ❌ HTTP {response.status_code} for accessibility check")

    except Exception as e:
        print(f"  ❌ Error testing accessibility check: {str(e)}")

def test_health_check():
    """Test the health check endpoint"""
    print("\n🧪 Testing Health Check...")

    try:
        response = requests.get('http://localhost:5000/api/ai/multilingual/health-check', timeout=10)

        if response.status_code == 200:
            result = response.json()
            overall_status = result.get('overall_status', 'unknown')
            services = result.get('services', {})

            print(f"  ✅ Overall status: {overall_status}")

            for service_name, service_info in services.items():
                status = service_info.get('status', 'unknown')
                status_icon = "✅" if status in ['healthy', 'configured'] else "❌"
                print(f"    {status_icon} {service_name}: {status}")
        else:
            print(f"  ❌ HTTP {response.status_code} for health check")

    except Exception as e:
        print(f"  ❌ Error testing health check: {str(e)}")

def main():
    """Run all multilingual tests"""
    print("🚀 Starting Multi-Language Support Tests")
    print("=" * 50)
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Testing server at: http://localhost:5000")
    print()

    # Check if server is running
    try:
        response = requests.get('http://localhost:5000', timeout=5)
        if response.status_code != 200:
            print("❌ Server is not responding correctly. Please start the Flask app first.")
            return
    except:
        print("❌ Cannot connect to server. Please start the Flask app first with: python app.py")
        return

    # Run all tests
    test_health_check()
    test_language_detection()
    test_translation()
    test_multilingual_content_generation()
    test_accessibility_check()

    print("\n" + "=" * 50)
    print("🏁 Multi-Language Support Tests Completed!")
    print("\n📝 Notes:")
    print("- If any tests failed, check your API keys in the configuration")
    print("- Ensure the Flask app is running on http://localhost:5000")
    print("- Some AI services may have rate limits or require API keys")
    print("\n🔧 Configuration required:")
    print("- GOOGLE_TRANSLATE_API_KEY for translation features")
    print("- HUGGINGFACE_API_KEY for language detection")
    print("- OPENAI_API_KEY for content generation")

if __name__ == "__main__":
    main()
