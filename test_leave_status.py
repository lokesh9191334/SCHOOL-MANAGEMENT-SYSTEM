from app import create_app
from flask import url_for

app = create_app()

with app.app_context():
    # Test if the route exists
    try:
        with app.test_request_context():
            # Try to generate the URL for teacher leave status
            url = url_for('dashboard.teacher_leave_status')
            print(f"✅ Route URL: {url}")
            print("✅ Route exists and is accessible")
    except Exception as e:
        print(f"❌ Route error: {e}")
    
    # Check if template exists
    import os
    template_path = os.path.join(app.root_path, 'templates', 'teacher', 'leave_status.html')
    if os.path.exists(template_path):
        print(f"✅ Template exists: {template_path}")
    else:
        print(f"❌ Template not found: {template_path}")
    
    # List all dashboard routes
    print("\n📋 Dashboard routes:")
    for rule in app.url_map.iter_rules():
        if 'dashboard' in rule.rule:
            print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
