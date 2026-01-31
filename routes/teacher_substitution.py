from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from app import db
from models import Teacher, Subject, Classroom, User, TeacherSubstitution, TeacherSchedule, TeacherLeave, AutoLeaveApproval, LeaveApprovalLog
from utils import log_activity
from datetime import datetime, date, time, timedelta
from sqlalchemy import and_, or_
from services.auto_approval_service import auto_approval_service
from services.timetable_service import timetable_service

teacher_substitution_bp = Blueprint('teacher_substitution', __name__)

@teacher_substitution_bp.route('/teacher-substitution', methods=['GET', 'POST'])
@login_required
def teacher_substitution():
    """Main teacher substitution management page"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        # Handle substitution creation
        original_teacher_id = request.form.get('original_teacher_id')
        substitute_teacher_id = request.form.get('substitute_teacher_id')
        subject_id = request.form.get('subject_id')
        classroom_id = request.form.get('classroom_id')
        substitution_date = request.form.get('date')
        start_time = request.form.get('start_time')
        end_time = request.form.get('end_time')
        period_number = request.form.get('period_number')
        reason = request.form.get('reason')
        absence_reason = request.form.get('absence_reason')
        
        # Validate inputs
        if not all([original_teacher_id, substitute_teacher_id, subject_id, classroom_id, 
                   substitution_date, start_time, end_time, period_number]):
            flash('All fields are required.', 'danger')
            return render_template('teacher_substitution/index.html')
        
        try:
            # Create substitution
            substitution = TeacherSubstitution(
                original_teacher_id=original_teacher_id,
                substitute_teacher_id=substitute_teacher_id,
                subject_id=subject_id,
                classroom_id=classroom_id,
                date=datetime.strptime(substitution_date, '%Y-%m-%d').date(),
                start_time=datetime.strptime(start_time, '%H:%M').time(),
                end_time=datetime.strptime(end_time, '%H:%M').time(),
                period_number=int(period_number),
                reason=reason,
                absence_reason=absence_reason,
                created_by_id=current_user.id
            )
            
            db.session.add(substitution)
            db.session.commit()
            
            # Send notification to substitute teacher
            send_substitution_notification(substitution)
            
            log_activity('info', f'Teacher substitution created: {substitution.original_teacher.name} -> {substitution.substitute_teacher.name}', 
                        user_id=current_user.id)
            
            flash('Substitution created successfully! Notification sent to substitute teacher.', 'success')
            return redirect(url_for('teacher_substitution.teacher_substitution'))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating substitution: {e}")
            flash('An error occurred. Please try again.', 'danger')
    
    # Get data for form
    teachers = Teacher.query.all()
    subjects = Subject.query.all()
    classrooms = Classroom.query.all()
    
    # Get existing substitutions
    substitutions = TeacherSubstitution.query.order_by(TeacherSubstitution.date.desc()).all()
    
    return render_template('teacher_substitution/index.html', 
                         teachers=teachers, 
                         subjects=subjects, 
                         classrooms=classrooms,
                         substitutions=substitutions)

@teacher_substitution_bp.route('/teacher-substitution/<int:substitution_id>/accept', methods=['POST'])
@login_required
def accept_substitution(substitution_id):
    """Accept a substitution"""
    substitution = TeacherSubstitution.query.get_or_404(substitution_id)
    
    # Check if current user is the substitute teacher
    if current_user.role != 'teacher' or current_user.teacher_profile.id != substitution.substitute_teacher_id:
        flash('You are not authorized to accept this substitution.', 'error')
        return redirect(url_for('dashboard.index'))
    
    substitution.status = 'accepted'
    substitution.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Send notification to original teacher and admin
    send_acceptance_notification(substitution)
    
    log_activity('info', f'Substitution accepted by {substitution.substitute_teacher.name}', 
                user_id=current_user.id)
    
    flash('Substitution accepted successfully!', 'success')
    return redirect(url_for('teacher_substitution.my_substitutions'))

@teacher_substitution_bp.route('/teacher-substitution/<int:substitution_id>/reject', methods=['POST'])
@login_required
def reject_substitution(substitution_id):
    """Reject a substitution"""
    substitution = TeacherSubstitution.query.get_or_404(substitution_id)
    
    # Check if current user is the substitute teacher
    if current_user.role != 'teacher' or current_user.teacher_profile.id != substitution.substitute_teacher_id:
        flash('You are not authorized to reject this substitution.', 'error')
        return redirect(url_for('dashboard.index'))
    
    substitution.status = 'rejected'
    substitution.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Send notification to admin
    send_rejection_notification(substitution)
    
    log_activity('info', f'Substitution rejected by {substitution.substitute_teacher.name}', 
                user_id=current_user.id)
    
    flash('Substitution rejected.', 'warning')
    return redirect(url_for('teacher_substitution.my_substitutions'))

@teacher_substitution_bp.route('/my-substitutions')
@login_required
def my_substitutions():
    """Show substitutions for current teacher"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get substitutions where current teacher is either original or substitute
    teacher_id = current_user.teacher_profile.id
    substitutions = TeacherSubstitution.query.filter(
        or_(TeacherSubstitution.original_teacher_id == teacher_id,
             TeacherSubstitution.substitute_teacher_id == teacher_id)
    ).order_by(TeacherSubstitution.date.desc()).all()
    
    return render_template('teacher_substitution/my_substitutions.html', 
                         substitutions=substitutions)

@teacher_substitution_bp.route('/teacher-leave', methods=['GET', 'POST'])
@login_required
def teacher_leave():
    """Teacher leave application"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        leave_type = request.form.get('leave_type')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        start_time = request.form.get('start_time')
        end_time = request.form.get('end_time')
        reason = request.form.get('reason')
        
        # Validate inputs
        if not all([leave_type, start_date, end_date]):
            flash('Leave type, start date, and end date are required.', 'danger')
            return render_template('teacher_substitution/leave.html')
        
        try:
            # Create leave application
            leave = TeacherLeave(
                teacher_id=current_user.teacher_profile.id,
                leave_type=leave_type,
                start_date=datetime.strptime(start_date, '%Y-%m-%d').date(),
                end_date=datetime.strptime(end_date, '%Y-%m-%d').date(),
                start_time=datetime.strptime(start_time, '%H:%M').time() if start_time else None,
                end_time=datetime.strptime(end_time, '%H:%M').time() if end_time else None,
                reason=reason
            )
            
            db.session.add(leave)
            db.session.commit()
            
            # Create approval log
            approval_log = LeaveApprovalLog(
                leave_id=leave.id,
                approval_type='auto',
                submitted_at=leave.created_at,
                status='pending',
                notes='Leave application submitted, awaiting approval'
            )
            db.session.add(approval_log)
            db.session.commit()
            
            # Check auto-approval time
            time_info = auto_approval_service.check_pending_approval_time(leave.id)
            
            # Send notification to admin
            send_leave_notification(leave)
            
            # Show auto-approval info to teacher
            if time_info and time_info['status'] == 'pending':
                flash(f'Leave application submitted successfully! Note: This leave will be automatically approved after {time_info["minutes"]} minutes if not reviewed by admin.', 'info')
            else:
                flash('Leave application submitted successfully!', 'success')
            
            log_activity('info', f'Leave application submitted by {leave.teacher.name}', 
                        user_id=current_user.id)
            
            return redirect(url_for('teacher_substitution.my_leave'))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating leave application: {e}")
            flash('An error occurred. Please try again.', 'danger')
    
    return render_template('teacher_substitution/leave.html')

@teacher_substitution_bp.route('/my-leave')
@login_required
def my_leave():
    """Show leave applications for current teacher"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    leaves = TeacherLeave.query.filter_by(teacher_id=current_user.teacher_profile.id)\
                               .order_by(TeacherLeave.created_at.desc()).all()
    
    return render_template('teacher_substitution/my_leave.html', leaves=leaves)

@teacher_substitution_bp.route('/admin/leave-management')
@login_required
def leave_management():
    """Admin leave management"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    leaves = TeacherLeave.query.order_by(TeacherLeave.created_at.desc()).all()
    
    return render_template('teacher_substitution/leave_management.html', leaves=leaves)

@teacher_substitution_bp.route('/admin/leave/<int:leave_id>/approve', methods=['POST'])
@login_required
def approve_leave(leave_id):
    """Approve a leave application"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    leave = TeacherLeave.query.get_or_404(leave_id)
    leave.status = 'approved'
    leave.approved_by_id = current_user.id
    leave.approved_at = datetime.utcnow()
    
    db.session.commit()
    
    # Create automatic substitutions for approved leave using timetable service
    try:
        result = timetable_service.handle_teacher_absence(leave.teacher_id, leave.start_date, leave.end_date)
        
        if result['success']:
            flash(f'Leave approved successfully! {len(result["created_substitutions"])} automatic substitutions created.', 'success')
        else:
            flash('Leave approved but some substitutions could not be created automatically.', 'warning')
            if result.get('errors'):
                for error in result['errors'][:3]:  # Show first 3 errors
                    flash(f'Error: {error}', 'warning')
    except Exception as e:
        flash('Leave approved but automatic substitution creation failed.', 'warning')
        current_app.logger.error(f"Error creating automatic substitutions: {e}")
    
    # Send notification to teacher
    send_leave_approval_notification(leave)
    
    log_activity('info', f'Leave approved for {leave.teacher.name}', user_id=current_user.id)
    
    return redirect(url_for('teacher_substitution.leave_management'))

@teacher_substitution_bp.route('/admin/leave/<int:leave_id>/reject', methods=['POST'])
@login_required
def reject_leave(leave_id):
    """Reject a leave application"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    leave = TeacherLeave.query.get_or_404(leave_id)
    leave.status = 'rejected'
    
    # Update approval log
    approval_log = LeaveApprovalLog.query.filter_by(leave_id=leave_id).first()
    if approval_log:
        approval_log.status = 'rejected'
        approval_log.actual_approval_time = datetime.utcnow()
        approval_log.approved_by_id = current_user.id
        approval_log.approval_type = 'manual'
        approval_log.notes = 'Rejected by administrator'
        db.session.commit()
    
    # Send notification to teacher
    send_leave_rejection_notification(leave)
    
    log_activity('info', f'Leave rejected for {leave.teacher.name}', user_id=current_user.id)
    
    flash('Leave rejected.', 'warning')
    return redirect(url_for('teacher_substitution.leave_management'))

@teacher_substitution_bp.route('/api/get-teacher-schedule/<int:teacher_id>')
@login_required
def get_teacher_schedule(teacher_id):
    """Get teacher schedule for a specific date"""
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date is required'}), 400
    
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        
        # Get teacher schedule for this day
        schedule = TeacherSchedule.query.filter_by(
            teacher_id=teacher_id,
            day_of_week=day_of_week,
            is_active=True
        ).order_by(TeacherSchedule.period_number).all()
        
        schedule_data = [s.to_dict() for s in schedule]
        return jsonify({'schedule': schedule_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teacher_substitution_bp.route('/api/find-available-teachers')
@login_required
def find_available_teachers():
    """Find available teachers for a specific time slot"""
    date_str = request.args.get('date')
    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    subject_id = request.args.get('subject_id')
    
    if not all([date_str, start_time, end_time]):
        return jsonify({'error': 'Date, start time, and end time are required'}), 400
    
    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        start_time_obj = datetime.strptime(start_time, '%H:%M').time()
        end_time_obj = datetime.strptime(end_time, '%H:%M').time()
        day_of_week = target_date.weekday()
        
        # Get subject
        subject = Subject.query.get(subject_id)
        if not subject:
            return jsonify({'error': 'Subject not found'}), 404
        
        # Find teachers who can teach this subject
        qualified_teachers = Teacher.query.filter(
            Teacher.subjects.contains(subject)
        ).all()
        
        available_teachers = []
        for teacher in qualified_teachers:
            # Check if teacher is available (no schedule conflict)
            is_available = check_teacher_availability(teacher.id, day_of_week, start_time_obj, end_time_obj)
            
            if is_available:
                available_teachers.append({
                    'id': teacher.id,
                    'name': teacher.name,
                    'subject': subject.name,
                    'experience': teacher.experience_years or 0
                })
        
        return jsonify({'available_teachers': available_teachers})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper functions
def send_substitution_notification(substitution):
    """Send notification to substitute teacher"""
    try:
        # This would integrate with your notification system
        # For now, we'll just mark as sent
        substitution.notification_sent = True
        substitution.notification_sent_at = datetime.utcnow()
        db.session.commit()
        
        # TODO: Integrate with email/SMS notification system
        current_app.logger.info(f"Notification sent to substitute teacher: {substitution.substitute_teacher.name}")
        
    except Exception as e:
        current_app.logger.error(f"Error sending substitution notification: {e}")

def send_acceptance_notification(substitution):
    """Send notification when substitution is accepted"""
    try:
        # TODO: Integrate with notification system
        current_app.logger.info(f"Substitution accepted by: {substitution.substitute_teacher.name}")
    except Exception as e:
        current_app.logger.error(f"Error sending acceptance notification: {e}")

def send_rejection_notification(substitution):
    """Send notification when substitution is rejected"""
    try:
        # TODO: Integrate with notification system
        current_app.logger.info(f"Substitution rejected by: {substitution.substitute_teacher.name}")
    except Exception as e:
        current_app.logger.error(f"Error sending rejection notification: {e}")

def send_leave_notification(leave):
    """Send notification to admin about leave application"""
    try:
        # TODO: Integrate with notification system
        current_app.logger.info(f"Leave application submitted by: {leave.teacher.name}")
    except Exception as e:
        current_app.logger.error(f"Error sending leave notification: {e}")

def send_leave_approval_notification(leave):
    """Send notification when leave is approved"""
    try:
        # TODO: Integrate with notification system
        current_app.logger.info(f"Leave approved for: {leave.teacher.name}")
    except Exception as e:
        current_app.logger.error(f"Error sending leave approval notification: {e}")

def send_leave_rejection_notification(leave):
    """Send notification when leave is rejected"""
    try:
        # TODO: Integrate with notification system
        current_app.logger.info(f"Leave rejected for: {leave.teacher.name}")
    except Exception as e:
        current_app.logger.error(f"Error sending leave rejection notification: {e}")

def check_teacher_availability(teacher_id, day_of_week, start_time, end_time):
    """Check if teacher is available for a specific time slot"""
    # Check if teacher has any schedule during this time
    conflicting_schedule = TeacherSchedule.query.filter(
        TeacherSchedule.teacher_id == teacher_id,
        TeacherSchedule.day_of_week == day_of_week,
        TeacherSchedule.is_active == True,
        or_(
            and_(TeacherSchedule.start_time <= start_time, TeacherSchedule.end_time > start_time),
            and_(TeacherSchedule.start_time < end_time, TeacherSchedule.end_time >= end_time),
            and_(TeacherSchedule.start_time >= start_time, TeacherSchedule.end_time <= end_time)
        )
    ).first()
    
    return conflicting_schedule is None

def create_automatic_substitutions(leave):
    """Create automatic substitutions for approved leave"""
    try:
        # Get teacher schedule for the leave period
        current_date = leave.start_date
        while current_date <= leave.end_date:
            day_of_week = current_date.weekday()
            
            # Get teacher's schedule for this day
            schedule = TeacherSchedule.query.filter_by(
                teacher_id=leave.teacher_id,
                day_of_week=day_of_week,
                is_active=True
            ).all()
            
            for period in schedule:
                # Find available substitute teacher
                available_teachers = find_available_substitutes(
                    period.subject_id, 
                    current_date, 
                    period.start_time, 
                    period.end_time
                )
                
                if available_teachers:
                    # Create substitution with first available teacher
                    substitution = TeacherSubstitution(
                        original_teacher_id=leave.teacher_id,
                        substitute_teacher_id=available_teachers[0].id,
                        subject_id=period.subject_id,
                        classroom_id=period.classroom_id,
                        date=current_date,
                        start_time=period.start_time,
                        end_time=period.end_time,
                        period_number=period.period_number,
                        reason=f"Automatic substitution for {leave.leave_type} leave",
                        absence_reason=leave.leave_type,
                        created_by_id=leave.teacher.user_id
                    )
                    
                    db.session.add(substitution)
                    send_substitution_notification(substitution)
            
            current_date += timedelta(days=1)
        
        leave.substitution_created = True
        db.session.commit()
        
    except Exception as e:
        current_app.logger.error(f"Error creating automatic substitutions: {e}")

def find_available_substitutes(subject_id, date, start_time, end_time):
    """Find available substitute teachers for a subject"""
    day_of_week = date.weekday()
    
    # Get teachers who can teach this subject
    subject = Subject.query.get(subject_id)
    if not subject:
        return []
    
    qualified_teachers = Teacher.query.filter(
        Teacher.subjects.contains(subject)
    ).all()
    
    available_teachers = []
    for teacher in qualified_teachers:
        if check_teacher_availability(teacher.id, day_of_week, start_time, end_time):
            available_teachers.append(teacher)
    
    return available_teachers
