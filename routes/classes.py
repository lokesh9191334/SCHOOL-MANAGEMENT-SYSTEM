from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import login_required

from models import Attendance, Classroom, Enrollment, Subject, Teacher, db

classes_bp = Blueprint('classes', __name__, template_folder='../templates')


@classes_bp.route('/', methods=['GET'])
@login_required
def list_classes():
    classes = Classroom.query.all()

    # Calculate statistics
    total_classes = len(classes)
    total_students = sum(len(classroom.students) for classroom in classes)
    total_subjects = sum(len(classroom.subjects) for classroom in classes)
    avg_class_size = total_students / total_classes if total_classes > 0 else 0

    return render_template('classes/index.html',
                         classes=classes,
                         total_classes=total_classes,
                         total_students=total_students,
                         total_subjects=total_subjects,
                         avg_class_size=avg_class_size)


@classes_bp.route('/incharges', methods=['GET', 'POST'])
@login_required
def incharges():
    """One-page view to see and manage class incharge (class teacher) for each class."""
    teachers = Teacher.query.order_by(Teacher.name.asc()).all()

    if request.method == 'POST':
        class_id = request.form.get('class_id')
        class_teacher_id = request.form.get('class_teacher_id') or None
        try:
            classroom = Classroom.query.get_or_404(int(class_id))
        except Exception:
            flash('Invalid class selection.', 'error')
            return redirect(url_for('classes.incharges'))

        try:
            classroom.class_teacher_id = int(class_teacher_id) if class_teacher_id else None
            db.session.commit()
            flash('Class incharge updated successfully.', 'success')
        except Exception:
            db.session.rollback()
            flash('Failed to update class incharge.', 'error')

        return redirect(url_for('classes.incharges'))

    classes = Classroom.query.order_by(Classroom.name.asc()).all()
    return render_template('classes/incharges.html', classes=classes, teachers=teachers)


@classes_bp.route('/add', methods=['GET', 'POST'])
def add_class():
    if request.method == 'POST':
        name = request.form.get('name')
        year = request.form.get('year')
        grade = request.form.get('grade')
        stream = request.form.get('stream')
        capacity = request.form.get('capacity')
        class_teacher_id = request.form.get('class_teacher_id')
        room = request.form.get('room')
        class_type = request.form.get('class_type')
        academic_year = request.form.get('academic_year')
        status = request.form.get('status')
        description = request.form.get('description')

        c = Classroom(
            name=name,
            year=year,
            grade=grade,
            stream=stream,
            capacity=int(capacity) if capacity else None,
            class_teacher_id=int(class_teacher_id) if class_teacher_id else None,
            room=room,
            class_type=class_type,
            academic_year=academic_year,
            status=status,
            description=description
        )
        db.session.add(c)
        db.session.commit()
        return redirect(url_for('classes.list_classes'))
    teachers = Teacher.query.all()
    return render_template('classes/form.html', teachers=teachers)


@classes_bp.route('/delete/<int:class_id>', methods=['POST'])
def delete_class(class_id):
    c = Classroom.query.get_or_404(class_id)
    db.session.delete(c)
    db.session.commit()
    return redirect(url_for('classes.list_classes'))


@classes_bp.route('/edit/<int:class_id>', methods=['GET', 'POST'])
def edit_class(class_id):
    c = Classroom.query.get_or_404(class_id)
    if request.method == 'POST':
        c.name = request.form.get('name')
        c.year = request.form.get('year')
        c.grade = request.form.get('grade')
        c.stream = request.form.get('stream')
        capacity = request.form.get('capacity')
        class_teacher_id = request.form.get('class_teacher_id')
        c.room = request.form.get('room')
        c.class_type = request.form.get('class_type')
        c.academic_year = request.form.get('academic_year')
        c.status = request.form.get('status')
        c.description = request.form.get('description')

        c.capacity = int(capacity) if capacity else None
        c.class_teacher_id = int(class_teacher_id) if class_teacher_id else None

        db.session.commit()
        return redirect(url_for('classes.list_classes'))
    teachers = Teacher.query.all()
    return render_template('classes/form.html', classroom=c, teachers=teachers)


@classes_bp.route('/view/<int:class_id>')
@login_required
def view_class(class_id):
    """Display detailed view of a specific class."""
    classroom = Classroom.query.get_or_404(class_id)
    students = classroom.students
    subjects = classroom.subjects

    # Get attendance statistics for the last 30 days
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    recent_attendance = Attendance.query.filter(
        Attendance.student_id.in_([s.id for s in students]),
        Attendance.date >= thirty_days_ago
    ).all()

    # Calculate attendance stats
    total_attendance_records = len(recent_attendance)
    present_count = sum(1 for a in recent_attendance if a.present)
    attendance_rate = (present_count / total_attendance_records * 100) if total_attendance_records > 0 else 0

    return render_template('classes/view.html',
                         classroom=classroom,
                         students=students,
                         subjects=subjects,
                         attendance_rate=attendance_rate,
                         total_attendance_records=total_attendance_records)


@classes_bp.route('/analytics')
@login_required
def classes_analytics():
    """Display classes analytics dashboard with enrollment statistics."""
    # Get all classes and enrollments
    classes = Classroom.query.all()
    enrollments = Enrollment.query.all()
    subjects = Subject.query.all()

    # Calculate statistics
    total_classes = len(classes)
    total_enrollments = len(enrollments)
    total_subjects = len(subjects)

    # Enrollment per class
    class_enrollments = {}
    for enrollment in enrollments:
        class_name = enrollment.classroom.name
        if class_name not in class_enrollments:
            class_enrollments[class_name] = 0
        class_enrollments[class_name] += 1

    # Subjects per class
    class_subjects = {}
    for subject in subjects:
        class_name = subject.classroom.name if subject.classroom else 'Unassigned'
        if class_name not in class_subjects:
            class_subjects[class_name] = 0
        class_subjects[class_name] += 1

    # Average class size
    avg_class_size = total_enrollments / total_classes if total_classes > 0 else 0

    # Grade distribution
    grade_distribution = {}
    for classroom in classes:
        grade = classroom.grade or classroom.year or 'Unknown'
        if grade not in grade_distribution:
            grade_distribution[grade] = 0
        grade_distribution[grade] += 1

    return render_template('classes/analytics.html',
                         total_classes=total_classes,
                         total_enrollments=total_enrollments,
                         total_subjects=total_subjects,
                         class_enrollments=class_enrollments,
                         class_subjects=class_subjects,
                         avg_class_size=avg_class_size,
                         grade_distribution=grade_distribution)


@classes_bp.route('/report')
@login_required
def classes_report():
    """Display detailed classes report with filtering options."""
    # Get filter parameters
    grade_filter = request.args.get('grade', '')
    min_enrollment = request.args.get('min_enrollment', '')

    # Base query
    query = Classroom.query

    # Apply filters
    if grade_filter:
        query = query.filter(Classroom.grade.contains(grade_filter) | Classroom.year.contains(grade_filter))

    classes = query.order_by(Classroom.name).all()

    # Get enrollment counts for each class
    class_stats = {}
    for classroom in classes:
        enrollment_count = len(classroom.students)
        subject_count = len(classroom.subjects)

        # Apply enrollment filter
        if min_enrollment and enrollment_count < int(min_enrollment):
            continue

        class_stats[classroom.id] = {
            'enrollments': enrollment_count,
            'subjects': subject_count
        }

    return render_template('classes/report.html',
                         classes=classes,
                         class_stats=class_stats,
                         grade_filter=grade_filter,
                         min_enrollment=min_enrollment)
