from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from app import db
from models import DateSheet, DateSheetEntry, ExamResult, Subject, Classroom, User, Student
from utils import log_activity
from datetime import datetime, date, time

date_sheet_bp = Blueprint('date_sheet', __name__)

# Admin Date Sheet Management
@date_sheet_bp.route('/admin/date-sheet', methods=['GET', 'POST'])
@login_required
def admin_date_sheet():
    """Admin date sheet management"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        title = request.form.get('title')
        description = request.form.get('description')
        classroom_id = request.form.get('classroom_id')
        academic_year = request.form.get('academic_year')
        exam_type = request.form.get('exam_type')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        is_published = request.form.get('is_published') == 'on'
        
        if not all([title, academic_year, exam_type, start_date, end_date]):
            flash('Title, academic year, exam type, and dates are required.', 'danger')
            return render_template('date_sheet/admin_date_sheet.html')
        
        try:
            date_sheet = DateSheet(
                title=title,
                description=description,
                classroom_id=classroom_id if classroom_id else None,
                academic_year=academic_year,
                exam_type=exam_type,
                start_date=datetime.strptime(start_date, '%Y-%m-%d').date(),
                end_date=datetime.strptime(end_date, '%Y-%m-%d').date(),
                is_published=is_published,
                created_by_id=current_user.id
            )
            
            db.session.add(date_sheet)
            db.session.commit()
            
            log_activity('info', f'Date sheet created: {title}', user_id=current_user.id)
            flash('Date sheet created successfully!', 'success')
            return redirect(url_for('date_sheet.admin_date_sheet'))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating date sheet: {e}")
            flash('An error occurred. Please try again.', 'danger')
    
    # Get existing date sheets
    date_sheets = DateSheet.query.order_by(DateSheet.created_at.desc()).all()
    classrooms = Classroom.query.all()
    
    return render_template('date_sheet/admin_date_sheet.html', 
                         date_sheets=date_sheets,
                         classrooms=classrooms)

@date_sheet_bp.route('/admin/date-sheet/<int:date_sheet_id>/entries')
@login_required
def date_sheet_entries(date_sheet_id):
    """Manage date sheet entries"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet_id)\
                                .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
    
    subjects = Subject.query.all()
    classrooms = Classroom.query.all()
    
    return render_template('date_sheet/date_sheet_entries.html',
                         date_sheet=date_sheet,
                         entries=entries,
                         subjects=subjects,
                         classrooms=classrooms)

@date_sheet_bp.route('/admin/date-sheet/<int:date_sheet_id>/add-entry', methods=['POST'])
@login_required
def add_date_sheet_entry(date_sheet_id):
    """Add entry to date sheet"""
    if current_user.role not in ['admin', 'principal']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        entry = DateSheetEntry(
            date_sheet_id=date_sheet_id,
            exam_date=datetime.strptime(request.form.get('exam_date'), '%Y-%m-%d').date(),
            start_time=datetime.strptime(request.form.get('start_time'), '%H:%M').time(),
            end_time=datetime.strptime(request.form.get('end_time'), '%H:%M').time(),
            subject_id=int(request.form.get('subject_id')),
            classroom_id=int(request.form.get('classroom_id')) if request.form.get('classroom_id') else None,
            exam_duration=int(request.form.get('exam_duration')) if request.form.get('exam_duration') else None,
            max_marks=int(request.form.get('max_marks')) if request.form.get('max_marks') else None,
            exam_venue=request.form.get('exam_venue'),
            room_number=request.form.get('room_number'),
            section=request.form.get('section'),
            floor_number=request.form.get('floor_number'),
            building_name=request.form.get('building_name'),
            special_instructions=request.form.get('special_instructions')
        )
        
        db.session.add(entry)
        db.session.commit()
        
        log_activity('info', f'Date sheet entry added to {entry.date_sheet.title}', user_id=current_user.id)
        flash('Date sheet entry added successfully!', 'success')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding date sheet entry: {e}")
        flash('Error adding date sheet entry.', 'danger')
    
    return redirect(url_for('date_sheet.date_sheet_entries', date_sheet_id=date_sheet_id))

@date_sheet_bp.route('/admin/date-sheet/<int:date_sheet_id>/publish', methods=['POST'])
@login_required
def publish_date_sheet(date_sheet_id):
    """Publish date sheet to parents and students"""
    if current_user.role not in ['admin', 'principal']:
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('date_sheet.admin_date_sheet'))
    
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    date_sheet.is_published = True
    date_sheet.updated_at = datetime.utcnow()
    db.session.commit()
    
    log_activity('info', f'Date sheet published: {date_sheet.title}', user_id=current_user.id)
    flash('Date sheet published successfully! Parents and students can now view it.', 'success')
    
    return redirect(url_for('date_sheet.admin_date_sheet'))

# Teacher Date Sheet View
@date_sheet_bp.route('/teacher/date-sheet')
@login_required
def teacher_date_sheet():
    """Teacher's date sheet view"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all published date sheets
    date_sheets = DateSheet.query.filter_by(is_published=True)\
                               .order_by(DateSheet.start_date.desc()).all()
    
    # Filter date sheets relevant to teacher's classes
    teacher = current_user.teacher_profile
    relevant_date_sheets = []
    
    for date_sheet in date_sheets:
        # Check if any of teacher's classes are in the relevant date sheet
        if date_sheet.classroom_id:
            # Class-specific date sheet
            # Check if teacher teaches this class
            teacher_classes = [entry.classroom for entry in teacher.timetable_entries if entry.classroom]
            if date_sheet.classroom in teacher_classes:
                relevant_date_sheets.append(date_sheet)
        else:
            # General date sheet (all classes)
            # Add if teacher has any schedule entries
            if teacher.timetable_entries:
                relevant_date_sheets.append(date_sheet)
    
    return render_template('date_sheet/teacher_date_sheet.html',
                         date_sheets=relevant_date_sheets,
                         teacher=teacher)

@date_sheet_bp.route('/teacher/date-sheet/<int:date_sheet_id>/view')
@login_required
def view_teacher_date_sheet(date_sheet_id):
    """View specific date sheet for teacher"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('date_sheet.teacher_date_sheet'))
    
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    
    if not date_sheet.is_published:
        flash('This date sheet is not yet published.', 'warning')
        return redirect(url_for('date_sheet.teacher_date_sheet'))
    
    # Get entries for this date sheet
    entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet_id)\
                                .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
    
    # Filter entries relevant to teacher
    teacher = current_user.teacher_profile
    relevant_entries = []
    
    for entry in entries:
        # Check if teacher teaches this subject
        if entry.subject in teacher.subjects:
            # Check if it's for teacher's class or general
            if entry.classroom_id:
                # Check if teacher teaches this class
                teacher_classes = [e.classroom for e in teacher.timetable_entries if e.classroom]
                if entry.classroom in teacher_classes:
                    relevant_entries.append(entry)
            else:
                # General entry - add if teacher teaches this subject
                relevant_entries.append(entry)
    
    return render_template('date_sheet/view_teacher_date_sheet.html',
                         date_sheet=date_sheet,
                         entries=relevant_entries,
                         teacher=teacher)

@date_sheet_bp.route('/teacher/date-sheet/<int:date_sheet_id>/print')
@login_required
def print_teacher_date_sheet(date_sheet_id):
    """Printable version of teacher date sheet"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('date_sheet.teacher_date_sheet'))
    
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    
    if not date_sheet.is_published:
        flash('This date sheet is not yet published.', 'warning')
        return redirect(url_for('date_sheet.teacher_date_sheet'))
    
    # Get entries for this date sheet
    entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet_id)\
                                .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
    
    # Filter entries relevant to teacher
    teacher = current_user.teacher_profile
    relevant_entries = []
    
    for entry in entries:
        # Check if teacher teaches this subject
        if entry.subject in teacher.subjects:
            # Check if it's for teacher's class or general
            if entry.classroom_id:
                # Check if teacher teaches this class
                teacher_classes = [e.classroom for e in teacher.timetable_entries if e.classroom]
                if entry.classroom in teacher_classes:
                    relevant_entries.append(entry)
            else:
                # General entry - add if teacher teaches this subject
                relevant_entries.append(entry)
    
    return render_template('date_sheet/print_teacher_date_sheet.html',
                         date_sheet=date_sheet,
                         entries=relevant_entries,
                         teacher=teacher)

# Parent Date Sheet View
@date_sheet_bp.route('/parent/date-sheet')
@login_required
def parent_date_sheet():
    """Parent's date sheet view"""
    if current_user.role != 'parent':
        flash('This page is only accessible to parents.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all published date sheets
    date_sheets = DateSheet.query.filter_by(is_published=True)\
                               .order_by(DateSheet.start_date.desc()).all()
    
    # Filter date sheets relevant to parent's children
    relevant_date_sheets = []
    for date_sheet in date_sheets:
        # Check if any of parent's children are in the relevant class
        if date_sheet.classroom_id:
            # Class-specific date sheet
            for child in current_user.parent_profile.children:
                if child.classroom_id == date_sheet.classroom_id:
                    relevant_date_sheets.append(date_sheet)
                    break
        else:
            # General date sheet (all classes)
            relevant_date_sheets.append(date_sheet)
    
    return render_template('date_sheet/parent_date_sheet.html',
                         date_sheets=relevant_date_sheets)

@date_sheet_bp.route('/parent/date-sheet/<int:date_sheet_id>/view')
@login_required
def view_parent_date_sheet(date_sheet_id):
    """View specific date sheet for parent"""
    if current_user.role != 'parent':
        flash('This page is only accessible to parents.', 'error')
        return redirect(url_for('dashboard.index'))
    
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    
    if not date_sheet.is_published:
        flash('This date sheet is not yet published.', 'warning')
        return redirect(url_for('date_sheet.parent_date_sheet'))
    
    # Get entries for this date sheet
    entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet_id)\
                                .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
    
    # Filter entries relevant to parent's children
    relevant_entries = []
    for entry in entries:
        if entry.classroom_id:
            # Class-specific entry
            for child in current_user.parent_profile.children:
                if child.classroom_id == entry.classroom_id:
                    relevant_entries.append(entry)
                    break
        else:
            # General entry (all classes)
            relevant_entries.append(entry)
    
    return render_template('date_sheet/view_parent_date_sheet.html',
                         date_sheet=date_sheet,
                         entries=relevant_entries)

@date_sheet_bp.route('/parent/date-sheet/<int:date_sheet_id>/print')
@login_required
def print_parent_date_sheet(date_sheet_id):
    """Printable version of parent date sheet"""
    if current_user.role != 'parent':
        flash('This page is only accessible to parents.', 'error')
        return redirect(url_for('date_sheet.parent_date_sheet'))
    
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    
    if not date_sheet.is_published:
        flash('This date sheet is not yet published.', 'warning')
        return redirect(url_for('date_sheet.parent_date_sheet'))
    
    # Get entries for this date sheet
    entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet_id)\
                                .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
    
    # Filter entries relevant to parent's children
    relevant_entries = []
    for entry in entries:
        if entry.classroom_id:
            # Class-specific entry
            for child in current_user.parent_profile.children:
                if child.classroom_id == entry.classroom_id:
                    relevant_entries.append(entry)
                    break
        else:
            # General entry - add for all children
            for child in current_user.parent_profile.children:
                relevant_entries.append(entry)
    
    return render_template('date_sheet/print_parent_date_sheet.html',
                         date_sheet=date_sheet,
                         entries=relevant_entries)

# API Endpoints
@date_sheet_bp.route('/api/date-sheet/<int:date_sheet_id>/view')
@login_required
def view_date_sheet_api(date_sheet_id):
    """API to view date sheet data"""
    date_sheet = DateSheet.query.get_or_404(date_sheet_id)
    
    # Check permissions
    if current_user.role not in ['admin', 'principal'] and not date_sheet.is_published:
        return jsonify({'error': 'Unauthorized'}), 403
    
    entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet_id)\
                                .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
    
    # Organize entries by date
    entries_by_date = {}
    for entry in entries:
        date_str = entry.exam_date.strftime('%Y-%m-%d')
        if date_str not in entries_by_date:
            entries_by_date[date_str] = []
        entries_by_date[date_str].append({
            'id': entry.id,
            'subject': entry.subject.name,
            'classroom': entry.classroom.name if entry.classroom else 'All Classes',
            'start_time': entry.start_time.strftime('%H:%M'),
            'end_time': entry.end_time.strftime('%H:%M'),
            'duration': entry.exam_duration,
            'max_marks': entry.max_marks,
            'venue': entry.exam_venue or 'Not specified',
            'instructions': entry.special_instructions or ''
        })
    
    return jsonify({
        'date_sheet': {
            'id': date_sheet.id,
            'title': date_sheet.title,
            'description': date_sheet.description,
            'classroom': date_sheet.classroom.name if date_sheet.classroom else 'All Classes',
            'academic_year': date_sheet.academic_year,
            'exam_type': date_sheet.exam_type,
            'start_date': date_sheet.start_date.strftime('%d-%m-%Y'),
            'end_date': date_sheet.end_date.strftime('%d-%m-%Y'),
            'is_published': date_sheet.is_published
        },
        'entries': entries_by_date
    })

@date_sheet_bp.route('/api/parent/exam-schedule')
@login_required
def get_parent_exam_schedule():
    """API to get exam schedule for parent's children"""
    if current_user.role != 'parent':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get all published date sheets
    date_sheets = DateSheet.query.filter_by(is_published=True)\
                               .filter(DateSheet.end_date >= date.today())\
                               .order_by(DateSheet.start_date.asc()).all()
    
    exam_schedule = []
    for date_sheet in date_sheets:
        # Get entries for this date sheet
        entries = DateSheetEntry.query.filter_by(date_sheet_id=date_sheet.id)\
                                    .order_by(DateSheetEntry.exam_date, DateSheetEntry.start_time).all()
        
        for entry in entries:
            # Check if entry is relevant to parent's children
            if entry.classroom_id:
                for child in current_user.parent_profile.children:
                    if child.classroom_id == entry.classroom_id:
                        exam_schedule.append({
                            'date_sheet_title': date_sheet.title,
                            'exam_type': date_sheet.exam_type,
                            'exam_date': entry.exam_date.strftime('%d-%m-%Y'),
                            'subject': entry.subject.name,
                            'child_name': child.name,
                            'classroom': entry.classroom.name,
                            'start_time': entry.start_time.strftime('%H:%M'),
                            'end_time': entry.end_time.strftime('%H:%M'),
                            'venue': entry.exam_venue or 'Not specified',
                            'max_marks': entry.max_marks
                        })
                        break
            else:
                # General entry - add for all children
                for child in current_user.parent_profile.children:
                    exam_schedule.append({
                        'date_sheet_title': date_sheet.title,
                        'exam_type': date_sheet.exam_type,
                        'exam_date': entry.exam_date.strftime('%d-%m-%Y'),
                        'subject': entry.subject.name,
                        'child_name': child.name,
                        'classroom': child.classroom.name if child.classroom else 'Not assigned',
                        'start_time': entry.start_time.strftime('%H:%M'),
                        'end_time': entry.end_time.strftime('%H:%M'),
                        'venue': entry.exam_venue or 'Not specified',
                        'max_marks': entry.max_marks
                    })
    
    return jsonify({'exam_schedule': exam_schedule})
