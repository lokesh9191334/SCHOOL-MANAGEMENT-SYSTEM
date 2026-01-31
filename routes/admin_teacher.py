from flask import Blueprint, render_template, request, flash, redirect, url_for
from flask_login import login_required, current_user
from app import db
from utils import log_activity
from models import User, Teacher, School
from datetime import datetime

admin_teacher_bp = Blueprint('admin_teacher', __name__)

@admin_teacher_bp.route('/add-teacher', methods=['GET', 'POST'])
@login_required
def add_teacher():
    """Admin can add teachers with school ID"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    if request.method == 'POST':
        # Get form data
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        subject = request.form.get('subject', '').strip()
        class_teacher_of = request.form.get('class_teacher_of', '').strip()
        is_class_incharge = request.form.get('is_class_incharge') == 'on'
        
        # Validate form data
        if not all([name, email, phone, address, password, confirm_password]):
            flash('All fields are required.', 'danger')
            return render_template('admin/add_teacher.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('admin/add_teacher.html')
        
        if len(password) < 8:
            flash('Password must be at least 8 characters long.', 'danger')
            return render_template('admin/add_teacher.html')
        
        # Prevent duplicate teacher/user by email within the same school
        existing_user = User.query.filter_by(email=email, school_id=current_user.school_id).first()
        existing_teacher = Teacher.query.filter_by(email=email, school_id=current_user.school_id).first()
        if existing_user or existing_teacher:
            flash('A teacher with this email already exists for your school. Duplicate entries are not allowed.', 'danger')
            return render_template('admin/add_teacher.html')
        
        try:
            # Create teacher user with admin's school ID
            teacher_user = User(
                name=name,
                email=email,
                role='teacher',
                phone=phone,
                address=address,
                school_id=current_user.school_id  # Use admin's school ID
            )
            teacher_user.set_password(password)
            db.session.add(teacher_user)
            db.session.commit()
            
            # Generate a unique 5-digit secret key for this teacher
            import random
            from models import Teacher as TeacherModel
            max_tries = 50
            generated = None
            for _ in range(max_tries):
                candidate = f"{random.randint(10000, 99999)}"
                if not TeacherModel.query.filter_by(secret_key=candidate).first():
                    generated = candidate
                    break
            if not generated:
                flash('Unable to generate a unique secret key. Try again later.', 'danger')
                return render_template('admin/add_teacher.html')

            # Create teacher profile
            teacher_profile = Teacher(
                user=teacher_user,
                name=name,
                email=email,
                address=address,
                phone=phone,
                subject=subject,
                class_teacher_of=class_teacher_of,
                is_class_incharge=is_class_incharge,
                school_id=current_user.school_id,
                secret_key=generated
            )
            db.session.add(teacher_profile)
            db.session.commit()
            
            # Create success message with Class Incharge status
            success_msg = f'Teacher account created successfully! School ID: {current_user.school_id} | Secret Key: {generated}'
            if is_class_incharge:
                success_msg += ' | Teacher marked as Class Incharge ⭐'
            
            log_activity('info', f'Teacher {name} added by admin {current_user.name}', user_id=current_user.id)
            flash(success_msg, 'success')
            return redirect(url_for('dashboard.index'))
            
        except Exception as e:
            current_app.logger.error(f"Error creating teacher account: {e}")
            flash('An error occurred. Please try again.', 'danger')
            return render_template('admin/add_teacher.html')
    
    return render_template('admin/add_teacher.html', school_id=current_user.school_id)

@admin_teacher_bp.route('/teacher-credentials')
@login_required
def teacher_credentials():
    """Show list of teachers and their credentials for admin"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all teachers in the same school
    teachers = User.query.filter_by(role='teacher', school_id=current_user.school_id).all()
    
    return render_template('admin/teacher_credentials.html', teachers=teachers, school_id=current_user.school_id)
