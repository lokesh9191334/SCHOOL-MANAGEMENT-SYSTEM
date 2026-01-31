#!/usr/bin/env python3
"""
Simple script to run the Flask application
"""
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

if __name__ == '__main__':
    app = create_app()
    print("Starting School Management System...")
    print("Admin Login Credentials:")
    print("Email: admin@school.com")
    print("Password: admin123")
    print("URL: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)