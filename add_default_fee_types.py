"""
Script to add default fee types to the database
Fee Types: Exam Fee, Enrollment Fee, Trip Fee, Activities Fee, Bus Fee, Others
"""

from app import create_app, db
from models import FeeType


def add_default_fee_types():
    """Add predefined fee types"""
    
    fee_types_data = [
        {
            'name': 'Exam Fee',
            'description': 'Fees for examination conducted by the school',
            'is_recurring': True,
            'frequency': 'quarterly',
            'default_amount': 500.00
        },
        {
            'name': 'Enrollment Fee',
            'description': 'One-time admission or re-registration fee',
            'is_recurring': False,
            'frequency': None,
            'default_amount': 1000.00
        },
        {
            'name': 'Trip Fee',
            'description': 'Fees for educational trips and excursions',
            'is_recurring': False,
            'frequency': None,
            'default_amount': 2000.00
        },
        {
            'name': 'Activities Fee',
            'description': 'Fees for co-curricular activities and clubs',
            'is_recurring': True,
            'frequency': 'monthly',
            'default_amount': 300.00
        },
        {
            'name': 'Bus Fee',
            'description': 'Transportation/bus services fee',
            'is_recurring': True,
            'frequency': 'monthly',
            'default_amount': 1500.00
        },
        {
            'name': 'Others',
            'description': 'Miscellaneous fees and charges',
            'is_recurring': False,
            'frequency': None,
            'default_amount': 0.00
        }
    ]
    
    app = create_app()
    with app.app_context():
        # Check if fee types already exist
        existing_count = FeeType.query.count()
        if existing_count > 0:
            print(f"Database already has {existing_count} fee types. Skipping...")
            return
        
        # Add fee types
        for ft_data in fee_types_data:
            fee_type = FeeType(
                name=ft_data['name'],
                description=ft_data['description'],
                is_recurring=ft_data['is_recurring'],
                frequency=ft_data['frequency'],
                default_amount=ft_data['default_amount'],
                is_active=True
            )
            db.session.add(fee_type)
        
        db.session.commit()
        print(f"✅ Successfully added {len(fee_types_data)} default fee types:")
        for ft in fee_types_data:
            print(f"   - {ft['name']}")

if __name__ == '__main__':
    add_default_fee_types()
