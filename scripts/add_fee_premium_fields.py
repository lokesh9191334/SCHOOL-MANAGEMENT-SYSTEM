"""
Migration script to add premium fields to Fee model
Run this script to add new fields for enhanced fee management
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text

from app import create_app
from models import db


def add_fee_premium_fields():
    """Add new premium fields to the fee table"""
    app = create_app()
    with app.app_context():
        try:
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            existing_columns = [col['name'] for col in inspector.get_columns('fee')]
            
            # List of new columns to add
            new_columns = {
                'father_name': 'VARCHAR(120)',
                'mother_name': 'VARCHAR(120)',
                'guardian_name': 'VARCHAR(120)',
                'payment_method': 'VARCHAR(50)',
                'tax_applicable': 'BOOLEAN DEFAULT 0',
                'tax_percentage': 'DECIMAL(5, 2) DEFAULT 0',
                'tax_amount': 'DECIMAL(10, 2) DEFAULT 0',
                'auto_reminder_enabled': 'BOOLEAN DEFAULT 1',
                'online_payment_enabled': 'BOOLEAN DEFAULT 1',
                'receipt_auto_generate': 'BOOLEAN DEFAULT 1'
            }
            
            # Add columns that don't exist
            for column_name, column_type in new_columns.items():
                if column_name not in existing_columns:
                    try:
                        sql = f"ALTER TABLE fee ADD COLUMN {column_name} {column_type}"
                        db.session.execute(text(sql))
                        db.session.commit()
                        print(f"✓ Added column: {column_name}")
                    except Exception as e:
                        print(f"✗ Error adding {column_name}: {str(e)}")
                        db.session.rollback()
                else:
                    print(f"○ Column already exists: {column_name}")
            
            print("\n✓ Migration completed successfully!")
            print("New premium fields have been added to the Fee model.")
            
        except Exception as e:
            print(f"\n✗ Migration failed: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    print("=" * 60)
    print("Fee Premium Fields Migration")
    print("=" * 60)
    print("\nAdding new fields to Fee model...")
    print("-" * 60)
    add_fee_premium_fields()
    print("=" * 60)
