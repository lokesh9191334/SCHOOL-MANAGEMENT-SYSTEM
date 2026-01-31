from datetime import date, timedelta

from models import Attendance, Fee, Subject


def test_list_students(client, auth, student):
    auth.login()
    response = client.get('/api/students')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]['name'] == student.name
    assert data[0]['roll_number'] == student.roll_number

def test_list_teachers(client, auth, teacher):
    auth.login()
    response = client.get('/api/teachers')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]['name'] == teacher.name

def test_list_classes(client, auth, classroom):
    auth.login()
    response = client.get('/api/classes')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]['name'] == classroom.name
    assert data[0]['grade'] == classroom.grade

def test_attendance_summary(client, auth, student, db):
    auth.login()
    
    # Create attendance record
    attendance = Attendance(student_id=student.id, date=date.today(), present=True)
    db.session.add(attendance)
    db.session.commit()
    
    response = client.get('/api/attendance/summary')
    assert response.status_code == 200
    data = response.get_json()
    assert data['present'] == 1
    assert data['total'] == 1
    assert data['percentage'] == 100.0

def test_fees_summary(client, auth, student, db):
    auth.login()
    
    # Create fee records
    fee1 = Fee(student_id=student.id, amount=1000, paid=True)
    fee2 = Fee(student_id=student.id, amount=1000, paid=False)
    db.session.add_all([fee1, fee2])
    db.session.commit()
    
    response = client.get('/api/fees/summary')
    assert response.status_code == 200
    data = response.get_json()
    assert data['total_fees'] == 2000
    assert data['collected'] == 1000
    assert data['pending'] == 1000
    assert data['collection_rate'] == 50.0

def test_class_size_stats(client, auth, classroom, student):
    auth.login()
    response = client.get('/api/stats/class-size')
    assert response.status_code == 200
    data = response.get_json()
    assert data['total_classes'] == 1
    assert data['total_students'] == 1
    assert data['avg_class_size'] == 1.0
    assert classroom.name in data['class_sizes']

def test_attendance_trend(client, auth, student, db):
    auth.login()
    
    # Create attendance records for last 3 days
    from datetime import date, timedelta
    today = date.today()
    
    for i in range(3):
        day = today - timedelta(days=i)
        attendance = Attendance(student_id=student.id, date=day, present=(i != 1))
        db.session.add(attendance)
    db.session.commit()
    
    response = client.get('/api/stats/attendance/3')
    assert response.status_code == 200
    data = response.get_json()
    assert 'daily_stats' in data
    assert len(data['daily_stats']) == 3
    
def test_fees_by_class(client, auth, classroom, student, db):
    auth.login()
    
    # Create fee records
    fee1 = Fee(student_id=student.id, amount=1000, paid=True)
    fee2 = Fee(student_id=student.id, amount=1000, paid=False)
    db.session.add_all([fee1, fee2])
    db.session.commit()
    
    response = client.get('/api/stats/fees-by-class')
    assert response.status_code == 200
    data = response.get_json()
    assert classroom.name in data
    class_stats = data[classroom.name]
    assert class_stats['total'] == 2000
    assert class_stats['collected'] == 1000
    assert class_stats['collection_rate'] == 50.0

def test_student_report(client, auth, student, db):
    auth.login()
    
    # Create attendance and fee records
    attendance = Attendance(student_id=student.id, date=date.today(), present=True)
    fee = Fee(student_id=student.id, amount=1000, paid=True)
    db.session.add_all([attendance, fee])
    db.session.commit()
    
    response = client.get(f'/api/student/{student.id}/report')
    assert response.status_code == 200
    data = response.get_json()
    
    assert data['student']['id'] == student.id
    assert data['student']['name'] == student.name
    assert data['attendance']['total_days'] == 1
    assert data['attendance']['days_present'] == 1
    assert data['fees']['total'] == 1000
    assert data['fees']['paid'] == 1000

def test_teacher_performance(client, auth, teacher, classroom, student, db):
    auth.login()
    
    # Create subject and link it to teacher and classroom
    from models import Subject
    subject = Subject(name='Mathematics')
    db.session.add(subject)
    db.session.commit()
    
    # Now add relationships
    subject.teachers.append(teacher)
    subject.classrooms.append(classroom)
    
    # Create attendance record
    attendance = Attendance(student_id=student.id, date=date.today(), present=True)
    db.session.add(attendance)
    db.session.commit()
    
    response = client.get(f'/api/teacher/{teacher.id}/performance')
    assert response.status_code == 200
    data = response.get_json()
    
    assert data['teacher']['id'] == teacher.id
    assert data['teacher']['name'] == teacher.name
    assert len(data['teacher']['subjects']) == 1
    assert data['metrics']['total_classes'] == 1
    assert data['metrics']['total_students'] == 1
    assert data['metrics']['subjects_taught'] == 1
    assert classroom.name in data['metrics']['class_attendance_rates']

def test_grade_analytics(client, auth, classroom, student, db):
    auth.login()
    
    # Create attendance and fee records
    attendance = Attendance(student_id=student.id, date=date.today(), present=True)
    fee = Fee(student_id=student.id, amount=1000, paid=True)
    
    db.session.add_all([attendance, fee])
    db.session.commit()
    
    response = client.get('/api/stats/grades')
    assert response.status_code == 200
    data = response.get_json()
    
    assert 'grade_wise_stats' in data
    assert 'overall_stats' in data
    assert str(classroom.grade) in data['grade_wise_stats']
    
    grade_stats = data['grade_wise_stats'][str(classroom.grade)]
    assert grade_stats['total_students'] == 1
    assert grade_stats['attendance']['average_rate'] == 100.0
    assert grade_stats['fees']['average_collection_rate'] == 100.0
    
    overall = data['overall_stats']
    assert overall['total_grades'] == 1
    assert overall['total_students'] == 1
    assert overall['average_attendance_rate'] == 100.0
    assert overall['average_fee_collection_rate'] == 100.0

def test_time_series_analytics(client, auth, student, db):
    auth.login()
    
    # Create attendance records for different dates
    from datetime import date, timedelta
    today = date.today()
    
    # Create attendance for last 3 weeks
    for i in range(21):
        day = today - timedelta(days=i)
        attendance = Attendance(student_id=student.id, date=day, present=(i % 2 == 0))
        db.session.add(attendance)
    
    # Create fee records
    for i in range(3):
        payment_date = today - timedelta(days=i*30)
        fee = Fee(student_id=student.id, amount=1000, paid=True, payment_date=payment_date)
        db.session.add(fee)
    
    db.session.commit()
    
    # Test attendance weekly
    response = client.get('/api/analytics/time-series/attendance/weekly')
    assert response.status_code == 200
    data = response.get_json()
    assert 'labels' in data
    assert 'values' in data
    assert len(data['labels']) > 0
    
    # Test fees monthly
    response = client.get('/api/analytics/time-series/fees/monthly')
    assert response.status_code == 200
    data = response.get_json()
    assert 'labels' in data
    assert 'values' in data
    assert len(data['labels']) > 0

def test_subject_analytics(client, auth, teacher, classroom, student, db):
    auth.login()
    
    # Create subject and link it
    subject = Subject(name='Mathematics')
    db.session.add(subject)
    db.session.commit()
    
    # Now add relationships
    subject.teachers.append(teacher)
    subject.classrooms.append(classroom)
    
    # Create attendance record
    attendance = Attendance(student_id=student.id, date=date.today(), present=True)
    db.session.add(attendance)
    db.session.commit()
    
    response = client.get('/api/analytics/subjects')
    assert response.status_code == 200
    data = response.get_json()
    
    assert 'subjects' in data
    assert 'Mathematics' in data['subjects']
    assert data['subjects']['Mathematics']['total_students'] == 1
    assert data['subjects']['Mathematics']['total_teachers'] == 1

def test_comparative_analytics(client, auth, classroom, student, db):
    auth.login()
    
    # Create attendance and fee records
    attendance = Attendance(student_id=student.id, date=date.today(), present=True)
    fee = Fee(student_id=student.id, amount=1000, paid=True)
    db.session.add_all([attendance, fee])
    db.session.commit()
    
    # Test all metrics
    metrics = ['attendance', 'fees', 'class_size']
    for metric in metrics:
        response = client.get(f'/api/analytics/compare/{metric}')
        assert response.status_code == 200
        data = response.get_json()
        assert 'comparison' in data
        assert 'summary' in data
        assert str(classroom.grade) in data['comparison']

def test_financial_forecast(client, auth, student, db):
    auth.login()
    
    # Create historical fee records
    today = date.today()
    for i in range(3):
        payment_date = today - timedelta(days=i*30)
        fee = Fee(
            student_id=student.id,
            amount=1000,
            paid=True,
            payment_date=payment_date
        )
        db.session.add(fee)
    
    # Add some pending fees
    fee = Fee(student_id=student.id, amount=500, paid=False)
    db.session.add(fee)
    db.session.commit()
    
    response = client.get('/api/analytics/financial/forecast')
    assert response.status_code == 200
    data = response.get_json()
    
    assert 'historical' in data
    assert 'forecast' in data
    assert 'metrics' in data
    assert data['metrics']['total_pending'] == 500
    assert len(data['forecast']) == 6  # 6 months forecast

def test_api_requires_auth(client):
    endpoints = [
        '/api/students',
        '/api/teachers',
        '/api/classes',
        '/api/attendance/summary',
        '/api/fees/summary',
        '/api/stats/class-size',
        '/api/stats/attendance/7',
        '/api/stats/fees-by-class',
        '/api/student/1/report',
        '/api/teacher/1/performance',
        '/api/stats/grades',
        '/api/analytics/time-series/attendance/weekly',
        '/api/analytics/time-series/fees/monthly',
        '/api/analytics/subjects',
        '/api/analytics/compare/attendance',
        '/api/analytics/financial/forecast'
    ]
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 302  # Redirects to login