#!/usr/bin/env python3
"""
Simple test to submit leave directly
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import TeacherLeave, Teacher, User
from datetime import datetime, date

app = create_app()

def test_simple_submit():
    """Test submitting a leave application directly"""
    with app.app_context():
        try:
            # Get the test teacher
            teacher = Teacher.query.filter_by(name='Test Teacher').first()
            if not teacher:
                print("❌ Test teacher not found")
                return False
            
            print(f"✅ Teacher found: {teacher.name} (ID: {teacher.id})")
            
            # Create a simple leave application
            leave = TeacherLeave(
                teacher_id=teacher.id,
                leave_type='sick',
                start_date=date.today(),
                end_date=date(2026, 2, 1),
                reason='Simple test submission',
                status='pending',
                created_at=datetime.utcnow()
            )
            
            print("✅ TeacherLeave object created")
            
            # Save to database
            db.session.add(leave)
            db.session.commit()
            
            print(f"✅ Leave submitted successfully! ID: {leave.id}")
            
            # Verify it was saved
            saved_leave = TeacherLeave.query.get(leave.id)
            if saved_leave:
                print(f"✅ Verified: Leave {saved_leave.id} exists in database")
                print(f"   Teacher: {saved_leave.teacher.name}")
                print(f"   Type: {saved_leave.leave_type}")
                print(f"   Status: {saved_leave.status}")
                return True
            else:
                print("❌ Leave not found in database after save")
                return False
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = test_simple_submit()
    if success:
        print("\n🎉 Simple leave submission test PASSED!")
    else:
        print("\n❌ Simple leave submission test FAILED!")
