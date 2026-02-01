from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Teacher, Subject, Classroom, User, TimeTable, TimeTableEntry, TeacherTimeTable, TeacherTimeTableEntry
from utils import log_activity
from datetime import datetime, time, date
import random

enhanced_timetable_bp = Blueprint('enhanced_timetable_v2', __name__)

@enhanced_timetable_bp.route('/')
@login_required
def enhanced_timetable_dashboard():
    """Main timetable dashboard with all classes"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all classes grouped by grade level
    classrooms = Classroom.query.filter_by(status='active').all()
    
    # Group classes by grade
    classes_by_grade = {}
    for classroom in classrooms:
        grade = classroom.grade or 'Unknown'
        if grade not in classes_by_grade:
            classes_by_grade[grade] = []
        classes_by_grade[grade].append(classroom)
    
    # Sort grades in proper order
    grade_order = ['Nursery', 'LKG', 'UKG'] + [str(i) for i in range(1, 13)]
    sorted_classes = {}
    for grade in grade_order:
        if grade in classes_by_grade:
            sorted_classes[grade] = classes_by_grade[grade]
    
    # Get existing timetables
    timetables = TimeTable.query.order_by(TimeTable.created_at.desc()).all()
    
    return render_template('enhanced_timetable/dashboard.html',
                         classes_by_grade=sorted_classes,
                         timetables=timetables)

@enhanced_timetable_bp.route('/create/<int:classroom_id>', methods=['GET', 'POST'])
@login_required
def create_class_timetable(classroom_id):
    """Create timetable for a specific class"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    classroom = Classroom.query.get_or_404(classroom_id)
    
    if request.method == 'POST':
        try:
            # Create main timetable
            timetable = TimeTable(
                name=f"{classroom.name} - {request.form.get('academic_year', '2024-2025')}",
                description=f"Timetable for {classroom.name}",
                classroom_id=classroom.id,
                academic_year=request.form.get('academic_year', '2024-2025'),
                is_published=request.form.get('is_published') == 'on',
                created_by_id=current_user.id
            )
            
            db.session.add(timetable)
            db.session.commit()
            
            log_activity('info', f'Timetable created for {classroom.name}', user_id=current_user.id)
            flash(f'Timetable created successfully for {classroom.name}!', 'success')
            return redirect(url_for('enhanced_timetable.view_class_timetable', timetable_id=timetable.id))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating timetable: {e}")
            flash('An error occurred while creating the timetable. Please try again.', 'danger')
    
    # Get teachers and subjects for the form
    teachers = Teacher.query.all()
    subjects = Subject.query.all()
    
    return render_template('enhanced_timetable/create_timetable.html',
                         classroom=classroom,
                         teachers=teachers,
                         subjects=subjects)

@enhanced_timetable_bp.route('/view/<int:timetable_id>')
@login_required
def view_class_timetable(timetable_id):
    """View timetable for a specific class"""
    timetable = TimeTable.query.get_or_404(timetable_id)
    
    # Get all entries organized by day and period
    entries = TimeTableEntry.query.filter_by(timetable_id=timetable_id)\
                                .order_by(TimeTableEntry.day_of_week, TimeTableEntry.period_number).all()
    
    # Organize entries into a grid
    timetable_grid = {}
    for entry in entries:
        day_key = entry.day_of_week
        if day_key not in timetable_grid:
            timetable_grid[day_key] = {}
        timetable_grid[day_key][entry.period_number] = entry
    
    return render_template('enhanced_timetable/view_timetable.html',
                         timetable=timetable,
                         timetable_grid=timetable_grid)

@enhanced_timetable_bp.route('/preview-timetables')
@login_required
def preview_all_timetables():
    """Preview all timetables for admin and teachers"""
    if current_user.role not in ['admin', 'principal', 'teacher']:
        flash('This page is only accessible to administrators and teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all timetables with their classroom information
    timetables = TimeTable.query.order_by(TimeTable.created_at.desc()).all()
    
    # Group timetables by grade
    timetables_by_grade = {}
    for timetable in timetables:
        if timetable.classroom:
            grade = timetable.classroom.grade or 'Unknown'
            if grade not in timetables_by_grade:
                timetables_by_grade[grade] = []
            timetables_by_grade[grade].append(timetable)
    
    # Sort grades in proper order
    grade_order = ['Nursery', 'LKG', 'UKG'] + [str(i) for i in range(1, 13)]
    sorted_timetables = {}
    for grade in grade_order:
        if grade in timetables_by_grade:
            sorted_timetables[grade] = timetables_by_grade[grade]
    
    return render_template('enhanced_timetable/preview_timetables.html',
                         timetables_by_grade=sorted_timetables,
                         all_timetables=timetables)

@enhanced_timetable_bp.route('/bulk-create', methods=['GET', 'POST'])
@login_required
def bulk_create_timetables():
    """Create timetables for multiple classes at once"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        selected_classes = request.form.getlist('selected_classes')
        academic_year = request.form.get('academic_year', '2024-2025')
        
        if not selected_classes:
            flash('Please select at least one class.', 'warning')
            return redirect(url_for('enhanced_timetable.bulk_create_timetables'))
        
        try:
            created_timetables = []
            
            for classroom_id in selected_classes:
                classroom = Classroom.query.get(classroom_id)
                if classroom:
                    # Create basic timetable (can be customized later)
                    timetable = TimeTable(
                        name=f"{classroom.name} - {academic_year}",
                        description=f"Auto-generated timetable for {classroom.name}",
                        classroom_id=classroom.id,
                        academic_year=academic_year,
                        is_published=False,  # Not published until customized
                        created_by_id=current_user.id
                    )
                    
                    db.session.add(timetable)
                    created_timetables.append(classroom.name)
            
            db.session.commit()
            
            log_activity('info', f'Bulk created {len(created_timetables)} timetables', user_id=current_user.id)
            flash(f'Successfully created timetables for: {", ".join(created_timetables)}', 'success')
            return redirect(url_for('enhanced_timetable.enhanced_timetable_dashboard'))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error in bulk timetable creation: {e}")
            flash('An error occurred while creating timetables. Please try again.', 'danger')
    
    # Get all active classes
    classrooms = Classroom.query.filter_by(status='active').all()
    
    return render_template('enhanced_timetable/bulk_create.html',
                         classrooms=classrooms)

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
    substitutions = TeacherTimeTableEntry.query.filter_by(date=today).all()
    
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
        TeacherTimeTableEntry.query.filter_by(teacher_id=teacher_id).delete()
        
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
                substitution = TeacherTimeTableEntry(
                    teacher_timetable_id=1,  # Default timetable ID
                    teacher_id=substitute_teacher.id,
                    original_teacher_id=teacher_id,
                    subject_id=entry.subject_id,
                    classroom_id=entry.classroom_id,
                    day_of_week=entry.day_of_week,
                    period_number=entry.period_number,
                    start_time=time(9, 0),  # Default time
                    end_time=time(9, 45),  # Default time
                    date=absent_date,
                    status='substitution',
                    substitution_reason=f'Substituting for {absent_teacher.name}'
                )
                
                db.session.add(substitution)
                
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
    substitution = TeacherTimeTableEntry.query\
        .filter(TeacherTimeTableEntry.teacher_id == teacher_id)\
        .filter(TeacherTimeTableEntry.day_of_week == day_of_week)\
        .filter(TeacherTimeTableEntry.period_number == period_number)\
        .filter(TeacherTimeTableEntry.date == check_date)\
        .filter(TeacherTimeTableEntry.status == 'substitution')\
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
    substitution_entries = TeacherTimeTableEntry.query\
        .filter(TeacherTimeTableEntry.teacher_id == teacher_id)\
        .filter(TeacherTimeTableEntry.date == today)\
        .filter(TeacherTimeTableEntry.status == 'substitution')\
        .all()
    
    # Get substitution entries (where this teacher is absent and someone else is substituting)
    absent_substitutions = TeacherTimeTableEntry.query\
        .filter(TeacherTimeTableEntry.original_teacher_id == teacher_id)\
        .filter(TeacherTimeTableEntry.date == today)\
        .filter(TeacherTimeTableEntry.status == 'substitution')\
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
