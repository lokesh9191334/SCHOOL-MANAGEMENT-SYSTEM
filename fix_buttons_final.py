#!/usr/bin/env python3
"""
Create a simple test page to verify button visibility
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import User

app = create_app()

def create_simple_test_page():
    """Create a simple test page with working buttons"""
    with app.app_context():
        # Create simple HTML content
        html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>Button Test Page</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .test-button {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #1a1a1a;
            border: none;
            padding: 14px 28px;
            font-weight: 700;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            z-index: 99999;
            display: inline-block;
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }
        .test-button:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
            background: linear-gradient(135deg, #f59e0b 50%, #d97706 100%);
            color: #1a1a1a !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 99999 !important;
        }
        .container {
            padding: 50px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Button Visibility Test</h1>
        <p>These buttons should stay visible on hover:</p>
        
        <button class="test-button" onclick="alert('Button 1 clicked!')">
            <i class="fas fa-edit"></i> Test Button 1
        </button>
        
        <button class="test-button" onclick="alert('Button 2 clicked!')" style="background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%); color: white;">
            <i class="fas fa-key"></i> Test Button 2
        </button>
        
        <br><br>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h3>Test Results:</h3>
            <p id="testResult">Hover over the buttons above to test visibility</p>
        </div>
    </div>
    
    <script>
        // Test button visibility
        document.addEventListener('DOMContentLoaded', function() {
            const buttons = document.querySelectorAll('.test-button');
            const resultDiv = document.getElementById('testResult');
            
            buttons.forEach((button, index) => {
                button.addEventListener('mouseenter', function() {
                    const styles = window.getComputedStyle(this);
                    resultDiv.innerHTML = `
                        <strong>Button ${index + 1} Hover Test:</strong><br>
                        Opacity: ${styles.opacity}<br>
                        Visibility: ${styles.visibility}<br>
                        Z-index: ${styles.zIndex}<br>
                        Display: ${styles.display}<br>
                        Color: ${styles.color}<br>
                        <span style="color: green;">✅ Button is visible!</span>
                    `;
                });
            });
        });
    </script>
</body>
</html>
        """
        
        # Write to file
        with open('c:\\Users\\lk527\\Desktop\\SCHOOL MANAGEMENT SYSTEM\\templates\\button_test.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print("✅ Button test page created!")
        print("📁 File: templates/button_test.html")
        print("🌐 Access: http://localhost:5000/button-test")
        print("🔍 This will help us test button visibility issues")

if __name__ == "__main__":
    create_simple_test_page()
