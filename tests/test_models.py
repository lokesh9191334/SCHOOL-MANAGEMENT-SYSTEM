from models import Classroom, Fee, Student, Subject, Teacher, User


def test_user_password():
    """Test password hashing and verification."""
    u = User(email='test@example.com', name='Test User')
    u.set_password('cat')
    assert not u.check_password('dog')
    assert u.check_password('cat')

def test_student_creation():
    """Test student model creation and relationships."""
    s = Student(name='Test Student', roll_number='TS001')
    assert s.name == 'Test Student'
    assert s.roll_number == 'TS001'
    assert s.fees == []
    assert s.attendance == []

def test_teacher_creation():
    """Test teacher model creation and relationships."""
    t = Teacher(name='Test Teacher', subject='Math')
    assert t.name == 'Test Teacher'
    assert t.subject == 'Math'
    assert t.subjects == []

def test_classroom_creation():
    """Test classroom model creation and relationships."""
    c = Classroom(name='Test Class', grade='10')
    assert c.name == 'Test Class'
    assert c.grade == '10'
    assert c.students == []
    assert c.subjects == []

def test_subject_creation():
    """Test subject model creation and relationships."""
    t = Teacher(name='Test Teacher')
    c = Classroom(name='Test Class')
    s = Subject(name='Math', teacher=t, classroom=c)
    assert s.name == 'Math'
    assert s.teacher == t
    assert s.classroom == c

def test_fee_creation():
    """Test fee model creation and relationships."""
    s = Student(name='Test Student')
    f = Fee(student=s, amount=1000)
    assert f.student == s
    assert f.amount == 1000
    assert not f.paid