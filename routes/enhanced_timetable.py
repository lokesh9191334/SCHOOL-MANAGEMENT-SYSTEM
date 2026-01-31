from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from models import Teacher, Subject, Classroom, User, TimeTable, TimeTableEntry, TeacherTimeTable, TeacherTimeTableEntry
from utils import log_activity
from datetime import datetime, time
# from services.timetable_service import timetable_service

enhanced_timetable_bp = Blueprint('enhanced_timetable', __name__)

# Standard period timings for different school levels
PERIOD_SCHEDULES = {
    'pre_primary': {
        'periods': 6,
        'start_time': '09:00',
        'end_time': '12:30',
        'period_duration': 30,  # minutes
        'break_duration': 15,
        'periods': [
            {'number': 1, 'start': '09:00', 'end': '09:30', 'subject': 'Assembly/Prayer'},
            {'number': 2, 'start': '09:30', 'end': '10:00', 'subject': 'English'},
            {'number': 3, 'start': '10:00', 'end': '10:30', 'subject': 'Mathematics'},
            {'number': 4, 'start': '10:30', 'end': '11:00', 'subject': 'Break'},
            {'number': 5, 'start': '11:00', 'end': '11:30', 'subject': 'Hindi'},
            {'number': 6, 'start': '11:30', 'end': '12:00', 'subject': 'Activity'},
            {'number': 7, 'start': '12:00', 'end': '12:30', 'subject': 'Story Time'},
        ]
    },
    'primary': {
        'periods': 8,
        'start_time': '08:00',
        'end_time': '13:30',
        'period_duration': 40,
        'break_duration': 15,
        'periods': [
            {'number': 1, 'start': '08:00', 'end': '08:40', 'subject': 'Assembly'},
            {'number': 2, 'start': '08:40', 'end': '09:20', 'subject': 'English'},
            {'number': 3, 'start': '09:20', 'end': '10:00', 'subject': 'Mathematics'},
            {'number': 4, 'start': '10:00', 'end': '10:40', 'subject': 'Break'},
            {'number': 5, 'start': '10:40', 'end': '11:20', 'subject': 'Science'},
            {'number': 6, 'start': '11:20', 'end': '12:00', 'subject': 'Social Studies'},
            {'number': 7, 'start': '12:00', 'end': '12:40', 'subject': 'Hindi'},
            {'number': 8, 'start': '12:40', 'end': '13:20', 'subject': 'Activity'},
        ]
    },
    'middle': {
        'periods': 8,
        'start_time': '08:00',
        'end_time': '14:30',
        'period_duration': 45,
        'break_duration': 15,
        'lunch_duration': 30,
        'periods': [
            {'number': 1, 'start': '08:00', 'end': '08:45', 'subject': 'Assembly'},
            {'number': 2, 'start': '08:45', 'end': '09:30', 'subject': 'English'},
            {'number': 3, 'start': '09:30', 'end': '10:15', 'subject': 'Mathematics'},
            {'number': 4, 'start': '10:15', 'end': '10:30', 'subject': 'Short Break'},
            {'number': 5, 'start': '10:30', 'end': '11:15', 'subject': 'Physics'},
            {'number': 6, 'start': '11:15', 'end': '12:00', 'subject': 'Chemistry'},
            {'number': 7, 'start': '12:00', 'end': '12:30', 'subject': 'Lunch Break'},
            {'number': 8, 'start': '12:30', 'end': '13:15', 'subject': 'Biology'},
            {'number': 9, 'start': '13:15', 'end': '14:00', 'subject': 'Social Studies'},
        ]
    },
    'secondary': {
        'periods': 9,
        'start_time': '07:30',
        'end_time': '15:00',
        'period_duration': 45,
        'break_duration': 15,
        'lunch_duration': 30,
        'periods': [
            {'number': 1, 'start': '07:30', 'end': '08:15', 'subject': 'Assembly'},
            {'number': 2, 'start': '08:15', 'end': '09:00', 'subject': 'English'},
            {'number': 3, 'start': '09:00', 'end': '09:45', 'subject': 'Mathematics'},
            {'number': 4, 'start': '09:45', 'end': '10:00', 'subject': 'Short Break'},
            {'number': 5, 'start': '10:00', 'end': '10:45', 'subject': 'Physics'},
            {'number': 6, 'start': '10:45', 'end': '11:30', 'subject': 'Chemistry'},
            {'number': 7, 'start': '11:30', 'end': '12:15', 'subject': 'Biology/Computer Science'},
            {'number': 8, 'start': '12:15', 'end': '12:45', 'subject': 'Lunch Break'},
            {'number': 9, 'start': '12:45', 'end': '13:30', 'subject': 'Social Studies'},
            {'number': 10, 'start': '13:30', 'end': '14:15', 'subject': 'Hindi/Sanskrit'},
            {'number': 11, 'start': '14:15', 'end': '15:00', 'subject': 'Physical Education'},
        ]
    }
}

def get_school_level(grade):
    """Determine school level based on grade"""
    if grade in ['Nursery', 'LKG', 'UKG']:
        return 'pre_primary'
    elif grade in ['1', '2', '3', '4', '5']:
        return 'primary'
    elif grade in ['6', '7', '8']:
        return 'middle'
    else:
        return 'secondary'

@enhanced_timetable_bp.route('/enhanced-timetable')
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

@enhanced_timetable_bp.route('/enhanced-timetable/create/<int:classroom_id>', methods=['GET', 'POST'])
@login_required
def create_class_timetable(classroom_id):
    """Create timetable for a specific class"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    classroom = Classroom.query.get_or_404(classroom_id)
    school_level = get_school_level(classroom.grade)
    period_schedule = PERIOD_SCHEDULES[school_level]
    
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
            db.session.flush()  # Get timetable ID
            
            # Create timetable entries for each day and period
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            
            for day_idx, day in enumerate(days):
                for period in period_schedule['periods']:
                    # Skip break periods
                    if 'Break' in period['subject']:
                        continue
                    
                    subject_name = request.form.get(f'subject_{day_idx}_{period["number"]}')
                    teacher_id = request.form.get(f'teacher_{day_idx}_{period["number"]}')
                    room_number = request.form.get(f'room_{day_idx}_{period["number"]}')
                    
                    if subject_name and teacher_id:
                        # Find subject by name
                        subject = Subject.query.filter_by(name=subject_name).first()
                        if subject:
                            entry = TimeTableEntry(
                                timetable_id=timetable.id,
                                day_of_week=day_idx,
                                period_number=period['number'],
                                start_time=datetime.strptime(period['start'], '%H:%M').time(),
                                end_time=datetime.strptime(period['end'], '%H:%M').time(),
                                subject_id=subject.id,
                                teacher_id=int(teacher_id),
                                classroom_id=classroom.id,
                                room_number=room_number,
                                is_lab_period='Lab' in room_number if room_number else False,
                                is_break_period='Break' in period['subject'],
                                notes=f"Auto-generated for {classroom.name}"
                            )
                            db.session.add(entry)
            
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
                         period_schedule=period_schedule,
                         teachers=teachers,
                         subjects=subjects)

@enhanced_timetable_bp.route('/enhanced-timetable/view/<int:timetable_id>')
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

@enhanced_timetable_bp.route('/enhanced-timetable/teacher/<int:teacher_id>')
@login_required
def view_teacher_timetable(teacher_id):
    """View timetable for a specific teacher"""
    teacher = Teacher.query.get_or_404(teacher_id)
    
    # Get all entries for this teacher
    entries = TimeTableEntry.query.filter_by(teacher_id=teacher_id)\
                                .join(TimeTable)\
                                .filter(TimeTable.is_active == True)\
                                .order_by(TimeTableEntry.day_of_week, TimeTableEntry.period_number).all()
    
    # Organize entries into a grid
    timetable_grid = {}
    for entry in entries:
        day_key = entry.day_of_week
        if day_key not in timetable_grid:
            timetable_grid[day_key] = {}
        timetable_grid[day_key][entry.period_number] = entry
    
    return render_template('enhanced_timetable/teacher_timetable.html',
                         teacher=teacher,
                         timetable_grid=timetable_grid)

@enhanced_timetable_bp.route('/enhanced-timetable/bulk-create', methods=['GET', 'POST'])
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

@enhanced_timetable_bp.route('/enhanced-timetable/api/teachers/<subject_name>')
@login_required
def get_teachers_for_subject(subject_name):
    """Get teachers who can teach a specific subject"""
    try:
        subject = Subject.query.filter_by(name=subject_name).first()
        if not subject:
            return jsonify({'teachers': []})
        
        # Get teachers associated with this subject
        teachers = Teacher.query.filter(Teacher.subjects.any(id=subject.id)).all()
        
        teacher_list = [{'id': t.id, 'name': t.name} for t in teachers]
        return jsonify({'teachers': teacher_list})
        
    except Exception as e:
        current_app.logger.error(f"Error getting teachers for subject: {e}")
        return jsonify({'error': 'Failed to get teachers'}), 500

@enhanced_timetable_bp.route('/enhanced-timetable/api/class-subjects/<int:classroom_id>')
@login_required
def get_subjects_for_class(classroom_id):
    """Get subjects applicable for a specific class"""
    try:
        classroom = Classroom.query.get_or_404(classroom_id)
        grade = classroom.grade
        school_level = get_school_level(grade)
        
        # Define subjects based on school level
        if school_level == 'pre_primary':
            subject_names = ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 
                            'Art & Craft', 'Physical Education', 'Music', 'Story Time']
        elif school_level == 'primary':
            subject_names = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies',
                            'Computer Science', 'Art & Craft', 'Physical Education', 
                            'Moral Science', 'General Knowledge']
        elif school_level == 'middle':
            subject_names = ['English', 'Hindi', 'Sanskrit', 'Mathematics', 'Physics', 
                            'Chemistry', 'Biology', 'History', 'Geography', 'Civics',
                            'Computer Science', 'Art & Craft', 'Physical Education', 'Music']
        else:  # secondary
            subject_names = ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 
                            'Biology', 'History', 'Geography', 'Economics', 'Political Science',
                            'Computer Science', 'Physical Education']
        
        subjects = Subject.query.filter(Subject.name.in_(subject_names)).all()
        subject_list = [{'id': s.id, 'name': s.name} for s in subjects]
        
        return jsonify({'subjects': subject_list})
        
    except Exception as e:
        current_app.logger.error(f"Error getting subjects for class: {e}")
        return jsonify({'error': 'Failed to get subjects'}), 500
