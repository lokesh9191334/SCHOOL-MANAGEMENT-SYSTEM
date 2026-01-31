"""
Migration script to add Aadhaar card fields to Student model
Run this script to add student_aadhaar, father_aadhaar, and mother_aadhaar fields
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text

from app import create_app
from models import db


def add_aadhaar_fields():
    """Add Aadhaar card fields to the student table"""
    app = create_app()
    with app.app_context():
        try:
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('student')]

            # List of new columns to add
            new_columns = {
                'student_aadhaar': 'VARCHAR(12)',  # Student's Aadhaar number (12 digits)
                'father_aadhaar': 'VARCHAR(12)',   # Father's Aadhaar number (12 digits)
                'mother_aadhaar': 'VARCHAR(12)'    # Mother's Aadhaar number (12 digits)
            }

            # Add columns that don't exist
            for column_name, column_type in new_columns.items():
                if column_name not in existing_columns:
                    try:
                        sql = f"ALTER TABLE student ADD COLUMN {column_name} {column_type}"
                        db.session.execute(text(sql))
                        db.session.commit()
                        print(f"✓ Added column: {column_name}")
                    except Exception as e:
                        print(f"✗ Error adding {column_name}: {str(e)}")
                        db.session.rollback()
                else:
                    print(f"○ Column already exists: {column_name}")

            print("\n✓ Migration completed successfully!")
            print("Aadhaar card fields have been added to the Student model.")
            print("- student_aadhaar: Student's Aadhaar number")
            print("- father_aadhaar: Father's Aadhaar number")
            print("- mother_aadhaar: Mother's Aadhaar number")

        except Exception as e:
            print(f"\n✗ Migration failed: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    print("=" * 60)
    print("Student Aadhaar Fields Migration")
    print("=" * 60)
    print("\nAdding Aadhaar card fields to Student model...")
    print("-" * 60)
    add_aadhaar_fields()
    print("=" * 60)
