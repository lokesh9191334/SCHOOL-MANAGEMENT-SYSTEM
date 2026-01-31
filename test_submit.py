#!/usr/bin/env python3
"""
Direct test of leave submission
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import TeacherLeave, Teacher
from sqlalchemy import text
from datetime import datetime

def test_direct_submission():
    """Test direct submission without web interface"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔍 Testing direct leave submission...")
            
            # Get teacher
            teacher = db.session.execute(text("SELECT id, name FROM teacher WHERE user_id = 11")).fetchone()
            if not teacher:
                print("❌ Teacher not found")
                return False
            
            teacher_id = teacher[0]
            teacher_name = teacher[1]
            print(f"✅ Teacher found: {teacher_name} (ID: {teacher_id})")
            
            # Insert leave directly
            insert_query = text("""
                INSERT INTO teacher_leave (teacher_id, leave_type, start_date, end_date, reason, status, created_at)
                VALUES (:teacher_id, :leave_type, :start_date, :end_date, :reason, 'pending', :created_at)
            """)
            
            db.session.execute(insert_query, {
                'teacher_id': teacher_id,
                'leave_type': 'sick',
                'start_date': datetime.now().date(),
                'end_date': datetime.now().date(),
                'reason': 'Direct test submission',
                'created_at': datetime.utcnow()
            })
            
            db.session.commit()
            print("✅ Leave submitted successfully!")
            
            # Verify
            leaves = db.session.execute(text("SELECT COUNT(*) FROM teacher_leave WHERE teacher_id = :teacher_id"), 
                                           {'teacher_id': teacher_id}).fetchone()
            print(f"✅ Total leaves for teacher: {leaves[0]}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = test_direct_submission()
    if success:
        print("\n🎉 Direct submission test PASSED!")
        print("The database submission works perfectly!")
    else:
        print("\n❌ Direct submission test FAILED!")
