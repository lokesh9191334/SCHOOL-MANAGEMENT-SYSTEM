from collections import defaultdict

from flask import Blueprint, current_app, jsonify, request
from flask_login import login_required

from models import (
    Attendance,
    Classroom,
    Fee,
    Parent,
    ParentNotification,
    Payment,
    Student,
    Subject,
    Teacher,
    db,
)

api_bp = Blueprint('api', __name__)


def _student_full_name(s: Student):
    try:
        return s.full_name()
    except Exception:
        return f"{getattr(s, 'first_name', '')} {getattr(s, 'last_name', '')}".strip()


def _student_classroom_name(student: Student):
    # Return the most recent enrollment's classroom name when available
    if not student.enrollments:
        return None
    latest = sorted(student.enrollments, key=lambda e: getattr(e, 'enrolled_on', None) or 0)[-1]
    return latest.classroom.name if latest and latest.classroom else None


def _classroom_students(classroom: Classroom):
    # Return list of Student objects enrolled in classroom
    return [enr.student for enr in classroom.enrollments]


def _sum_amounts(items):
    # Sum numeric amounts (SQLAlchemy Numeric -> Decimal). Return float.
    total = 0
    for x in items:
        try:
            total += float(x)
        except Exception:
            try:
                total += float(getattr(x, 'amount', 0))
            except Exception:
                total += 0
    return total

@api_bp.route('/metrics', methods=['POST'])
@login_required
def metrics():
    data = request.get_json() or {}
    try:
        current_app.logger.info(f"METRICS {data}")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@api_bp.route('/client/log', methods=['POST'])
def client_log():
    """Receive client-side JS error logs and record them in ActivityLog.
    This endpoint intentionally does not require authentication so client-side
    errors on unauthenticated pages can still be captured.
    """
    data = request.get_json() or {}
    try:
        message = data.get('message') or data.get('msg') or 'Client error'
        stack = data.get('stack') or data.get('trace') or ''
        url = data.get('url') or request.referrer or request.path
        line = data.get('line')
        col = data.get('col')

        summary = f"Client JS error at {url}: {message}"
        if line:
            summary += f" (line {line}{', col '+str(col) if col else ''})"

        # Prefer structured logging via utils.log_activity
        try:
            from utils import log_activity
            # include stack in message body for diagnostics
            full_msg = summary + "\n" + (stack or '')
            log_activity('danger', full_msg)
        except Exception:
            current_app.logger.exception('Failed to write client log to ActivityLog')
            # fallback: log to application logger
            current_app.logger.error('CLIENT LOG: %s -- %s', summary, stack)

        return jsonify({'success': True})
    except Exception as e:
        current_app.logger.exception('Error handling client log')
        return jsonify({'success': False, 'message': str(e)}), 500

@api_bp.route('/students')
@login_required
def list_students():
    students = Student.query.all()
    return jsonify([
        {
            'id': s.id,
            'name': _student_full_name(s),
            'roll_number': getattr(s, 'roll_number', None),
            'classroom': _student_classroom_name(s),
        }
        for s in students
    ])

@api_bp.route('/teachers')
@login_required
def list_teachers():
    teachers = Teacher.query.all()
    return jsonify([
        {
            'id': t.id,
            'name': getattr(t, 'name', None),
            'subjects': [s.name for s in t.subjects] if getattr(t, 'subjects', None) else [],
        }
        for t in teachers
    ])

@api_bp.route('/classes')
@login_required
def list_classes():
    classes = Classroom.query.all()
    return jsonify([
        {
            'id': c.id,
            'name': c.name,
            'year': getattr(c, 'year', None),
            'grade': getattr(c, 'grade', None),
            'student_count': len(_classroom_students(c)),
        }
        for c in classes
    ])

@api_bp.route('/attendance/summary')
@login_required
def attendance_summary():
    """Get attendance summary for today"""
    from datetime import date
    today = date.today()
    attendance = Attendance.query.filter_by(date=today).all()
    present = len([a for a in attendance if a.present])
    total = len(attendance)

    return jsonify(
        {
            'date': today.isoformat(),
            'present': present,
            'total': total,
            'percentage': (present / total * 100) if total > 0 else 0,
        }
    )

@api_bp.route('/fees/summary')
@login_required
def fees_summary():
    """Get fee collection summary. Uses payments when available."""
    # Consider payments (preferred) otherwise fall back to Fee.paid/amount
    payments = Payment.query.all()
    total_from_fees = _sum_amounts(Fee.query.all())
    collected_from_payments = _sum_amounts(payments)

    # If no payment records exist, fallback to Fee.paid flags
    if collected_from_payments == 0:
        fees = Fee.query.all()
        collected_from_fees = _sum_amounts([f.amount for f in fees if f.paid])
        collected = collected_from_fees
    else:
        collected = collected_from_payments

    total = total_from_fees
    pending = total - collected

    return jsonify(
        {
            'total_fees': float(total),
            'collected': float(collected),
            'pending': float(pending),
            'collection_rate': (collected / total * 100) if total > 0 else 0,
        }
    )

@api_bp.route('/stats/class-size')
@login_required
def class_size_stats():
    """Get statistics about class sizes"""
    classes = Classroom.query.all()
    total_students = sum(len(_classroom_students(c)) for c in classes)
    stats = {
        'total_classes': len(classes),
        'total_students': total_students,
        'avg_class_size': total_students / len(classes) if classes else 0,
        'class_sizes': {c.name: len(_classroom_students(c)) for c in classes},
    }
    return jsonify(stats)

@api_bp.route('/stats/attendance/<int:days>')
@login_required
def attendance_trend(days):
    """Get attendance trend for last N days"""
    from datetime import datetime, timedelta
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)

    attendance = (
        Attendance.query.filter(Attendance.date >= start_date, Attendance.date <= end_date)
        .all()
    )

    daily_stats = {}
    for a in attendance:
        date_str = a.date.isoformat()
        if date_str not in daily_stats:
            daily_stats[date_str] = {'present': 0, 'total': 0}
        daily_stats[date_str]['total'] += 1
        if a.present:
            daily_stats[date_str]['present'] += 1

    return jsonify(
        {
            'period': {'start': start_date.isoformat(), 'end': end_date.isoformat()},
            'daily_stats': daily_stats,
        }
    )

@api_bp.route('/stats/fees-by-class')
@login_required
def fees_by_class():
    """Get fee collection statistics by class"""
    classes = Classroom.query.all()
    stats = {}

    for c in classes:
        class_fees = []
        for student in _classroom_students(c):
            student_fees = Fee.query.filter_by(student_id=student.id).all()
            class_fees.extend(student_fees)

        # Use payments when available
        payments = []
        for f in class_fees:
            payments.extend(f.payments)

        total = _sum_amounts([f.amount for f in class_fees])
        collected = _sum_amounts(payments) if payments else _sum_amounts([f.amount for f in class_fees if f.paid])

        stats[c.name] = {
            'total': float(total),
            'collected': float(collected),
            'pending': float(total - collected),
            'collection_rate': (collected / total * 100) if total > 0 else 0,
        }

    return jsonify(stats)

@api_bp.route('/student/<int:student_id>/report')
@login_required
def student_report(student_id):
    """Get comprehensive report for a student"""
    student = Student.query.get_or_404(student_id)

    # Get attendance stats
    attendance = Attendance.query.filter_by(student_id=student_id).all()
    total_days = len(attendance)
    days_present = len([a for a in attendance if a.present])

    # Get fee details and payments
    fees = Fee.query.filter_by(student_id=student_id).all()
    total_fees = _sum_amounts([f.amount for f in fees])
    payments = []
    for f in fees:
        payments.extend(f.payments)
    paid_fees = _sum_amounts(payments) if payments else _sum_amounts([f.amount for f in fees if f.paid])

    report = {
        'student': {
            'id': student.id,
            'name': _student_full_name(student),
            'roll_number': getattr(student, 'roll_number', None),
            'classroom': _student_classroom_name(student),
        },
        'attendance': {
            'total_days': total_days,
            'days_present': days_present,
            'attendance_rate': (days_present / total_days * 100) if total_days > 0 else 0,
        },
        'fees': {
            'total': float(total_fees),
            'paid': float(paid_fees),
            'pending': float(total_fees - paid_fees),
            'payment_rate': (paid_fees / total_fees * 100) if total_fees > 0 else 0,
        },
    }

    return jsonify(report)

@api_bp.route('/teacher/<int:teacher_id>/performance')
@login_required
def teacher_performance(teacher_id):
    """Get comprehensive performance metrics for a teacher"""
    teacher = Teacher.query.get_or_404(teacher_id)

    # Get all classes taught by the teacher (via subjects)
    classes = set()
    for subject in getattr(teacher, 'subjects', []):
        # support both single classroom (legacy) and many-to-many
        if getattr(subject, 'classroom', None):
            classes.add(subject.classroom)
        if getattr(subject, 'classrooms', None):
            for c in subject.classrooms:
                classes.add(c)

    # Calculate metrics
    total_students = sum(len(_classroom_students(classroom)) for classroom in classes)
    attendance_rate = {}

    for classroom in classes:
        # Calculate attendance rate for each class
        class_attendance = []
        for student in _classroom_students(classroom):
            records = Attendance.query.filter_by(student_id=student.id).all()
            if records:
                present = len([r for r in records if r.present])
                rate = (present / len(records) * 100) if records else 0
                class_attendance.append(rate)

        if class_attendance:
            attendance_rate[classroom.name] = sum(class_attendance) / len(class_attendance)

    performance = {
        'teacher': {
            'id': teacher.id,
            'name': getattr(teacher, 'name', None),
            'subjects': [s.name for s in getattr(teacher, 'subjects', [])],
        },
        'metrics': {
            'total_classes': len(classes),
            'total_students': total_students,
            'subjects_taught': len(getattr(teacher, 'subjects', [])),
            'class_attendance_rates': attendance_rate,
            'average_attendance': (
                sum(attendance_rate.values()) / len(attendance_rate) if attendance_rate else 0
            ),
        },
    }

    return jsonify(performance)

@api_bp.route('/stats/grades')
@login_required
def grade_analytics():
    """Get grade distribution and performance analytics"""
    classes = Classroom.query.all()
    grade_stats = {}

    for classroom in classes:
        # Basic class statistics
        students = _classroom_students(classroom)
        total_students = len(students)
        attendance_records = []
        fee_records = []

        for student in students:
            # Gather attendance records
            student_attendance = Attendance.query.filter_by(student_id=student.id).all()
            if student_attendance:
                present_rate = (
                    len([a for a in student_attendance if a.present]) / len(student_attendance) * 100
                )
                attendance_records.append(present_rate)

            # Gather fee records via payments when available
            student_fees = Fee.query.filter_by(student_id=student.id).all()
            if student_fees:
                payments = []
                for f in student_fees:
                    payments.extend(f.payments)
                total = _sum_amounts([f.amount for f in student_fees])
                paid = _sum_amounts(payments) if payments else _sum_amounts([f.amount for f in student_fees if f.paid])
                payment_rate = (paid / total * 100) if total > 0 else 0
                fee_records.append(payment_rate)

        # Calculate statistics
        grade_key = getattr(classroom, 'grade', None) or getattr(classroom, 'year', None)
        grade_stats[grade_key] = {
            'total_students': total_students,
            'attendance': {
                'average_rate': (sum(attendance_records) / len(attendance_records) if attendance_records else 0),
                'min_rate': min(attendance_records) if attendance_records else 0,
                'max_rate': max(attendance_records) if attendance_records else 0,
            },
            'fees': {
                'average_collection_rate': (sum(fee_records) / len(fee_records) if fee_records else 0),
                'min_rate': min(fee_records) if fee_records else 0,
                'max_rate': max(fee_records) if fee_records else 0,
            },
        }

    # Calculate overall statistics
    all_grades = [g for g in grade_stats.keys() if g is not None]
    overall_stats = {
        'total_grades': len(all_grades),
        'grade_range': {'min': min(all_grades) if all_grades else None, 'max': max(all_grades) if all_grades else None},
        'total_students': sum(stats['total_students'] for stats in grade_stats.values()),
        'average_attendance_rate': (
            sum(stats['attendance']['average_rate'] for stats in grade_stats.values()) / len(grade_stats) if grade_stats else 0
        ),
        'average_fee_collection_rate': (
            sum(stats['fees']['average_collection_rate'] for stats in grade_stats.values()) / len(grade_stats) if grade_stats else 0
        ),
    }

    return jsonify({'grade_wise_stats': grade_stats, 'overall_stats': overall_stats})

@api_bp.route('/analytics/time-series/<string:metric>/<string:period>')
@login_required
def time_series_analytics(metric, period):
    """Get time-based analytics for various metrics
    metric: attendance, fees
    period: weekly, monthly, yearly
    """
    from datetime import datetime, timedelta
    
    end_date = datetime.now().date()
    if period == 'weekly':
        start_date = end_date - timedelta(weeks=12)  # Last 12 weeks
        group_format = '%Y-%W'
    elif period == 'monthly':
        start_date = end_date - timedelta(days=365)  # Last 12 months
        group_format = '%Y-%m'
    else:  # yearly
        start_date = end_date - timedelta(days=365*3)  # Last 3 years
        group_format = '%Y'
    
    data = {'labels': [], 'values': []}
    
    if metric == 'attendance':
        records = Attendance.query.filter(
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        period_stats = {}
        for record in records:
            period_key = record.date.strftime(group_format)
            if period_key not in period_stats:
                period_stats[period_key] = {'present': 0, 'total': 0}
            period_stats[period_key]['total'] += 1
            if record.present:
                period_stats[period_key]['present'] += 1
        
        for period_key in sorted(period_stats.keys()):
            stats = period_stats[period_key]
            data['labels'].append(period_key)
            data['values'].append(
                stats['present'] / stats['total'] * 100 if stats['total'] > 0 else 0
            )
    
    elif metric == 'fees':
        # Use payments for time-series of fees, else use Fee.payment_date when available
        payments = Payment.query.filter(Payment.paid_on >= start_date, Payment.paid_on <= end_date).all()

        period_stats = {}
        if payments:
            for record in payments:
                period_key = record.paid_on.strftime(group_format)
                period_stats.setdefault(period_key, 0.0)
                period_stats[period_key] += float(record.amount)
        else:
            fees = Fee.query.filter(Fee.payment_date >= start_date, Fee.payment_date <= end_date).all()
            for record in fees:
                if not record.payment_date:
                    continue
                period_key = record.payment_date.strftime(group_format)
                period_stats.setdefault(period_key, 0.0)
                period_stats[period_key] += float(record.amount)

        for period_key in sorted(period_stats.keys()):
            data['labels'].append(period_key)
            data['values'].append(period_stats[period_key])
    
    return jsonify(data)

@api_bp.route('/analytics/subjects')
@login_required
def subject_analytics():
    """Get comprehensive subject-wise analytics"""
    
    subjects = Subject.query.all()
    subject_stats = {}
    
    for subject in subjects:
        # Calculate metrics for each subject
        total_students = sum(len(c.students) for c in subject.classrooms)
        total_teachers = len(subject.teachers)
        
        # Calculate average attendance for classes taking this subject
        attendance_rates = []
        for classroom in subject.classrooms:
            for student in classroom.students:
                records = Attendance.query.filter_by(student_id=student.id).all()
                if records:
                    present = len([r for r in records if r.present])
                    rate = (present / len(records) * 100) if records else 0
                    attendance_rates.append(rate)
        
        avg_attendance = (
            sum(attendance_rates) / len(attendance_rates)
            if attendance_rates else 0
        )
        
        subject_stats[subject.name] = {
            'total_students': total_students,
            'total_teachers': total_teachers,
            'classes': len(subject.classrooms),
            'average_attendance': avg_attendance,
            'student_teacher_ratio': (
                total_students / total_teachers if total_teachers > 0 else 0
            )
        }
    
    return jsonify({
        'subjects': subject_stats,
        'summary': {
            'total_subjects': len(subjects),
            'avg_class_size': (
                sum(s['total_students'] for s in subject_stats.values()) / 
                sum(s['classes'] for s in subject_stats.values())
                if subject_stats else 0
            )
        }
    })

@api_bp.route('/analytics/compare/<string:metric>')
@login_required
def comparative_analytics(metric):
    """Get comparative analytics between classes/grades
    metric: attendance, fees, class_size
    """
    classes = Classroom.query.all()
    comparison = defaultdict(dict)
    
    if metric == 'attendance':
        for classroom in classes:
            attendance_rates = []
            for student in classroom.students:
                records = Attendance.query.filter_by(student_id=student.id).all()
                if records:
                    present = len([r for r in records if r.present])
                    rate = (present / len(records) * 100) if records else 0
                    attendance_rates.append(rate)
            
            if attendance_rates:
                comparison[classroom.grade][classroom.name] = {
                    'average': sum(attendance_rates) / len(attendance_rates),
                    'min': min(attendance_rates),
                    'max': max(attendance_rates)
                }
    
    elif metric == 'fees':
        for classroom in classes:
            fee_collection = []
            for student in classroom.students:
                fees = Fee.query.filter_by(student_id=student.id).all()
                if fees:
                    total = sum(f.amount for f in fees)
                    paid = sum(f.amount for f in fees if f.paid)
                    rate = (paid / total * 100) if total > 0 else 0
                    fee_collection.append(rate)
            
            if fee_collection:
                comparison[classroom.grade][classroom.name] = {
                    'average': sum(fee_collection) / len(fee_collection),
                    'min': min(fee_collection),
                    'max': max(fee_collection)
                }
    
    elif metric == 'class_size':
        for classroom in classes:
            comparison[classroom.grade][classroom.name] = len(classroom.students)
    
    return jsonify({
        'comparison': dict(comparison),
        'summary': {
            'highest_grade': max(comparison.keys()),
            'lowest_grade': min(comparison.keys()),
            'total_classes': sum(len(classes) for classes in comparison.values())
        }
    })

@api_bp.route('/analytics/financial/forecast')
@login_required
def financial_forecast():
    """Generate financial forecasts based on historical data"""
    from datetime import datetime, timedelta
    
    # Analyze historical fee collection patterns
    fees = Fee.query.all()
    monthly_collections = defaultdict(float)
    
    for fee in fees:
        if fee.paid and fee.payment_date:
            month_key = fee.payment_date.strftime('%Y-%m')
            monthly_collections[month_key] += float(fee.amount)
    
    # Calculate trends
    collection_values = list(monthly_collections.values())
    if len(collection_values) >= 2:
        avg_monthly = sum(collection_values) / len(collection_values)
        trend = (collection_values[-1] - collection_values[0]) / len(collection_values)
    else:
        avg_monthly = 0
        trend = 0
    
    # Project next 6 months
    current_month = datetime.now()
    forecast = {}
    
    for i in range(6):
        month = current_month + timedelta(days=30*i)
        month_key = month.strftime('%Y-%m')
        projected_amount = avg_monthly + (trend * i)
        forecast[month_key] = max(0, projected_amount)  # Ensure no negative projections
    
    # Calculate additional metrics
    total_pending = sum(float(f.amount) for f in fees if not f.paid)
    collection_rate = (
        sum(float(f.amount) for f in fees if f.paid) /
        sum(float(f.amount) for f in fees) * 100
        if fees else 0
    )
    
    return jsonify({
        'historical': dict(monthly_collections),
        'forecast': forecast,
        'metrics': {
            'average_monthly': avg_monthly,
            'trend': trend,
            'total_pending': total_pending,
            'collection_rate': collection_rate
        }
    })

@api_bp.route('/send_absent_notifications', methods=['POST'])
@login_required
def send_absent_notifications():
    from datetime import datetime

    from flask import request

    from routes.api_integrations import email_service, sms_service

    data = request.get_json()
    notification_type = data.get('type', 'students')  # 'students' or 'teachers'
    date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))

    try:
        date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format'}), 400

    sent_count = 0
    email_sent = 0
    sms_sent = 0

    def _send_email(to_email, subject, body, html_body=None):
        try:
            res = email_service.send_email(to_email, subject, body, html_body or f"<p>{body}</p>")
            return bool(res and res.get('success'))
        except Exception:
            return False

    def _send_sms(to_phone, message):
        try:
            res = sms_service.send_sms(to_phone, message)
            return bool(res and res.get('success'))
        except Exception:
            return False

    if notification_type == 'students':
        # Get absent students for the date
        attendances = Attendance.query.filter_by(date=date).all()
        present_student_ids = {a.student_id for a in attendances if a.present}
        all_students = Student.query.all()
        absent_students = [s for s in all_students if s.id not in present_student_ids]

        for student in absent_students:
            name = (_student_full_name(student) or 'Student').strip()
            student_msg = "You are absent today."
            parent_msg = "Your child is absent today."
            delivered = False
            parents = Parent.query.filter_by(student_id=student.id).all()

            # Email targets: student + parent(s)
            email_targets = set()
            if getattr(student, 'email', None):
                email_targets.add(student.email)
            if getattr(student, 'parent_email', None):
                email_targets.add(student.parent_email)
            for p in parents:
                if getattr(p, 'email', None):
                    email_targets.add(p.email)
            for addr in email_targets:
                msg = student_msg if addr == getattr(student, 'email', None) else parent_msg
                if _send_email(addr, "Absence Notification", msg):
                    email_sent += 1
                    delivered = True

            # Send SMS if available
            phone_targets = set()
            if getattr(student, 'phone', None):
                phone_targets.add(student.phone)
            if getattr(student, 'parent_phone', None):
                phone_targets.add(student.parent_phone)
            for p in parents:
                if getattr(p, 'phone', None):
                    phone_targets.add(p.phone)
            for raw in phone_targets:
                phone = raw
                if not phone.startswith('+'):
                    phone = '+91' + phone.lstrip('0')
                msg = student_msg if raw == getattr(student, 'phone', None) else parent_msg
                if _send_sms(phone, msg[:160]):
                    sms_sent += 1
                    delivered = True

            db_created = 0
            for p in parents:
                try:
                    notif = ParentNotification(
                        parent_id=p.id,
                        title="Absence Notification",
                        message=parent_msg,
                        type='attendance'
                    )
                    db.session.add(notif)
                    db_created += 1
                except Exception:
                    pass

            if delivered or db_created > 0:
                sent_count += 1
        try:
            db.session.commit()
        except Exception:
            pass

    elif notification_type == 'teachers':
        # For teachers, we might need teacher attendance, but assuming similar logic
        # Since teacher attendance might not be implemented, send to all teachers as example
        teachers = Teacher.query.all()
        for teacher in teachers:
            message = "Your child is absent today."
            delivered = False

            if teacher.email:
                if _send_email(teacher.email, "School Notification", message):
                    email_sent += 1
                    delivered = True

            if teacher.phone:
                phone = teacher.phone
                if not phone.startswith('+'):
                    phone = '+91' + phone.lstrip('0')
                if _send_sms(phone, message[:160]):
                    sms_sent += 1
                    delivered = True

            if delivered:
                sent_count += 1

    success = sent_count > 0
    msg = None
    if not success:
        msg = "No notifications delivered. Configure SMTP/Twilio and ensure contacts exist."
    return jsonify({'success': success, 'sent_count': sent_count, 'email_sent': email_sent, 'sms_sent': sms_sent, 'message': msg})
