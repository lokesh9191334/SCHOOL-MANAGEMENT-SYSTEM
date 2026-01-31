from app import create_app
from flask import url_for

app = create_app()

with app.app_context():
    try:
        # Test if the route exists
        url = url_for('dashboard.teacher_leave_status_final')
        print(f"✅ teacher_leave_status_final route exists: {url}")
    except Exception as e:
        print(f"❌ teacher_leave_status_final route error: {e}")
    
    try:
        url = url_for('dashboard.teacher_leave_status_working')
        print(f"✅ teacher_leave_status_working route exists: {url}")
    except Exception as e:
        print(f"❌ teacher_leave_status_working route error: {e}")
    
    try:
        url = url_for('dashboard.teacher_leave_status')
        print(f"✅ teacher_leave_status route exists: {url}")
    except Exception as e:
        print(f"❌ teacher_leave_status route error: {e}")
    
    try:
        url = url_for('dashboard.teacher_leave_status_test')
        print(f"✅ teacher_leave_status_test route exists: {url}")
    except Exception as e:
        print(f"❌ teacher_leave_status_test route error: {e}")
    
    # List all dashboard routes
    print("\n📋 All dashboard routes:")
    for rule in app.url_map.iter_rules():
        if 'dashboard' in rule.rule or 'teacher/leave-status' in rule.rule:
            print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
