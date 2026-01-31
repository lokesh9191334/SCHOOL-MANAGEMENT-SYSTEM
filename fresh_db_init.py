from app import create_app
from models import Classroom, Enrollment, Fee, FeeType, Salary, Student, Subject, Teacher, User, db, Parent, StudentLeave, TeacherLeave

app = create_app()

def init_db():
    with app.app_context():
        print("Creating all database tables...")
        db.create_all()
        print("Database tables created successfully!")

        # seed users
        print("Seeding users...")
        admin = User(name='Administrator', email='admin@example.com', role='admin')
        admin.set_password('adminpass')
        db.session.add(admin)

        # Add a staff user for testing
        staff = User(name='Staff Member', email='staff@example.com', role='staff')
        staff.set_password('staffpass')
        db.session.add(staff)

        # Add a teacher user
        teacher_user = User(name='John Smith', email='teacher@example.com', role='teacher')
        teacher_user.set_password('teacherpass')
        db.session.add(teacher_user)

        # Add a parent user
        parent_user = User(name='Parent User', email='parent@example.com', role='parent')
        parent_user.set_password('parentpass')
        db.session.add(parent_user)

        # seed teachers
        print("Seeding teachers...")
        t1 = Teacher(name='Ayesha Malik', email='ayesha@example.com')
        t2 = Teacher(name='Omar Farooq', email='omar@example.com')
        t3 = Teacher(name='John Smith', email='teacher@example.com')
        db.session.add_all([t1, t2, t3])

        # seed classes
        print("Seeding classes...")
        classes = [
            Classroom(name='Nursery-A', year='2025'),
            Classroom(name='Nursery-B', year='2025'),
            Classroom(name='LKG-A', year='2025'),
            Classroom(name='LKG-B', year='2025'),
            Classroom(name='UKG-A', year='2025'),
            Classroom(name='UKG-B', year='2025'),
            Classroom(name='Class 1-A', year='2025'),
            Classroom(name='Class 1-B', year='2025'),
            Classroom(name='Class 2-A', year='2025'),
            Classroom(name='Class 2-B', year='2025'),
            Classroom(name='Class 3-A', year='2025'),
            Classroom(name='Class 3-B', year='2025'),
            Classroom(name='Class 4-A', year='2025'),
            Classroom(name='Class 4-B', year='2025'),
            Classroom(name='Class 5-A', year='2025'),
            Classroom(name='Class 5-B', year='2025'),
            Classroom(name='Class 6-A', year='2025'),
            Classroom(name='Class 6-B', year='2025'),
            Classroom(name='Class 7-A', year='2025'),
            Classroom(name='Class 7-B', year='2025'),
            Classroom(name='Class 8-A', year='2025'),
            Classroom(name='Class 8-B', year='2025'),
            Classroom(name='Class 9-A', year='2025'),
            Classroom(name='Class 9-B', year='2025'),
            Classroom(name='Class 10-A', year='2025'),
            Classroom(name='Class 10-B', year='2025'),
        ]
        db.session.add_all(classes)

        # seed students
        print("Seeding students...")
        s1 = Student(name='Ali Khan', first_name='Ali', last_name='Khan', email='ali@example.com')
        s2 = Student(name='Sara Iqbal', first_name='Sara', last_name='Iqbal', email='sara@example.com')
        s3 = Student(name='Ahmed Hassan', first_name='Ahmed', last_name='Hassan', email='ahmed@example.com')
        db.session.add_all([s1, s2, s3])

        # seed fee types
        print("Seeding fee types...")
        fee_types = [
            FeeType(name='EXAM FEE'),
            FeeType(name='ENROLLMENT FEE'),
            FeeType(name='PRACTICAL FILE'),
            FeeType(name='DIARY'),
            FeeType(name='SPORTS'),
            FeeType(name='TRIP'),
            FeeType(name='CULTURAL ACTIVITIES')
        ]
        db.session.add_all(fee_types)

        db.session.commit()
        print("Initial commit done...")

        # seed subjects and enrollments after commit to get ids
        print("Seeding subjects and enrollments...")
        t = Teacher.query.first()
        c = Classroom.query.first()
        if t and c:
            sub = Subject(name='Mathematics', teacher_id=t.id, classroom_id=c.id)
            db.session.add(sub)

        # enroll students
        s = Student.query.first()
        c = Classroom.query.first()
        if s and c:
            en = Enrollment(student_id=s.id, classroom_id=c.id)
            db.session.add(en)

        # sample fee
        st = Student.query.first()
        if st:
            f = Fee(student_id=st.id, amount=1000.00)
            db.session.add(f)

        # Create parent profile for testing
        parent_user_obj = User.query.filter_by(email='parent@example.com').first()
        if parent_user_obj:
            parent_profile = Parent(
                user_id=parent_user_obj.id,
                name='Parent User',
                email='parent@example.com',
                phone='1234567890'
            )
            db.session.add(parent_profile)

            # Assign class teacher
            teacher = Teacher.query.filter_by(email='teacher@example.com').first()
            if teacher:
                class_1a = Classroom.query.filter_by(name='Class 1-A').first()
                if class_1a:
                    class_1a.class_teacher_id = teacher.id

        db.session.commit()
        print('Database initialized and seeded with sample data successfully!')
        print('')
        print('=== LOGIN CREDENTIALS ===')
        print('Admin: admin@example.com / adminpass')
        print('Teacher: teacher@example.com / teacherpass')
        print('Parent: parent@example.com / parentpass')
        print('Staff: staff@example.com / staffpass')

if __name__ == '__main__':
    init_db()