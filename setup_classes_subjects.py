from app import create_app, db
from models import Classroom, Subject, Teacher

def create_standard_classes():
    """Create all standard classes from Nursery to 12th with sections"""
    
    # Standard classes from Nursery to 12th
    classes_data = [
        # Pre-Primary
        {'grade': 'Nursery', 'sections': ['A', 'B']},
        {'grade': 'LKG', 'sections': ['A', 'B']},
        {'grade': 'UKG', 'sections': ['A', 'B']},
        
        # Primary (1-5)
        {'grade': '1', 'sections': ['A', 'B', 'C']},
        {'grade': '2', 'sections': ['A', 'B', 'C']},
        {'grade': '3', 'sections': ['A', 'B', 'C']},
        {'grade': '4', 'sections': ['A', 'B', 'C']},
        {'grade': '5', 'sections': ['A', 'B', 'C']},
        
        # Middle School (6-8)
        {'grade': '6', 'sections': ['A', 'B', 'C']},
        {'grade': '7', 'sections': ['A', 'B', 'C']},
        {'grade': '8', 'sections': ['A', 'B', 'C']},
        
        # Secondary (9-10)
        {'grade': '9', 'sections': ['A', 'B', 'C']},
        {'grade': '10', 'sections': ['A', 'B', 'C']},
        
        # Senior Secondary (11-12)
        {'grade': '11', 'sections': ['A', 'B']},  # Science, Commerce
        {'grade': '12', 'sections': ['A', 'B']},  # Science, Commerce
    ]
    
    created_classes = []
    
    for class_data in classes_data:
        grade = class_data['grade']
        for section in class_data['sections']:
            class_name = f"Grade {grade} - Section {section}"
            
            # Check if class already exists
            existing_class = Classroom.query.filter_by(name=class_name).first()
            if not existing_class:
                classroom = Classroom(
                    name=class_name,
                    grade=grade,
                    capacity=40,  # Default capacity
                    academic_year="2024-2025",
                    status='active'
                )
                db.session.add(classroom)
                created_classes.append(class_name)
                print(f"Created: {class_name}")
            else:
                print(f"Already exists: {class_name}")
    
    try:
        db.session.commit()
        print(f"\n✅ Successfully created {len(created_classes)} new classes!")
        return created_classes
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating classes: {e}")
        return []

def create_standard_subjects():
    """Create standard subjects for all grades"""
    
    subjects_data = [
        # Pre-Primary Subjects
        {'name': 'English', 'code': 'ENG', 'category': 'Language'},
        {'name': 'Hindi', 'code': 'HIN', 'category': 'Language'},
        {'name': 'Mathematics', 'code': 'MAT', 'category': 'Mathematics'},
        {'name': 'Environmental Studies', 'code': 'EVS', 'category': 'General'},
        {'name': 'Art & Craft', 'code': 'ART', 'category': 'Creative'},
        {'name': 'Physical Education', 'code': 'PE', 'category': 'Physical'},
        {'name': 'Music', 'code': 'MUS', 'category': 'Creative'},
        {'name': 'Story Time', 'code': 'STO', 'category': 'Activity'},
        
        # Primary Subjects (1-5)
        {'name': 'English', 'code': 'ENG', 'category': 'Language'},
        {'name': 'Hindi', 'code': 'HIN', 'category': 'Language'},
        {'name': 'Mathematics', 'code': 'MAT', 'category': 'Mathematics'},
        {'name': 'Science', 'code': 'SCI', 'category': 'Science'},
        {'name': 'Social Studies', 'code': 'SST', 'category': 'Social'},
        {'name': 'Computer Science', 'code': 'CS', 'category': 'Computer'},
        {'name': 'Art & Craft', 'code': 'ART', 'category': 'Creative'},
        {'name': 'Physical Education', 'code': 'PE', 'category': 'Physical'},
        {'name': 'Moral Science', 'code': 'MOR', 'category': 'Value'},
        {'name': 'General Knowledge', 'code': 'GK', 'category': 'General'},
        
        # Middle School Subjects (6-8)
        {'name': 'English', 'code': 'ENG', 'category': 'Language'},
        {'name': 'Hindi', 'code': 'HIN', 'category': 'Language'},
        {'name': 'Sanskrit', 'code': 'SAN', 'category': 'Language'},
        {'name': 'Mathematics', 'code': 'MAT', 'category': 'Mathematics'},
        {'name': 'Physics', 'code': 'PHY', 'category': 'Science'},
        {'name': 'Chemistry', 'code': 'CHE', 'category': 'Science'},
        {'name': 'Biology', 'code': 'BIO', 'category': 'Science'},
        {'name': 'History', 'code': 'HIS', 'category': 'Social'},
        {'name': 'Geography', 'code': 'GEO', 'category': 'Social'},
        {'name': 'Civics', 'code': 'CIV', 'category': 'Social'},
        {'name': 'Computer Science', 'code': 'CS', 'category': 'Computer'},
        {'name': 'Art & Craft', 'code': 'ART', 'category': 'Creative'},
        {'name': 'Physical Education', 'code': 'PE', 'category': 'Physical'},
        {'name': 'Music', 'code': 'MUS', 'category': 'Creative'},
        
        # Secondary Subjects (9-10)
        {'name': 'English', 'code': 'ENG', 'category': 'Language'},
        {'name': 'Hindi', 'code': 'HIN', 'category': 'Language'},
        {'name': 'Mathematics', 'code': 'MAT', 'category': 'Mathematics'},
        {'name': 'Physics', 'code': 'PHY', 'category': 'Science'},
        {'name': 'Chemistry', 'code': 'CHE', 'category': 'Science'},
        {'name': 'Biology', 'code': 'BIO', 'category': 'Science'},
        {'name': 'History', 'code': 'HIS', 'category': 'Social'},
        {'name': 'Geography', 'code': 'GEO', 'category': 'Social'},
        {'name': 'Economics', 'code': 'ECO', 'category': 'Social'},
        {'name': 'Political Science', 'code': 'POL', 'category': 'Social'},
        {'name': 'Computer Science', 'code': 'CS', 'category': 'Computer'},
        {'name': 'Physical Education', 'code': 'PE', 'category': 'Physical'},
        
        # Senior Secondary - Science Stream (11-12)
        {'name': 'English', 'code': 'ENG', 'category': 'Language'},
        {'name': 'Physics', 'code': 'PHY', 'category': 'Science'},
        {'name': 'Chemistry', 'code': 'CHE', 'category': 'Science'},
        {'name': 'Biology', 'code': 'BIO', 'category': 'Science'},
        {'name': 'Mathematics', 'code': 'MAT', 'category': 'Mathematics'},
        {'name': 'Computer Science', 'code': 'CS', 'category': 'Computer'},
        {'name': 'Physical Education', 'code': 'PE', 'category': 'Physical'},
        
        # Senior Secondary - Commerce Stream (11-12)
        {'name': 'English', 'code': 'ENG', 'category': 'Language'},
        {'name': 'Business Studies', 'code': 'BST', 'category': 'Commerce'},
        {'name': 'Accountancy', 'code': 'ACC', 'category': 'Commerce'},
        {'name': 'Economics', 'code': 'ECO', 'category': 'Commerce'},
        {'name': 'Mathematics', 'code': 'MAT', 'category': 'Mathematics'},
        {'name': 'Computer Science', 'code': 'CS', 'category': 'Computer'},
        {'name': 'Physical Education', 'code': 'PE', 'category': 'Physical'},
    ]
    
    created_subjects = []
    
    for subject_data in subjects_data:
        # Check if subject already exists
        existing_subject = Subject.query.filter_by(name=subject_data['name']).first()
        if not existing_subject:
            subject = Subject(
                name=subject_data['name'],
                stream=subject_data['category']
            )
            db.session.add(subject)
            created_subjects.append(subject_data['name'])
            print(f"Created Subject: {subject_data['name']}")
        else:
            print(f"Subject already exists: {subject_data['name']}")
    
    try:
        db.session.commit()
        print(f"\n✅ Successfully created {len(created_subjects)} new subjects!")
        return created_subjects
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating subjects: {e}")
        return []

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        print("🏫 Creating Standard School Structure...")
        
        print("\n📚 Creating Classes...")
        classes = create_standard_classes()
        
        print("\n📖 Creating Subjects...")
        subjects = create_standard_subjects()
        
        print(f"\n✅ Setup Complete!")
        print(f"Created {len(classes)} classes and {len(subjects)} subjects")
