from app import create_app
from models import db, Student

app = create_app()

with app.app_context():
    # Create all tables
    db.create_all()
    print("Database tables created successfully.")
    
    # Print database URL
    print(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
    
    # Check if student table exists
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables in database: {tables}")
    
    if 'student' in tables:
        # Check student table columns
        columns = [col['name'] for col in inspector.get_columns('student')]
        print(f"Student table columns: {columns}")
        
        # Check if photo column exists
        if 'photo' in columns:
            print("✓ Photo column exists in student table.")
        else:
            print("✗ Photo column does NOT exist in student table.")
    
    # Count students
    student_count = Student.query.count()
    print(f"Number of students: {student_count}")
