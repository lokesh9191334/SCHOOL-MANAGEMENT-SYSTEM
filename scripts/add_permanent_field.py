"""
Migration script to add permanent field to Student model
Run this script to add the is_permanent field for data protection
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text

from app import app, db


def add_permanent_field():
    """Add is_permanent field to the student table"""
    with app.app_context():
        try:
            # Check if column already exists
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('student')]

            # Add column if it doesn't exist
            if 'is_permanent' not in existing_columns:
                try:
                    sql = "ALTER TABLE student ADD COLUMN is_permanent BOOLEAN DEFAULT 0"
                    db.session.execute(text(sql))
                    db.session.commit()
                    print("✓ Added column: is_permanent")
                except Exception as e:
                    print(f"✗ Error adding is_permanent: {str(e)}")
                    db.session.rollback()
            else:
                print("○ Column already exists: is_permanent")

            print("\n✓ Migration completed successfully!")
            print("Permanent record protection field has been added to the Student model.")

        except Exception as e:
            print(f"\n✗ Migration failed: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    print("=" * 60)
    print("Student Permanent Field Migration")
    print("=" * 60)
    print("\nAdding permanent record protection field...")
    print("-" * 60)
    add_permanent_field()
    print("=" * 60)
