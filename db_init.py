from app import create_app
from models import Classroom, Enrollment, Fee, FeeType, Salary, Student, Subject, Teacher, User, db

app = create_app()


def init_db():
    with app.app_context():
        db.create_all()

        # seed users
        if User.query.count() == 0:
            admin = User(name='Administrator', email='admin@example.com', role='admin')
            admin.set_password('adminpass')
            db.session.add(admin)

            # Add a staff user for testing
            staff = User(name='Staff Member', email='staff@example.com', role='staff')
            staff.set_password('staffpass')
            db.session.add(staff)

        # seed teachers
        if Teacher.query.count() == 0:
            t1 = Teacher(name='Ayesha Malik', email='ayesha@example.com')
            t2 = Teacher(name='Omar Farooq', email='omar@example.com')
            db.session.add_all([t1, t2])

        # seed classes
        if Classroom.query.count() == 0:
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
                Classroom(name='Class 11-A', year='2025'),
                Classroom(name='Class 11-B', year='2025'),
                Classroom(name='Class 12-A', year='2025'),
                Classroom(name='Class 12-B', year='2025'),
            ]
            db.session.add_all(classes)

        # seed students
        if Student.query.count() == 0:
            s1 = Student(name='Ali Khan', first_name='Ali', last_name='Khan', email='ali@example.com')
            s2 = Student(name='Sara Iqbal', first_name='Sara', last_name='Iqbal', email='sara@example.com')
            db.session.add_all([s1, s2])

        # seed fee types
        if FeeType.query.count() == 0:
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

        # seed subjects and enrollments after commit to get ids
        if Subject.query.count() == 0:
            t = Teacher.query.first()
            c = Classroom.query.first()
            sub = Subject(name='Mathematics', teacher_id=t.id if t else None, classroom_id=c.id if c else None)
            db.session.add(sub)
        # enroll students
        if Enrollment.query.count() == 0:
            s = Student.query.first()
            c = Classroom.query.first()
            if s and c:
                en = Enrollment(student_id=s.id, classroom_id=c.id)
                db.session.add(en)

        # sample fee
        if Fee.query.count() == 0 and Student.query.count() > 0:
            st = Student.query.first()
            f = Fee(student_id=st.id, amount=1000.00)
            db.session.add(f)

        db.session.commit()
        print('DB initialized and seeded sample data.')


if __name__ == '__main__':
    init_db()