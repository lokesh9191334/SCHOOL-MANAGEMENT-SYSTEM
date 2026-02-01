from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from models import db, Teacher, Subject, Classroom, User, TimeTable, TimeTableEntry, TeacherTimeTable, TeacherTimeTableEntry
from utils import log_activity
from datetime import datetime, time
from services.timetable_service import timetable_service

timetable_bp = Blueprint('timetable', __name__)

# Admin Timetable Management
@timetable_bp.route('/admin/timetable', methods=['GET', 'POST'])
@login_required
def admin_timetable():
    """Admin timetable management"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')
        classroom_id = request.form.get('classroom_id')
        academic_year = request.form.get('academic_year')
        semester = request.form.get('semester')
        is_published = request.form.get('is_published') == 'on'
        
        if not all([name, academic_year]):
            flash('Name and academic year are required.', 'danger')
            return render_template('timetable/admin_timetable.html')
        
        try:
            timetable = TimeTable(
                name=name,
                description=description,
                classroom_id=classroom_id if classroom_id else None,
                academic_year=academic_year,
                semester=semester,
                is_published=is_published,
                created_by_id=current_user.id
            )
            
            db.session.add(timetable)
            db.session.commit()
            
            log_activity('info', f'Timetable created: {name}', user_id=current_user.id)
            flash('Timetable created successfully!', 'success')
            return redirect(url_for('timetable.admin_timetable'))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating timetable: {e}")
            flash('An error occurred. Please try again.', 'danger')
    
    # Get existing timetables
    timetables = TimeTable.query.order_by(TimeTable.created_at.desc()).all()
    classrooms = Classroom.query.all()
    
    return render_template('timetable/admin_timetable.html', 
                         timetables=timetables,
                         classrooms=classrooms)

@timetable_bp.route('/admin/timetable/<int:timetable_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_timetable(timetable_id):
    """Edit existing timetable"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    timetable = TimeTable.query.get_or_404(timetable_id)
    
    if request.method == 'POST':
        timetable.name = request.form.get('name')
        timetable.description = request.form.get('description')
        timetable.classroom_id = request.form.get('classroom_id') if request.form.get('classroom_id') else None
        timetable.academic_year = request.form.get('academic_year')
        timetable.semester = request.form.get('semester')
        timetable.is_published = request.form.get('is_published') == 'on'
        timetable.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        log_activity('info', f'Timetable updated: {timetable.name}', user_id=current_user.id)
        flash('Timetable updated successfully!', 'success')
        return redirect(url_for('timetable.admin_timetable'))
    
    classrooms = Classroom.query.all()
    return render_template('timetable/edit_timetable.html', 
                         timetable=timetable,
                         classrooms=classrooms)

@timetable_bp.route('/admin/timetable/<int:timetable_id>/entries')
@login_required
def timetable_entries(timetable_id):
    """Manage timetable entries"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    timetable = TimeTable.query.get_or_404(timetable_id)
    entries = TimeTableEntry.query.filter_by(timetable_id=timetable_id)\
                                .order_by(TimeTableEntry.day_of_week, TimeTableEntry.period_number).all()
    
    teachers = Teacher.query.all()
    subjects = Subject.query.all()
    classrooms = Classroom.query.all()
    
    return render_template('timetable/timetable_entries.html',
                         timetable=timetable,
                         entries=entries,
                         teachers=teachers,
                         subjects=subjects,
                         classrooms=classrooms)

@timetable_bp.route('/admin/timetable/<int:timetable_id>/add-entry', methods=['POST'])
@login_required
def add_timetable_entry(timetable_id):
    """Add entry to timetable"""
    if current_user.role not in ['admin', 'principal']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        entry = TimeTableEntry(
            timetable_id=timetable_id,
            day_of_week=int(request.form.get('day_of_week')),
            period_number=int(request.form.get('period_number')),
            start_time=datetime.strptime(request.form.get('start_time'), '%H:%M').time(),
            end_time=datetime.strptime(request.form.get('end_time'), '%H:%M').time(),
            subject_id=int(request.form.get('subject_id')),
            teacher_id=int(request.form.get('teacher_id')),
            classroom_id=int(request.form.get('classroom_id')) if request.form.get('classroom_id') else None,
            room_number=request.form.get('room_number'),
            is_lab_period=request.form.get('is_lab_period') == 'on',
            is_break_period=request.form.get('is_break_period') == 'on',
            notes=request.form.get('notes')
        )
        
        db.session.add(entry)
        db.session.commit()
        
        log_activity('info', f'Timetable entry added to {entry.timetable.name}', user_id=current_user.id)
        flash('Timetable entry added successfully!', 'success')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding timetable entry: {e}")
        flash('Error adding timetable entry.', 'danger')
    
    return redirect(url_for('timetable.timetable_entries', timetable_id=timetable_id))

@timetable_bp.route('/admin/timetable/entry/<int:entry_id>/delete', methods=['POST'])
@login_required
def delete_timetable_entry(entry_id):
    """Delete timetable entry"""
    if current_user.role not in ['admin', 'principal']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    entry = TimeTableEntry.query.get_or_404(entry_id)
    timetable_id = entry.timetable_id
    
    db.session.delete(entry)
    db.session.commit()
    
    log_activity('info', f'Timetable entry deleted', user_id=current_user.id)
    flash('Timetable entry deleted successfully!', 'success')
    
    return redirect(url_for('timetable.timetable_entries', timetable_id=timetable_id))

@timetable_bp.route('/admin/timetable/<int:timetable_id>/publish', methods=['POST'])
@login_required
def publish_timetable(timetable_id):
    """Publish timetable to teachers"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('timetable.admin_timetable'))
    
    timetable = TimeTable.query.get_or_404(timetable_id)
    timetable.is_published = True
    timetable.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Create individual teacher timetables using timetable service
    try:
        success, message = timetable_service.create_teacher_timetable_from_main(timetable_id)
        
        if success:
            log_activity('info', f'Timetable published: {timetable.name}', user_id=current_user.id)
            flash('Timetable published successfully! Teachers can now view their timetables.', 'success')
        else:
            flash(f'Timetable published but teacher timetables creation failed: {message}', 'warning')
    except Exception as e:
        flash('Timetable published but teacher timetables creation failed.', 'warning')
        current_app.logger.error(f"Error creating teacher timetables: {e}")
    
    return redirect(url_for('timetable.admin_timetable'))

# Teacher Timetable View
@timetable_bp.route('/teacher/timetable')
@login_required
def teacher_timetable():
    """Teacher's personal timetable view"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    teacher = current_user.teacher_profile
    
    # Get teacher's timetable entries
    entries = TeacherTimeTableEntry.query.join(TeacherTimeTable)\
                                       .filter(TeacherTimeTable.teacher_id == teacher.id,
                                              TeacherTimeTable.is_active == True,
                                              TeacherTimeTableEntry.is_active == True)\
                                       .order_by(TeacherTimeTableEntry.day_of_week, 
                                               TeacherTimeTableEntry.period_number)\
                                       .all()
    
    # Organize entries by day
    timetable_by_day = {}
    for entry in entries:
        day_name = get_day_name(entry.day_of_week)
        if day_name not in timetable_by_day:
            timetable_by_day[day_name] = []
        timetable_by_day[day_name].append(entry)
    
    return render_template('timetable/teacher_timetable.html',
                         teacher=teacher,
                         timetable_by_day=timetable_by_day,
                         current_datetime=datetime.now())

@timetable_bp.route('/teacher/timetable/print')
@login_required
def print_teacher_timetable():
    """Printable version of teacher timetable"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    teacher = current_user.teacher_profile
    entries = TeacherTimeTableEntry.query.join(TeacherTimeTable)\
                                       .filter(TeacherTimeTable.teacher_id == teacher.id,
                                              TeacherTimeTable.is_active == True,
                                              TeacherTimeTableEntry.is_active == True)\
                                       .order_by(TeacherTimeTableEntry.day_of_week, 
                                               TeacherTimeTableEntry.period_number)\
                                       .all()
    
    # Organize entries by day
    timetable_by_day = {}
    for entry in entries:
        day_name = get_day_name(entry.day_of_week)
        if day_name not in timetable_by_day:
            timetable_by_day[day_name] = []
        timetable_by_day[day_name].append(entry)
    
    return render_template('timetable/print_teacher_timetable.html',
                         teacher=teacher,
                         timetable_by_day=timetable_by_day)

# API Endpoints
@timetable_bp.route('/api/timetable/<int:timetable_id>/view')
@login_required
def view_timetable_api(timetable_id):
    """API to view timetable data"""
    if current_user.role not in ['admin', 'principal']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    timetable = TimeTable.query.get_or_404(timetable_id)
    entries = TimeTableEntry.query.filter_by(timetable_id=timetable_id)\
                                .order_by(TimeTableEntry.day_of_week, TimeTableEntry.period_number).all()
    
    # Organize by day
    timetable_data = {}
    for entry in entries:
        day_name = get_day_name(entry.day_of_week)
        if day_name not in timetable_data:
            timetable_data[day_name] = []
        timetable_data[day_name].append({
            'period': entry.period_number,
            'start_time': entry.start_time.strftime('%H:%M'),
            'end_time': entry.end_time.strftime('%H:%M'),
            'subject': entry.subject.name,
            'teacher': entry.teacher.name,
            'classroom': entry.classroom.name if entry.classroom else 'N/A',
            'room_number': entry.room_number or 'N/A',
            'is_lab': entry.is_lab_period,
            'is_break': entry.is_break_period,
            'notes': entry.notes or ''
        })
    
    return jsonify({
        'timetable': {
            'id': timetable.id,
            'name': timetable.name,
            'description': timetable.description,
            'classroom': timetable.classroom.name if timetable.classroom else 'General',
            'academic_year': timetable.academic_year,
            'semester': timetable.semester,
            'is_published': timetable.is_published
        },
        'entries': timetable_data
    })

@timetable_bp.route('/api/teacher/<int:teacher_id>/timetable')
@login_required
def get_teacher_timetable_api(teacher_id):
    """API to get teacher's timetable"""
    if current_user.role not in ['admin', 'principal'] and \
       (current_user.role != 'teacher' or current_user.teacher_profile.id != teacher_id):
        return jsonify({'error': 'Unauthorized'}), 403
    
    entries = TeacherTimeTableEntry.query.join(TeacherTimeTable)\
                                       .filter(TeacherTimeTable.teacher_id == teacher_id,
                                              TeacherTimeTable.is_active == True,
                                              TeacherTimeTableEntry.is_active == True)\
                                       .order_by(TeacherTimeTableEntry.day_of_week, 
                                               TeacherTimeTableEntry.period_number)\
                                       .all()
    
    # Organize by day
    timetable_data = {}
    for entry in entries:
        day_name = get_day_name(entry.day_of_week)
        if day_name not in timetable_data:
            timetable_data[day_name] = []
        timetable_data[day_name].append({
            'period': entry.period_number,
            'start_time': entry.start_time.strftime('%H:%M'),
            'end_time': entry.end_time.strftime('%H:%M'),
            'subject': entry.subject.name,
            'classroom': entry.classroom.name if entry.classroom else 'N/A',
            'room_number': entry.room_number or 'N/A',
            'is_lab': entry.is_lab_period,
            'is_break': entry.is_break_period,
            'notes': entry.notes or ''
        })
    
    return jsonify({'timetable': timetable_data})

# Helper functions
def get_day_name(day_number):
    """Convert day number to day name"""
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[day_number] if 0 <= day_number <= 6 else 'Unknown'

def create_teacher_timetables(timetable):
    """Create individual teacher timetables from main timetable"""
    try:
        # Get all unique teachers in this timetable
        entries = TimeTableEntry.query.filter_by(timetable_id=timetable.id).all()
        teacher_ids = set(entry.teacher_id for entry in entries)
        
        for teacher_id in teacher_ids:
            # Create or get teacher timetable
            teacher_tt = TeacherTimeTable.query.filter_by(
                teacher_id=teacher_id,
                academic_year=timetable.academic_year,
                semester=timetable.semester
            ).first()
            
            if not teacher_tt:
                teacher_tt = TeacherTimeTable(
                    teacher_id=teacher_id,
                    academic_year=timetable.academic_year,
                    semester=timetable.semester
                )
                db.session.add(teacher_tt)
                db.session.flush()  # Get the ID
            
            # Delete existing entries for this teacher timetable
            TeacherTimeTableEntry.query.filter_by(teacher_timetable_id=teacher_tt.id).delete()
            
            # Add entries for this teacher
            teacher_entries = [e for e in entries if e.teacher_id == teacher_id]
            for entry in teacher_entries:
                teacher_entry = TeacherTimeTableEntry(
                    teacher_timetable_id=teacher_tt.id,
                    day_of_week=entry.day_of_week,
                    period_number=entry.period_number,
                    start_time=entry.start_time,
                    end_time=entry.end_time,
                    subject_id=entry.subject_id,
                    classroom_id=entry.classroom_id,
                    room_number=entry.room_number,
                    is_lab_period=entry.is_lab_period,
                    is_break_period=entry.is_break_period,
                    notes=entry.notes
                )
                db.session.add(teacher_entry)
        
        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating teacher timetables: {e}")
        raise
