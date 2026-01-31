import csv
import os
from datetime import date, datetime, timedelta
from io import StringIO

from flask import Blueprint, Response, current_app, redirect, render_template, request, url_for
from flask_login import login_required
from werkzeug.utils import secure_filename

from models import Attendance, Student, Teacher, TeacherAttendance, db

attendance_bp = Blueprint('attendance', __name__, template_folder='../templates')


@attendance_bp.route('/', methods=['GET'])
def view_attendance():
    today = date.today()
    students = Student.query.all()
    attendance = Attendance.query.filter_by(date=today).all()
    attendance_dict = {a.student_id: a.present for a in attendance}
    return render_template('attendance/index.html',
                           students=students,
                           attendance=attendance_dict,
                           date=today)


@attendance_bp.route('/mark', methods=['GET', 'POST'])
@login_required
def mark_attendance():
    if request.method == 'POST':
        attend_date_str = request.form.get('date') or date.today().isoformat()
        attend_date = datetime.strptime(attend_date_str, '%Y-%m-%d').date()

        # Delete existing attendance for this date
        Attendance.query.filter_by(date=attend_date).delete()

        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'attendance')
        os.makedirs(upload_dir, exist_ok=True)

        # Clean up old attendance photos (keep last 30 days)
        cleanup_old_photos(upload_dir)

        # Add new attendance records
        for s in Student.query.all():
            present = request.form.get(f'present_{s.id}') == 'on'
            photo_path = None

            # Handle photo upload for this student
            photo_file = request.files.get(f'photo_{s.id}')
            if photo_file and photo_file.filename:
                # Validate file type
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
                if '.' in photo_file.filename and photo_file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    filename = secure_filename(f"{s.id}_{attend_date}_{photo_file.filename}")
                    photo_path = os.path.join('uploads', 'attendance', filename)
                    try:
                        photo_file.save(os.path.join(current_app.root_path, 'static', photo_path))
                    except Exception as e:
                        current_app.logger.error(f"Error saving photo for student {s.id}: {str(e)}")
                        photo_path = None
                else:
                    current_app.logger.warning(f"Invalid file type for student {s.id}: {photo_file.filename}")

            a = Attendance(student_id=s.id, date=attend_date, present=present, photo=photo_path)
            db.session.add(a)

        db.session.commit()
        return redirect(url_for('attendance.view_attendance'))

    # GET: render mark attendance page
    today = date.today()
    students = Student.query.all()
    attendance = Attendance.query.filter_by(date=today).all()
    attendance_dict = {a.student_id: a.present for a in attendance}
    return render_template('attendance/index.html',
                           students=students,
                           attendance=attendance_dict,
                           date=today)


def cleanup_old_photos(upload_dir):
    """Clean up attendance photos older than 30 days"""
    try:
        cutoff_date = date.today() - timedelta(days=30)
        for filename in os.listdir(upload_dir):
            if filename.startswith('attendance_'):
                # Extract date from filename (format: student_id_date_filename)
                parts = filename.split('_', 2)
                if len(parts) >= 3:
                    try:
                        file_date = datetime.strptime(parts[1], '%Y-%m-%d').date()
                        if file_date < cutoff_date:
                            os.remove(os.path.join(upload_dir, filename))
                            current_app.logger.info(f"Cleaned up old attendance photo: {filename}")
                    except ValueError:
                        pass  # Invalid date format, skip
    except Exception as e:
        current_app.logger.error(f"Error during photo cleanup: {str(e)}")


@attendance_bp.route('/teachers', methods=['GET'])
@login_required
def view_teacher_attendance():
    today = date.today()
    teachers = Teacher.query.all()
    records = TeacherAttendance.query.filter_by(date=today).all()
    attendance_map = {r.teacher_id: r for r in records}
    return render_template('attendance/teachers.html',
                           teachers=teachers,
                           attendance_map=attendance_map,
                           date=today)


@attendance_bp.route('/teachers/mark', methods=['GET', 'POST'])
@login_required
def mark_teacher_attendance():
    if request.method == 'POST':
        attend_date_str = request.form.get('date') or date.today().isoformat()
        attend_date = datetime.strptime(attend_date_str, '%Y-%m-%d').date()
        # Delete existing attendance for this date
        TeacherAttendance.query.filter_by(date=attend_date).delete()
        # Add new records
        for t in Teacher.query.all():
            status = request.form.get(f'status_{t.id}') or 'present'
            check_in_str = request.form.get(f'check_in_{t.id}') or None
            check_out_str = request.form.get(f'check_out_{t.id}') or None
            notes = request.form.get(f'notes_{t.id}') or None
            check_in = None
            check_out = None
            try:
                if check_in_str:
                    check_in = datetime.strptime(check_in_str, '%H:%M').time()
            except ValueError:
                check_in = None
            try:
                if check_out_str:
                    check_out = datetime.strptime(check_out_str, '%H:%M').time()
            except ValueError:
                check_out = None
            ta = TeacherAttendance(teacher_id=t.id, date=attend_date, status=status, check_in=check_in, check_out=check_out, notes=notes)
            db.session.add(ta)
        db.session.commit()
        return redirect(url_for('attendance.view_teacher_attendance'))

    # GET: render mark attendance page (same as view)
    return redirect(url_for('attendance.view_teacher_attendance'))


@attendance_bp.route('/analytics')
@login_required
def attendance_analytics():
    # Get date range (default to current month)
    end_date = date.today()
    start_date = end_date.replace(day=1)

    # Get all attendance records for the period
    attendance_records = Attendance.query.filter(
        Attendance.date >= start_date,
        Attendance.date <= end_date
    ).all()

    # Calculate statistics
    total_students = Student.query.count()
    total_days = (end_date - start_date).days + 1

    # Daily attendance stats
    daily_stats = {}
    student_stats = {}

    for record in attendance_records:
        day = record.date
        if day not in daily_stats:
            daily_stats[day] = {'present': 0, 'total': 0}

        daily_stats[day]['total'] += 1
        if record.present:
            daily_stats[day]['present'] += 1

        # Student-wise stats
        student_id = record.student_id
        if student_id not in student_stats:
            student_stats[student_id] = {'present': 0, 'total': 0}

        student_stats[student_id]['total'] += 1
        if record.present:
            student_stats[student_id]['present'] += 1

    # Calculate percentages
    for day in daily_stats:
        stats = daily_stats[day]
        stats['percentage'] = (stats['present'] / stats['total'] * 100) if stats['total'] > 0 else 0

    for student_id in student_stats:
        stats = student_stats[student_id]
        stats['percentage'] = (stats['present'] / stats['total'] * 100) if stats['total'] > 0 else 0

    # Get student details
    students = Student.query.all()
    student_details = {s.id: s for s in students}

    # Overall statistics
    total_records = len(attendance_records)
    present_count = sum(1 for r in attendance_records if r.present)
    overall_percentage = (present_count / total_records * 100) if total_records > 0 else 0

    return render_template('attendance/analytics.html',
                         daily_stats=daily_stats,
                         student_stats=student_stats,
                         student_details=student_details,
                         start_date=start_date,
                         end_date=end_date,
                         total_students=total_students,
                         total_days=total_days,
                         overall_percentage=overall_percentage)


@attendance_bp.route('/report', methods=['GET', 'POST'])
@login_required
def attendance_report():
    if request.method == 'POST':
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        student_id = request.form.get('student_id')

        if start_date and end_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()

            query = Attendance.query.filter(
                Attendance.date >= start,
                Attendance.date <= end
            )

            if student_id:
                query = query.filter(Attendance.student_id == int(student_id))

            attendance_records = query.all()

            # Group by student
            report_data = {}
            for record in attendance_records:
                sid = record.student_id
                if sid not in report_data:
                    report_data[sid] = {
                        'student': record.student,
                        'records': [],
                        'present_count': 0,
                        'total_days': 0
                    }

                report_data[sid]['records'].append(record)
                report_data[sid]['total_days'] += 1
                if record.present:
                    report_data[sid]['present_count'] += 1

            # Calculate percentages
            for sid in report_data:
                data = report_data[sid]
                data['percentage'] = (data['present_count'] / data['total_days'] * 100) if data['total_days'] > 0 else 0

            students = Student.query.all()
            return render_template('attendance/report.html',
                                 report_data=report_data,
                                 start_date=start,
                                 end_date=end,
                                 students=students,
                                 selected_student_id=int(student_id) if student_id else None)

    students = Student.query.all()
    return render_template('attendance/report.html', students=students)


@attendance_bp.route('/export')
@login_required
def export_attendance():
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Student', 'Present'])

    attendance = db.session.query(
        Attendance.date,
        Student.name,
        Attendance.present
    ).join(
        Student
    ).order_by(
        Attendance.date.desc(),
        Student.name
    ).all()

    for a in attendance:
        writer.writerow([
            a.date.strftime('%Y-%m-%d') if hasattr(a.date, 'strftime') else str(a.date),
            a.name,
            'Yes' if a.present else 'No'
        ])
    output_value = output.getvalue()
    return Response(output_value, content_type='text/csv', headers={'Content-Disposition': 'attachment; filename=attendance.csv'})
