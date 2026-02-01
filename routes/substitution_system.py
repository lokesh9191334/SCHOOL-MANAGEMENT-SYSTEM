from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Teacher, Subject, Classroom, User, TimeTable, TimeTableEntry, TeacherTimeTable, TeacherTimeTableEntry
from utils import log_activity
from datetime import datetime, time, date
import random

enhanced_timetable_bp = Blueprint('enhanced_timetable_v2', __name__)

@enhanced_timetable_bp.route('/substitution-management')
@login_required
def substitution_management():
    """Manage teacher substitutions and automatic timetable adjustments"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all teachers
    teachers = Teacher.query.all()
    
    # Get today's date
    today = date.today()
    
    # Get absent teachers for today
    absent_teachers = Teacher.query.filter_by(is_absent=True).all()
    
    # Get substitution assignments for today
    substitutions = TeacherTimeTable.query.filter_by(date=today).all()
    
    return render_template('enhanced_timetable/substitution_management.html',
                         teachers=teachers,
                         absent_teachers=absent_teachers,
                         substitutions=substitutions,
                         today=today)

@enhanced_timetable_bp.route('/mark-absent', methods=['POST'])
@login_required
def mark_teacher_absent():
    """Mark a teacher as absent and find substitutions"""
    if current_user.role not in ['admin', 'principal']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    teacher_id = request.form.get('teacher_id')
    absent_date = request.form.get('absent_date')
    reason = request.form.get('reason', '')
    
    try:
        teacher = Teacher.query.get(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        # Mark teacher as absent
        teacher.is_absent = True
        teacher.absent_reason = reason
        teacher.absent_date = datetime.strptime(absent_date, '%Y-%m-%d').date()
        
        # Find and create substitutions
        substitutions = find_substitutions_for_teacher(teacher_id, absent_date)
        
        db.session.commit()
        
        log_activity('info', f'Teacher {teacher.name} marked absent and {len(substitutions)} substitutions created', 
                    user_id=current_user.id)
        
        return jsonify({
            'success': True,
            'message': f'Teacher marked as absent. {len(substitutions)} substitutions created.',
            'substitutions': substitutions
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error marking teacher absent: {e}")
        return jsonify({'error': 'An error occurred'}), 500

@enhanced_timetable_bp.route('/clear-absent', methods=['POST'])
@login_required
def clear_teacher_absent():
    """Clear teacher absent status and remove substitutions"""
    if current_user.role not in ['admin', 'principal']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    teacher_id = request.form.get('teacher_id')
    
    try:
        teacher = Teacher.query.get(teacher_id)
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        # Clear absent status
        teacher.is_absent = False
        teacher.absent_reason = None
        teacher.absent_date = None
        
        # Remove substitutions for this teacher
        TeacherTimeTable.query.filter_by(teacher_id=teacher_id).delete()
        
        db.session.commit()
        
        log_activity('info', f'Teacher {teacher.name} absent status cleared', user_id=current_user.id)
        
        return jsonify({
            'success': True,
            'message': 'Teacher absent status cleared successfully.'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error clearing teacher absent: {e}")
        return jsonify({'error': 'An error occurred'}), 500

def find_substitutions_for_teacher(teacher_id, absent_date):
    """Find suitable substitute teachers for absent teacher's periods"""
    absent_teacher = Teacher.query.get(teacher_id)
    if not absent_teacher:
        return []
    
    # Get all timetable entries for the absent teacher
    absent_entries = TimeTableEntry.query\
        .join(TimeTable)\
        .filter(TimeTableEntry.teacher_id == teacher_id)\
        .filter(TimeTable.is_published == True)\
        .all()
    
    substitutions = []
    
    for entry in absent_entries:
        # Find available teachers for this period and subject
        available_teachers = find_available_teachers(
            entry.subject_id, 
            entry.day_of_week, 
            entry.period_number,
            absent_date,
            exclude_teacher_id=teacher_id
        )
        
        if available_teachers:
            # Select the best available teacher
            substitute_teacher = select_best_substitute(available_teachers, entry)
            
            if substitute_teacher:
                # Create substitution record
                substitution = TeacherTimeTable(
                    teacher_id=substitute_teacher.id,
                    original_teacher_id=teacher_id,
                    subject_id=entry.subject_id,
                    classroom_id=entry.classroom_id,
                    day_of_week=entry.day_of_week,
                    period_number=entry.period_number,
                    date=absent_date,
                    status='active'
                )
                
                substitutions.append({
                    'original_teacher': absent_teacher.name,
                    'substitute_teacher': substitute_teacher.name,
                    'subject': entry.subject.name,
                    'classroom': entry.classroom.name if entry.classroom else 'General',
                    'day': entry.day_of_week,
                    'period': entry.period_number
                })
    
    return substitutions

def find_available_teachers(subject_id, day_of_week, period_number, absent_date, exclude_teacher_id):
    """Find teachers available for a specific period"""
    # Get teachers who can teach this subject
    subject_teachers = Teacher.query\
        .join(Subject, Teacher.subjects)\
        .filter(Subject.id == subject_id)\
        .filter(Teacher.id != exclude_teacher_id)\
        .filter(Teacher.is_active == True)\
        .all()
    
    available_teachers = []
    
    for teacher in subject_teachers:
        # Check if teacher is not absent
        if teacher.is_absent and teacher.absent_date == absent_date:
            continue
        
        # Check if teacher is free during this period
        is_free = is_teacher_free(teacher.id, day_of_week, period_number, absent_date)
        
        if is_free:
            available_teachers.append(teacher)
    
    return available_teachers

def is_teacher_free(teacher_id, day_of_week, period_number, check_date):
    """Check if a teacher is free during a specific period"""
    # Check if teacher has any timetable entry for this period
    existing_entry = TimeTableEntry.query\
        .join(TimeTable)\
        .filter(TimeTableEntry.teacher_id == teacher_id)\
        .filter(TimeTableEntry.day_of_week == day_of_week)\
        .filter(TimeTableEntry.period_number == period_number)\
        .filter(TimeTable.is_published == True)\
        .first()
    
    if existing_entry:
        return False
    
    # Check if teacher has any substitution for this period
    substitution = TeacherTimeTable.query\
        .filter(TeacherTimeTable.teacher_id == teacher_id)\
        .filter(TeacherTimeTable.day_of_week == day_of_week)\
        .filter(TeacherTimeTable.period_number == period_number)\
        .filter(TeacherTimeTable.date == check_date)\
        .filter(TeacherTimeTable.status == 'active')\
        .first()
    
    if substitution:
        return False
    
    return True

def select_best_substitute(available_teachers, entry):
    """Select the best substitute teacher from available options"""
    if not available_teachers:
        return None
    
    # Priority criteria:
    # 1. Teachers with fewer periods today
    # 2. Teachers who teach the same subject regularly
    # 3. Teachers with similar expertise
    
    # For now, select the first available teacher
    # In a real system, you might want more sophisticated logic
    return available_teachers[0]

@enhanced_timetable_bp.route('/get-substituted-timetable/<int:teacher_id>')
@login_required
def get_substituted_timetable(teacher_id):
    """Get timetable with substitutions applied for a specific teacher"""
    if current_user.role not in ['admin', 'principal', 'teacher']:
        flash('This page is only accessible to administrators and teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    teacher = Teacher.query.get_or_404(teacher_id)
    
    # Teachers can only view their own timetable unless admin
    if current_user.role == 'teacher' and current_user.id != teacher_id:
        flash('You can only view your own timetable.', 'error')
        return redirect(url_for('dashboard.index'))
    
    today = date.today()
    
    # Get regular timetable entries
    regular_entries = TimeTableEntry.query\
        .join(TimeTable)\
        .filter(TimeTableEntry.teacher_id == teacher_id)\
        .filter(TimeTable.is_published == True)\
        .order_by(TimeTableEntry.day_of_week, TimeTableEntry.period_number)\
        .all()
    
    # Get substitution entries (where this teacher is the substitute)
    substitution_entries = TeacherTimeTable.query\
        .filter(TeacherTimeTable.teacher_id == teacher_id)\
        .filter(TeacherTimeTable.date == today)\
        .filter(TeacherTimeTable.status == 'active')\
        .all()
    
    # Get substitution entries (where this teacher is absent and someone else is substituting)
    absent_substitutions = TeacherTimeTable.query\
        .filter(TeacherTimeTable.original_teacher_id == teacher_id)\
        .filter(TeacherTimeTable.date == today)\
        .filter(TeacherTimeTable.status == 'active')\
        .all()
    
    # Build timetable grid
    timetable_grid = {}
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    for day_idx, day in enumerate(days):
        timetable_grid[day_idx] = {}
        
        # Add regular entries
        for entry in regular_entries:
            if entry.day_of_week == day:
                # Check if this entry has a substitution
                substitution = next((s for s in absent_substitutions 
                                    if s.day_of_week == day and s.period_number == entry.period_number), None)
                
                if substitution:
                    # Show substitute teacher
                    substitute_teacher = Teacher.query.get(substitution.teacher_id)
                    timetable_grid[day_idx][entry.period_number] = {
                        'subject': entry.subject,
                        'classroom': entry.classroom,
                        'teacher': substitute_teacher,
                        'is_substitution': True,
                        'original_teacher': teacher,
                        'substitution_info': substitution
                    }
                else:
                    # Regular entry
                    timetable_grid[day_idx][entry.period_number] = {
                        'subject': entry.subject,
                        'classroom': entry.classroom,
                        'teacher': teacher,
                        'is_substitution': False
                    }
        
        # Add substitution entries (where this teacher is substituting for someone else)
        for substitution in substitution_entries:
            if substitution.day_of_week == day:
                original_teacher = Teacher.query.get(substitution.original_teacher_id)
                subject = Subject.query.get(substitution.subject_id)
                classroom = Classroom.query.get(substitution.classroom_id)
                
                timetable_grid[day_idx][substitution.period_number] = {
                    'subject': subject,
                    'classroom': classroom,
                    'teacher': teacher,
                    'is_substitution': True,
                    'original_teacher': original_teacher,
                    'substitution_info': substitution
                }
    
    return render_template('enhanced_timetable/substituted_timetable.html',
                         teacher=teacher,
                         timetable_grid=timetable_grid,
                         today=today,
                         regular_entries=regular_entries,
                         substitution_entries=substitution_entries,
                         absent_substitutions=absent_substitutions)
