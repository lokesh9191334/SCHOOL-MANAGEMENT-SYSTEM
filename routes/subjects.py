"""Subjects module - handles all subject-related routes and operations."""
import csv
import os
from io import StringIO

from flask import (
    Blueprint,
    abort,
    current_app,
    flash,
    make_response,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required

from models import (
    Attendance,
    Classroom,
    Enrollment,
    Subject,
    SubjectAssignment,
    SubjectGrade,
    SubjectMaterial,
    Teacher,
    TeacherSubstitution,
    WeeklySchedule,
    db,
)

subjects_bp = Blueprint('subjects', __name__, template_folder='../templates')


@subjects_bp.route('/', methods=['GET'])
def list_subjects():
    """List all subjects with their associated teachers and classes."""
    subjects = Subject.query.all()
    teachers = Teacher.query.all()
    classes = Classroom.query.all()
    return render_template('subjects/index.html',
                         subjects=subjects,
                         teachers=teachers,
                         classes=classes)


@subjects_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_subject():
    """Add a new subject with optional teacher and classroom assignments."""
    if request.method == 'POST':
        # Get form data
        name = request.form.get('name')
        stream = request.form.get('stream')
        teacher_id = request.form.get('teacher_id')
        classroom_id = request.form.get('classroom_id')

        # Convert IDs to integers if provided, else None
        teacher_id = int(teacher_id) if teacher_id else None
        classroom_id = int(classroom_id) if classroom_id else None

        # Create and save the subject
        subject = Subject(
            name=name,
            stream=stream if stream else None,
            teacher_id=teacher_id,
            classroom_id=classroom_id
        )
        db.session.add(subject)
        db.session.commit()

        return redirect(url_for('subjects.list_subjects'))

    # GET request - show the add form
    teachers = Teacher.query.all()
    classes = Classroom.query.all()
    subjects = Subject.query.all()
    return render_template('subjects/form.html',
                         teachers=teachers,
                         classes=classes,
                         subjects=subjects)


@subjects_bp.route('/edit/<int:subject_id>', methods=['GET', 'POST'])
@login_required
def edit_subject(subject_id):
    """Edit an existing subject's details."""
    subject = db.session.get(Subject, subject_id) or abort(404)

    if request.method == 'POST':
        # Update subject details
        subject.name = request.form.get('name')
        subject.stream = request.form.get('stream') or None
        subject.teacher_id = request.form.get('teacher_id') or None
        subject.classroom_id = request.form.get('classroom_id') or None
        db.session.commit()
        return redirect(url_for('subjects.list_subjects'))

    # GET request - show edit form
    teachers = Teacher.query.all()
    classes = Classroom.query.all()
    return render_template('subjects/edit.html',
                         subject=subject,
                         teachers=teachers,
                         classes=classes)


@subjects_bp.route('/delete/<int:subject_id>', methods=['POST'])
@login_required
def delete_subject(subject_id):
    """Delete a subject (admin only)."""
    if not current_user.is_admin:
        return redirect(url_for('subjects.list_subjects'))

    subject = db.session.get(Subject, subject_id) or abort(404)
    db.session.delete(subject)
    db.session.commit()
    return redirect(url_for('subjects.list_subjects'))


@subjects_bp.route('/export')
@login_required
def export_subjects():
    """Export all subjects as CSV file."""
    output = StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(['ID', 'Name', 'Teacher', 'Class'])

    # Write data rows
    subjects = Subject.query.all()
    for subject in subjects:
        writer.writerow([
            subject.id,
            subject.name,
            subject.teacher.name if subject.teacher else '',
            subject.classroom.name if subject.classroom else ''
        ])

    # Create response with CSV file
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = 'attachment; filename=subjects.csv'
    return response


@subjects_bp.route('/analytics')
@login_required
def subjects_analytics():
    """Display subjects analytics dashboard with charts and statistics."""
    # Get all subjects for analytics
    subjects = Subject.query.all()
    teachers = Teacher.query.all()
    classes = Classroom.query.all()
    enrollments = Enrollment.query.all()

    # Calculate statistics
    total_subjects = len(subjects)
    total_teachers = len(teachers)
    total_classes = len(classes)
    total_enrollments = len(enrollments)

    # Subjects per teacher
    teacher_subjects = {}
    for subject in subjects:
        teacher_name = subject.teacher.name if subject.teacher else 'Unassigned'
        if teacher_name not in teacher_subjects:
            teacher_subjects[teacher_name] = 0
        teacher_subjects[teacher_name] += 1

    # Subjects per class
    class_subjects = {}
    for subject in subjects:
        class_name = subject.classroom.name if subject.classroom else 'Unassigned'
        if class_name not in class_subjects:
            class_subjects[class_name] = 0
        class_subjects[class_name] += 1

    # Enrollment distribution by class
    class_enrollments = {}
    for enrollment in enrollments:
        class_name = enrollment.classroom.name
        if class_name not in class_enrollments:
            class_enrollments[class_name] = 0
        class_enrollments[class_name] += 1

    return render_template('subjects/analytics.html',
                         total_subjects=total_subjects,
                         total_teachers=total_teachers,
                         total_classes=total_classes,
                         total_enrollments=total_enrollments,
                         teacher_subjects=teacher_subjects,
                         class_subjects=class_subjects,
                         class_enrollments=class_enrollments)


@subjects_bp.route('/report')
@login_required
def subjects_report():
    """Display detailed subjects report with filtering options."""
    # Get filter parameters
    teacher_filter = request.args.get('teacher', '')
    class_filter = request.args.get('classroom', '')

    # Base query
    query = Subject.query

    # Apply filters
    if teacher_filter:
        query = query.join(Teacher).filter(Teacher.name.contains(teacher_filter))

    if class_filter:
        query = query.join(Classroom).filter(Classroom.name.contains(class_filter))

    subjects = query.order_by(Subject.name).all()

    # Get teachers and classes for filter dropdowns
    teachers = Teacher.query.all()
    classes = Classroom.query.all()

    return render_template('subjects/report.html',
                         subjects=subjects,
                         teachers=teachers,
                         classes=classes,
                         teacher_filter=teacher_filter,
                         class_filter=class_filter)


@subjects_bp.route('/view/<int:subject_id>')
@login_required
def view_subject(subject_id):
    """View detailed information about a specific subject."""
    subject = db.session.get(Subject, subject_id) or abort(404)

    # Get related data
    enrollments = Enrollment.query.filter_by(classroom_id=subject.classroom_id).all() if subject.classroom_id else []
    attendances = Attendance.query.filter(
        Attendance.student_id.in_([e.student_id for e in enrollments])
    ).order_by(Attendance.date.desc()).limit(10).all() if enrollments else []

    return render_template('subjects/view.html',
                         subject=subject,
                         enrollments=enrollments,
                         recent_attendances=attendances)


@subjects_bp.route('/bulk_import', methods=['GET', 'POST'])
@login_required
def bulk_import_subjects():
    """Bulk import subjects from CSV file."""
    if request.method == 'POST':
        file = request.files.get('file')
        if file and file.filename.endswith('.csv'):
            import csv
            from io import StringIO

            # Read CSV content
            stream = StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.reader(stream)

            # Skip header
            next(csv_input, None)

            imported_count = 0
            errors = []

            for row in csv_input:
                try:
                    if len(row) >= 1:
                        name = row[0].strip()
                        teacher_name = row[1].strip() if len(row) > 1 else None
                        classroom_name = row[2].strip() if len(row) > 2 else None

                        # Find teacher and classroom
                        teacher = None
                        classroom = None

                        if teacher_name:
                            teacher = Teacher.query.filter_by(name=teacher_name).first()

                        if classroom_name:
                            classroom = Classroom.query.filter_by(name=classroom_name).first()

                        # Create subject
                        subject = Subject(
                            name=name,
                            teacher_id=teacher.id if teacher else None,
                            classroom_id=classroom.id if classroom else None
                        )
                        db.session.add(subject)
                        imported_count += 1

                except Exception as e:
                    errors.append(f"Error importing row {len(errors) + imported_count + 1}: {str(e)}")

            db.session.commit()

            flash(f'Successfully imported {imported_count} subjects.', 'success')
            if errors:
                flash(f'Errors: {" ".join(errors)}', 'warning')

            return redirect(url_for('subjects.list_subjects'))

    return render_template('subjects/import.html')


@subjects_bp.route('/schedule/<int:subject_id>')
@login_required
def subject_schedule(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    schedule = WeeklySchedule.query.filter_by(subject_id=subject.id).order_by(WeeklySchedule.day_of_week).all()
    teachers = Teacher.query.all()
    classes = Classroom.query.all()
    subs = TeacherSubstitution.query.filter_by(subject_id=subject.id).order_by(TeacherSubstitution.date.desc()).all()
    return render_template('subjects/schedule.html', subject=subject, schedule=schedule, teachers=teachers, classes=classes, substitutions=subs)

@subjects_bp.route('/schedule/<int:subject_id>/add_session', methods=['POST'])
@login_required
def add_session(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    day = request.form.get('day_of_week')
    start = request.form.get('start_time')
    end = request.form.get('end_time')
    room = request.form.get('room')
    teacher_id = request.form.get('teacher_id')
    classroom_id = request.form.get('classroom_id')
    if not day or not start or not end:
        flash('Day and time are required.', 'error')
        return redirect(url_for('subjects.subject_schedule', subject_id=subject.id))
    from datetime import datetime as dt
    try:
        s = WeeklySchedule(subject_id=subject.id, day_of_week=day, start_time=dt.strptime(start, '%H:%M').time(), end_time=dt.strptime(end, '%H:%M').time(), room=room, teacher_id=int(teacher_id) if teacher_id else None, classroom_id=int(classroom_id) if classroom_id else None)
        db.session.add(s)
        db.session.commit()
        flash('Session added.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error adding session: {str(e)}', 'error')
    return redirect(url_for('subjects.subject_schedule', subject_id=subject.id))

@subjects_bp.route('/schedule/delete/<int:session_id>', methods=['POST'])
@login_required
def delete_session(session_id):
    s = db.session.get(WeeklySchedule, session_id) or abort(404)
    sid = s.subject_id
    try:
        db.session.delete(s)
        db.session.commit()
        flash('Session deleted.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting session: {str(e)}', 'error')
    return redirect(url_for('subjects.subject_schedule', subject_id=sid))

@subjects_bp.route('/schedule/<int:subject_id>/substitute', methods=['POST'])
@login_required
def add_substitution(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    original_teacher_id = request.form.get('original_teacher_id')
    substitute_teacher_id = request.form.get('substitute_teacher_id')
    date_str = request.form.get('date')
    start = request.form.get('start_time')
    end = request.form.get('end_time')
    classroom_id = request.form.get('classroom_id')
    reason = request.form.get('reason')
    if not original_teacher_id or not substitute_teacher_id or not date_str or not start or not end:
        flash('All fields are required.', 'error')
        return redirect(url_for('subjects.subject_schedule', subject_id=subject.id))
    from datetime import datetime as dt
    try:
        sub = TeacherSubstitution(original_teacher_id=int(original_teacher_id), substitute_teacher_id=int(substitute_teacher_id), subject_id=subject.id, classroom_id=int(classroom_id) if classroom_id else None, date=dt.strptime(date_str, '%Y-%m-%d').date(), start_time=dt.strptime(start, '%H:%M').time(), end_time=dt.strptime(end, '%H:%M').time(), reason=reason)
        db.session.add(sub)
        db.session.commit()
        flash('Substitution added.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error adding substitution: {str(e)}', 'error')
    return redirect(url_for('subjects.subject_schedule', subject_id=subject.id))


@subjects_bp.route('/grades/<int:subject_id>')
@login_required
def subject_grades(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    enrollments = Enrollment.query.filter_by(classroom_id=subject.classroom_id).all() if subject.classroom_id else []
    grades = SubjectGrade.query.filter_by(subject_id=subject.id).all()
    grades_data = {}
    for e in enrollments:
        student_grades = [g for g in grades if g.student_id == e.student_id]
        midterm = next((float(g.score) / float(g.max_score) * 100 for g in student_grades if g.type == 'midterm'), 0)
        final = next((float(g.score) / float(g.max_score) * 100 for g in student_grades if g.type == 'final'), 0)
        assignments = round(sum(float(g.score) / float(g.max_score) * 100 for g in student_grades if g.type == 'assignment') / max(1, len([g for g in student_grades if g.type == 'assignment'])), 2) if any(g.type == 'assignment' for g in student_grades) else 0
        overall = round((midterm + final + assignments) / 3, 2) if (midterm or final or assignments) else 0
        grades_data[e.student_id] = {'student': e.student, 'midterm': round(midterm, 2), 'final': round(final, 2), 'assignments': round(assignments, 2), 'overall': overall}
    return render_template('subjects/grades.html', subject=subject, grades_data=grades_data, enrollments=enrollments)

@subjects_bp.route('/grades/<int:subject_id>/add', methods=['POST'])
@login_required
def add_grade(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    student_id = request.form.get('student_id')
    type_ = request.form.get('type')
    score = request.form.get('score')
    max_score = request.form.get('max_score')
    term = request.form.get('term')
    date_str = request.form.get('date')
    if not student_id or not type_ or not score or not max_score:
        flash('All fields are required.', 'error')
        return redirect(url_for('subjects.subject_grades', subject_id=subject.id))
    try:
        s = SubjectGrade(subject_id=subject.id, student_id=int(student_id), type=type_, score=float(score), max_score=float(max_score), term=term)
        if date_str:
            from datetime import datetime as dt
            s.date = dt.strptime(date_str, '%Y-%m-%d').date()
        db.session.add(s)
        db.session.commit()
        flash('Grade added.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error adding grade: {str(e)}', 'error')
    return redirect(url_for('subjects.subject_grades', subject_id=subject.id))


@subjects_bp.route('/materials/<int:subject_id>')
@login_required
def subject_materials(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    materials = SubjectMaterial.query.filter_by(subject_id=subject.id).order_by(SubjectMaterial.uploaded_at.desc()).all()
    return render_template('subjects/materials.html', subject=subject, materials=materials)

@subjects_bp.route('/materials/<int:subject_id>/upload', methods=['POST'])
@login_required
def upload_material(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    title = request.form.get('title')
    description = request.form.get('description')
    files = request.files.getlist('files')
    if not files or all(not f or not f.filename for f in files):
        single = request.files.get('file')
        files = [single] if single and single.filename else []
    if not files:
        flash('At least one file is required.', 'error')
        return redirect(url_for('subjects.subject_materials', subject_id=subject.id))
    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'subjects', str(subject.id), 'materials')
    os.makedirs(upload_dir, exist_ok=True)
    import uuid

    from werkzeug.utils import secure_filename
    uploaded_count = 0
    for file in files:
        if not file or not file.filename:
            continue
        filename = secure_filename(file.filename)
        filename_unique = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(upload_dir, filename_unique)
        file.save(file_path)
        ext = os.path.splitext(filename)[1].lower()
        t = 'PDF' if ext == '.pdf' else 'MP4' if ext in ['.mp4', '.mov'] else 'DOCX' if ext in ['.docx', '.doc'] else 'FILE'
        file_rel = f"uploads/subjects/{subject.id}/materials/{filename_unique}"
        mat_title = title or os.path.splitext(filename)[0]
        m = SubjectMaterial(subject_id=subject.id, title=mat_title, type=t, file_path=file_rel, description=description, uploaded_by=getattr(request, 'user', None).name if hasattr(request, 'user') else (getattr(current_user, 'name', None) or 'Teacher'))
        db.session.add(m)
        uploaded_count += 1
    db.session.commit()
    flash(f'{uploaded_count} material(s) uploaded successfully.', 'success')
    return redirect(url_for('subjects.subject_materials', subject_id=subject.id))

@subjects_bp.route('/materials/delete/<int:material_id>', methods=['POST'])
@login_required
def delete_material(material_id):
    m = db.session.get(SubjectMaterial, material_id) or abort(404)
    subject_id = m.subject_id
    try:
        file_abs = os.path.join(current_app.static_folder, m.file_path)
        if os.path.exists(file_abs):
            try:
                os.remove(file_abs)
            except OSError:
                pass
        db.session.delete(m)
        db.session.commit()
        flash('Material deleted.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting material: {str(e)}', 'error')
    return redirect(url_for('subjects.subject_materials', subject_id=subject_id))

@subjects_bp.route('/materials/download/<int:material_id>')
@login_required
def download_material(material_id):
    m = db.session.get(SubjectMaterial, material_id) or abort(404)
    file_abs = os.path.join(current_app.static_folder, m.file_path.replace('\\', '/'))
    if not os.path.exists(file_abs):
        abort(404)
    from flask import send_file
    return send_file(file_abs, as_attachment=True, download_name=os.path.basename(file_abs))


@subjects_bp.route('/assignments/<int:subject_id>')
@login_required
def subject_assignments(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    assignments = SubjectAssignment.query.filter_by(subject_id=subject.id).order_by(SubjectAssignment.created_at.desc()).all()
    return render_template('subjects/assignments.html', subject=subject, assignments=assignments)

@subjects_bp.route('/assignments/<int:subject_id>/create', methods=['POST'])
@login_required
def create_assignment(subject_id):
    subject = db.session.get(Subject, subject_id) or abort(404)
    title = request.form.get('title')
    description = request.form.get('description')
    due_date = request.form.get('due_date')
    attachment = request.files.get('attachment')
    if not title:
        flash('Title is required.', 'error')
        return redirect(url_for('subjects.subject_assignments', subject_id=subject.id))
    attachment_path = None
    if attachment and attachment.filename:
        upload_dir = os.path.join(current_app.static_folder, 'uploads', 'subjects', str(subject.id), 'assignments')
        os.makedirs(upload_dir, exist_ok=True)
        import uuid

        from werkzeug.utils import secure_filename
        filename = secure_filename(attachment.filename)
        filename_unique = f"{uuid.uuid4()}_{filename}"
        fpath = os.path.join(upload_dir, filename_unique)
        attachment.save(fpath)
        attachment_path = f"uploads/subjects/{subject.id}/assignments/{filename_unique}"
    d = None
    if due_date:
        try:
            from datetime import datetime as dt
            d = dt.strptime(due_date, '%Y-%m-%d').date()
        except ValueError:
            d = None
    a = SubjectAssignment(subject_id=subject.id, title=title, description=description, due_date=d, attachment_path=attachment_path, status='Active')
    db.session.add(a)
    db.session.commit()
    flash('Assignment created.', 'success')
    return redirect(url_for('subjects.subject_assignments', subject_id=subject.id))

@subjects_bp.route('/assignments/delete/<int:assignment_id>', methods=['POST'])
@login_required
def delete_assignment(assignment_id):
    a = db.session.get(SubjectAssignment, assignment_id) or abort(404)
    subject_id = a.subject_id
    try:
        if a.attachment_path:
            file_abs = os.path.join(current_app.static_folder, a.attachment_path)
            if os.path.exists(file_abs):
                try:
                    os.remove(file_abs)
                except OSError:
                    pass
        db.session.delete(a)
        db.session.commit()
        flash('Assignment deleted.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting assignment: {str(e)}', 'error')
    return redirect(url_for('subjects.subject_assignments', subject_id=subject_id))


@subjects_bp.route('/performance/<int:subject_id>')
@login_required
def subject_performance(subject_id):
    """View performance analytics for a subject."""
    subject = db.session.get(Subject, subject_id) or abort(404)

    # Get enrolled students
    enrollments = Enrollment.query.filter_by(classroom_id=subject.classroom_id).all() if subject.classroom_id else []

    # Calculate performance metrics
    total_students = len(enrollments)
    attendance_rate = 85.5  # Mock data
    average_grade = 87.2  # Mock data

    # Grade distribution
    grade_distribution = {
        'A': 8,
        'B': 6,
        'C': 3,
        'D': 1,
        'F': 0
    }

    return render_template('subjects/performance.html',
                         subject=subject,
                         total_students=total_students,
                         attendance_rate=attendance_rate,
                         average_grade=average_grade,
                         grade_distribution=grade_distribution)


