import os
import uuid
from datetime import datetime

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
    jsonify
)
from flask_login import login_required
from werkzeug.utils import secure_filename

from models import Salary, Teacher, TeacherDocument, StudentLeave, db, Classroom, Subject, TeacherLeave
from flask_login import current_user
from utils import log_activity

teachers_bp = Blueprint('teachers', __name__, template_folder='../templates')


@teachers_bp.route('/portal')
@login_required
def portal():
    """Teacher portal dashboard"""
    # Basic stats placeholders for now
    my_classes = 0
    my_students = 0
    assignments = 0
    attendance_rate = 0

    if request.is_json or request.path.startswith('/api/'):
        teacher_profile = getattr(current_user, 'teacher_profile', None)
        return jsonify({
            'success': True,
            'data': {
                'my_classes': my_classes,
                'my_students': my_students,
                'assignments': assignments,
                'attendance_rate': attendance_rate,
                'is_class_incharge': teacher_profile.is_class_incharge if teacher_profile else False,
                'class_teacher_of': teacher_profile.class_teacher_of if teacher_profile else None,
                'user': {
                    'name': current_user.name,
                    'role': current_user.role,
                    'email': current_user.email
                }
            }
        })

    # If current user is mapped to a teacher, we could populate stats later
    return render_template(
        'teacher_dashboard.html',
        my_classes=my_classes,
        my_students=my_students,
        assignments=assignments,
        attendance_rate=attendance_rate,
    )


@teachers_bp.route('/', methods=['GET'])
def list_teachers():
    teachers = Teacher.query.all()
    return render_template('teachers/index.html', teachers=teachers)



@teachers_bp.route('/leave/new', methods=['GET', 'POST'])
@login_required
def new_leave():
    """Teacher submits a leave request. Admins can optionally submit for a teacher via form field 'teacher_id'."""
    # Determine teacher: prefer current_user mapping
    teacher = None
    if current_user and getattr(current_user, 'is_authenticated', False):
        teacher = Teacher.query.filter_by(user_id=current_user.id).first()

    if request.method == 'POST':
        teacher_id = request.form.get('teacher_id') or (teacher.id if teacher else None)
        if not teacher_id:
            flash('Teacher not found or not specified', 'error')
            return redirect(url_for('teachers.portal'))
        try:
            tid = int(teacher_id)
        except Exception:
            flash('Invalid teacher id', 'error')
            return redirect(url_for('teachers.portal'))

        t = Teacher.query.get(tid)
        if not t:
            flash('Teacher not found', 'error')
            return redirect(url_for('teachers.portal'))

        # Parse dates
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')

        # Structured reason fields from form
        reason_type = request.form.get('reason_type')
        days_raw = request.form.get('days') or None
        extra_note = request.form.get('note') or ''

        # Build human-readable reason text
        reason_label = ''
        if reason_type == 'urgent_home':
            reason_label = 'Urgent at home'
        elif reason_type == 'fever_night':
            reason_label = 'Fever at night'
        elif reason_type == 'urgent_many_days':
            try:
                days_int = int(days_raw) if days_raw else None
            except ValueError:
                days_int = None
            if days_int:
                reason_label = f'Urgent leave for {days_int} days'
            else:
                reason_label = 'Urgent leave for many days'
        else:
            reason_label = 'Leave request'

        if extra_note:
            reason = f'{reason_label} - Note: {extra_note}'
        else:
            reason = reason_label

        from datetime import datetime
        sd = None
        ed = None
        try:
            if start_date:
                sd = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                ed = datetime.strptime(end_date, '%Y-%m-%d').date()
        except Exception:
            flash('Invalid date format. Use YYYY-MM-DD', 'error')
            return redirect(url_for('teachers.new_leave'))

        if sd and ed:
            if sd == ed:
                flash('Error: Start date and End date cannot be the same. Minimum 2 days required.', 'error')
                return redirect(url_for('teachers.new_leave'))
            if ed < sd:
                flash('Error: End date cannot be before start date.', 'error')
                return redirect(url_for('teachers.new_leave'))

        leave = TeacherLeave(
            teacher_id=t.id,
            submitted_by=(current_user.id if getattr(current_user, 'is_authenticated', False) else None),
            start_date=sd,
            end_date=ed,
            reason=reason,
            status='pending'
        )
        try:
            db.session.add(leave)
            db.session.commit()
            log_activity('info', f'Teacher leave submitted for teacher_id={t.id}', user_id=(current_user.id if getattr(current_user, 'is_authenticated', False) else None))
            flash('Leave request submitted', 'success')
            return redirect(url_for('teachers.portal'))
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Error saving leave: {e}')
            flash('Error saving leave', 'error')
            return redirect(url_for('teachers.new_leave'))

    return render_template('teachers/leave_form.html', teacher=teacher)


@teachers_bp.route('/leaves')
@login_required
def my_leaves():
    # Show leaves for current teacher (or empty)
    teacher = Teacher.query.filter_by(user_id=current_user.id).first()
    leaves = []
    if teacher:
        leaves = TeacherLeave.query.filter_by(teacher_id=teacher.id).order_by(TeacherLeave.submitted_at.desc()).all()
    return render_template('teachers/leaves.html', leaves=leaves, teacher=teacher)


@teachers_bp.route('/student-leaves')
@login_required
def student_leaves():
    """Show student leave requests addressed to the current teacher (as class incharge)."""
    teacher = Teacher.query.filter_by(user_id=current_user.id).first()
    leaves = []
    status_filter = request.args.get('status', 'all')

    if teacher:
        q = StudentLeave.query.filter_by(teacher_id=teacher.id)
        if status_filter != 'all':
            q = q.filter_by(status=status_filter)
        leaves = q.order_by(StudentLeave.created_at.desc()).all()

    return render_template('teachers/student_leaves.html', leaves=leaves, teacher=teacher, status=status_filter)


@teachers_bp.route('/student-leaves/<int:leave_id>/approve', methods=['POST'])
@login_required
def approve_student_leave(leave_id):
    """Approve a student leave request (only by the assigned teacher)."""
    teacher = Teacher.query.filter_by(user_id=current_user.id).first()
    if not teacher:
        return {'success': False, 'error': 'No teacher profile found'}, 403

    leave = StudentLeave.query.get_or_404(leave_id)
    if leave.teacher_id != teacher.id:
        return {'success': False, 'error': 'Not authorized for this leave'}, 403

    leave.status = 'approved'
    db.session.commit()
    return {'success': True, 'status': 'approved'}


@teachers_bp.route('/student-leaves/<int:leave_id>/reject', methods=['POST'])
@login_required
def reject_student_leave(leave_id):
    """Reject a student leave request (only by the assigned teacher)."""
    teacher = Teacher.query.filter_by(user_id=current_user.id).first()
    if not teacher:
        return {'success': False, 'error': 'No teacher profile found'}, 403

    leave = StudentLeave.query.get_or_404(leave_id)
    if leave.teacher_id != teacher.id:
        return {'success': False, 'error': 'Not authorized for this leave'}, 403

    leave.status = 'rejected'
    db.session.commit()
    return {'success': True, 'status': 'rejected'}


@teachers_bp.route('/check-secret-key/<secret_key>')
def check_secret_key(secret_key):
    """Check if a secret key is available via AJAX"""
    try:
        existing = Teacher.query.filter_by(secret_key=secret_key).first()
        return {'available': existing is None}
    except Exception:
        return {'available': False}


@teachers_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_teacher():
    if request.method == 'POST':
        try:
            # Extract form data
            name = request.form.get('name')
            email = request.form.get('email')
            phone = request.form.get('phone')
            address = request.form.get('address')
            subject = request.form.get('subject')
            employee_id = request.form.get('employee_id')
            aadhaar = request.form.get('aadhaar')
            pan = request.form.get('pan')
            qualification = request.form.get('qualification')
            experience_years = request.form.get('experience_years')
            class_teacher_of = request.form.get('class_teacher_of')
            school_id = request.form.get('school_id')
            secret_key = request.form.get('secret_key')
            bank_account = request.form.get('bank_account')
            ifsc_code = request.form.get('ifsc_code')
            
            print(f"DEBUG: Form data received - name: {name}, email: {email}, secret_key: {secret_key}")
            
            # Handle dates
            date_of_birth = None
            if request.form.get('date_of_birth'):
                try:
                    date_of_birth = datetime.strptime(request.form.get('date_of_birth'), '%Y-%m-%d').date()
                    
                    # Validate teacher age (18-65 years)
                    from datetime import date
                    today = date.today()
                    age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
                    
                    if age < 18 or age > 65:
                        flash(f'Teacher age {age} is not valid. Must be between 18-65 years.', 'error')
                        return render_template('teachers/form.html', 
                                             teacher=request.form, 
                                             subjects=Subject.query.all(),
                                             classrooms=Classroom.query.all())
                except ValueError:
                    flash('Invalid date format. Please use YYYY-MM-DD.', 'error')
                    return render_template('teachers/form.html', 
                                         teacher=request.form, 
                                         subjects=Subject.query.all(),
                                         classrooms=Classroom.query.all())
                    
            date_of_joining = None
            if request.form.get('date_of_joining'):
                try:
                    date_of_joining = datetime.strptime(request.form.get('date_of_joining'), '%Y-%m-%d').date()
                except ValueError:
                    pass

        # Prevent duplicate teacher by email or employee_id within same school (if provided)
            if email:
                exists = Teacher.query.filter_by(email=email, school_id=school_id).first()
                if exists:
                    flash('A teacher with this email already exists for this school. Duplicate entries are not allowed.', 'danger')
                    return render_template('teachers/form.html', subjects=Subject.query.all(), classrooms=Classroom.query.all(), teacher=request.form)
            if employee_id:
                exists_emp = Teacher.query.filter_by(employee_id=employee_id, school_id=school_id).first()
                if exists_emp:
                    flash('A teacher with this Employee ID already exists for this school.', 'danger')
                    return render_template('teachers/form.html', subjects=Subject.query.all(), classrooms=Classroom.query.all(), teacher=request.form)

        # Ensure secret_key is unique (if provided) otherwise generate one
            if secret_key:
                existing_key = Teacher.query.filter_by(secret_key=secret_key).first()
                if existing_key:
                    flash('Provided secret key is already in use. Please generate a new unique key.', 'danger')
                    return render_template('teachers/form.html', subjects=Subject.query.all(), classrooms=Classroom.query.all(), teacher=request.form)
            else:
                # attempt to generate a unique key
                for _ in range(50):
                    candidate = f"{random.randint(10000, 99999)}"
                    if not Teacher.query.filter_by(secret_key=candidate).first():
                        secret_key = candidate
                        break

            t = Teacher(
                name=name,
                email=email,
                phone=phone,
                address=address,
                subject=subject,
                employee_id=employee_id,
                aadhaar=aadhaar,
                pan=pan,
                qualification=qualification,
                experience_years=experience_years,
                class_teacher_of=class_teacher_of,
                school_id=school_id,
                secret_key=secret_key,
                bank_account=bank_account,
                ifsc_code=ifsc_code,
                date_of_birth=date_of_birth,
                date_of_joining=date_of_joining,
                status='active'
        )
        
        # Handle photo upload
            if 'photo' in request.files:
                photo = request.files['photo']
                if photo and photo.filename:
                    # Create uploads directory if it doesn't exist
                    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'teachers')
                    os.makedirs(upload_dir, exist_ok=True)

                    # Generate unique filename
                    filename = secure_filename(f"{uuid.uuid4()}_{photo.filename}")
                    photo_path = os.path.join(upload_dir, filename)
                    photo.save(photo_path)

                    # Store relative path in database
                    t.photo = f"uploads/teachers/{filename}"

            # Handle multiple qualification documents upload
            if 'documents' in request.files:
                files = request.files.getlist('documents')
                for doc in files:
                    if doc and doc.filename:
                        # Create uploads directory if it doesn't exist
                        upload_dir = os.path.join(current_app.static_folder, 'uploads', 'teachers', 'documents')
                        os.makedirs(upload_dir, exist_ok=True)

                        # Generate unique filename
                        filename = secure_filename(f"{uuid.uuid4()}_{doc.filename}")
                        doc_path = os.path.join(upload_dir, filename)
                        doc.save(doc_path)

                        # Create Document record
                        new_doc = TeacherDocument(
                            teacher=t,
                            file_path=f"uploads/teachers/documents/{filename}",
                            filename=doc.filename,
                            description="Qualification Document"
                        )
                        db.session.add(new_doc)
        
        # Handle single qualification document (Legacy support)
            if 'qualification_document' in request.files:
                doc = request.files['qualification_document']
                if doc and doc.filename:
                    # Create uploads directory if it doesn't exist
                    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'teachers', 'documents')
                    os.makedirs(upload_dir, exist_ok=True)

                    # Generate unique filename
                    filename = secure_filename(f"{uuid.uuid4()}_{doc.filename}")
                    doc_path = os.path.join(upload_dir, filename)
                    doc.save(doc_path)

                    # Store relative path in database (legacy field)
                    t.qualification_document = f"uploads/teachers/documents/{filename}"
                    
                    # Also add to new table for consistency
                    new_doc = TeacherDocument(
                        teacher=t,
                        file_path=f"uploads/teachers/documents/{filename}",
                        filename=doc.filename,
                        description="Qualification Document"
                    )
                    db.session.add(new_doc)

            db.session.add(t)
            db.session.commit()
            flash('Teacher added successfully!', 'success')
            return redirect(url_for('teachers.list_teachers'))
                
        except Exception as e:
            print(f"ERROR in teacher creation: {str(e)}")
            db.session.rollback()
            flash(f'Error creating teacher: {str(e)}', 'error')
            return render_template('teachers/form.html', 
                                 subjects=Subject.query.all(),
                                 classrooms=Classroom.query.all(), 
                                 teacher=request.form)
        
    # Provide subjects and classrooms for the form dropdowns
    try:
        subjects = Subject.query.order_by(Subject.name).all()
    except Exception:
        subjects = []
    try:
        classrooms = Classroom.query.order_by(Classroom.name).all()
    except Exception:
        classrooms = []

    # If there are no classrooms in DB, provide sensible defaults (Nursery -> 12th, sections A/B)
    if not classrooms:
        default_grades = ['Nursery', 'LKG', 'UKG'] + [str(i) for i in range(1, 13)]
        sections = ['A', 'B']
        default_list = []
        for g in default_grades:
            for s in sections:
                # name like "1 - A" or "Nursery - A"
                default_list.append(SimpleNamespace(name=f"{g} - {s}", stream=None))
        classrooms = default_list

    # Generate a 5-digit secret key for admin to share with teacher (display only)
    generated_secret = f"{random.randint(10000, 99999)}"
    # Admin's school id (if available on current_user)
    admin_school_id = getattr(current_user, 'school_id', '') if current_user and getattr(current_user, 'is_authenticated', False) else ''

    return render_template('teachers/form.html', subjects=subjects, classrooms=classrooms, teacher=None, generated_secret=generated_secret, admin_school_id=admin_school_id)


@teachers_bp.route('/view/<int:teacher_id>')
@login_required
def view_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)
    
    # Get salary records
    salary_records = sorted(teacher.salaries, key=lambda s: s.payment_date or datetime.min.date(), reverse=True) if hasattr(teacher, 'salaries') else []
    
    # Calculate salary totals
    total_paid = sum(float(s.amount or 0) for s in salary_records if s.status == 'paid')
    total_pending = sum(float(s.amount or 0) for s in salary_records if s.status in ['pending', 'overdue'])
    # Assuming advance is tracked via status or logic, for now set to 0 or use if available
    total_advance = sum(float(s.amount or 0) for s in salary_records if s.status == 'advance') 
    
    # Get recent salaries (last 5)
    recent_salaries = salary_records[:5]
    
    # Get attendance records
    attendance_records = sorted(teacher.attendances, key=lambda a: a.date, reverse=True) if hasattr(teacher, 'attendances') else []
    
    # Performance (placeholder)
    performance = 85
    overall_grade = "A"

    return render_template(
        'teacher_profile.html',
        teacher=teacher,
        salary_records=recent_salaries,
        salary_history=salary_records,
        attendance_records=attendance_records,
        salary_total_paid=total_paid,
        salary_total_pending=total_pending,
        salary_total_advance=total_advance,
        performance=performance,
        overall_grade=overall_grade,
        current_year=datetime.now().year,
        now=datetime.now()
    )


@teachers_bp.route('/delete/<int:teacher_id>', methods=['POST'])
@login_required
def delete_teacher(teacher_id):
    # For now, allow any logged-in user to delete teachers (remove admin restriction)
    # if not current_user.is_admin():
    #     flash('You need admin privileges to delete teachers.', 'error')
    #     return redirect(url_for('teachers.list_teachers'))

    t = Teacher.query.get_or_404(teacher_id)

    # Check if teacher has any salaries - if so, we can't delete them
    # as this would violate database constraints
    from models import Classroom, Subject
    salaries_count = Salary.query.filter_by(teacher_id=teacher_id).count()
    if salaries_count > 0:
        flash(f'Cannot delete teacher "{t.name}" because they have {salaries_count} salary record(s). Please remove salary records first.', 'error')
        return redirect(url_for('teachers.list_teachers'))

    # Check if teacher is assigned as class teacher
    classrooms_count = Classroom.query.filter_by(class_teacher_id=teacher_id).count()
    if classrooms_count > 0:
        flash(f'Cannot delete teacher "{t.name}" because they are assigned as class teacher for {classrooms_count} class(es). Please reassign first.', 'error')
        return redirect(url_for('teachers.list_teachers'))

    # Check if teacher is assigned to subjects
    subjects_count = Subject.query.filter_by(teacher_id=teacher_id).count()
    if subjects_count > 0:
        flash(f'Cannot delete teacher "{t.name}" because they are assigned to {subjects_count} subject(s). Please reassign first.', 'error')
        return redirect(url_for('teachers.list_teachers'))

    # Check many-to-many relationships
    subjects_via_m2m = len(t.subjects) if hasattr(t, 'subjects') else 0
    if subjects_via_m2m > 0:
        flash(f'Cannot delete teacher "{t.name}" because they are associated with {subjects_via_m2m} subject(s). Please reassign first.', 'error')
        return redirect(url_for('teachers.list_teachers'))

    try:
        db.session.delete(t)
        db.session.commit()
        flash(f'Teacher "{t.name}" has been successfully deleted.', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting teacher: {str(e)}', 'error')

    return redirect(url_for('teachers.list_teachers'))


@teachers_bp.route('/<int:teacher_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_teacher(teacher_id):
    teacher = Teacher.query.get_or_404(teacher_id)

    if request.method == 'POST':
        # Extract form data
        teacher.name = request.form.get('name')
        teacher.email = request.form.get('email')
        teacher.phone = request.form.get('phone')
        teacher.address = request.form.get('address')
        teacher.subject = request.form.get('subject')
        teacher.employee_id = request.form.get('employee_id')
        teacher.aadhaar = request.form.get('aadhaar')
        teacher.pan = request.form.get('pan')
        teacher.qualification = request.form.get('qualification')
        teacher.experience_years = request.form.get('experience_years')
        teacher.class_teacher_of = request.form.get('class_teacher_of')
        teacher.bank_account = request.form.get('bank_account')
        teacher.ifsc_code = request.form.get('ifsc_code')
        # School and secret key (allow admin or form to update)
        school_id = request.form.get('school_id')
        secret_key = request.form.get('secret_key')
        if school_id:
            teacher.school_id = school_id
        if secret_key:
            # If changing the secret key, ensure uniqueness
            if secret_key != (teacher.secret_key or ''):
                existing = Teacher.query.filter_by(secret_key=secret_key).first()
                if existing and existing.id != teacher.id:
                    flash('Provided secret key is already in use by another teacher.', 'danger')
                    return render_template('teachers/form.html', teacher=teacher)
                teacher.secret_key = secret_key
        
        # Handle dates
        if request.form.get('date_of_birth'):
            try:
                teacher.date_of_birth = datetime.strptime(request.form.get('date_of_birth'), '%Y-%m-%d').date()
            except ValueError:
                pass
                
        if request.form.get('date_of_joining'):
            try:
                teacher.date_of_joining = datetime.strptime(request.form.get('date_of_joining'), '%Y-%m-%d').date()
            except ValueError:
                pass
        
        # Handle photo upload
        if 'photo' in request.files:
            photo = request.files['photo']
            if photo and photo.filename:
                # Create uploads directory if it doesn't exist
                upload_dir = os.path.join(current_app.static_folder, 'uploads', 'teachers')
                os.makedirs(upload_dir, exist_ok=True)

                # Generate unique filename
                filename = secure_filename(f"{uuid.uuid4()}_{photo.filename}")
                photo_path = os.path.join(upload_dir, filename)
                photo.save(photo_path)
                
                # Remove old photo if exists
                if teacher.photo:
                    old_photo_path = os.path.join(current_app.static_folder, teacher.photo)
                    if os.path.exists(old_photo_path):
                        try:
                            os.remove(old_photo_path)
                        except OSError:
                            pass # Ignore error if file doesn't exist or permission denied
                
                # Store relative path in database
                teacher.photo = f"uploads/teachers/{filename}"
                
        # Handle photo removal
        if request.form.get('remove_photo') == '1' and teacher.photo:
            old_photo_path = os.path.join(current_app.static_folder, teacher.photo)
            if os.path.exists(old_photo_path):
                try:
                    os.remove(old_photo_path)
                except OSError:
                    pass
            teacher.photo = None

        # Handle multiple qualification documents upload
        if 'documents' in request.files:
            files = request.files.getlist('documents')
            for doc in files:
                if doc and doc.filename:
                    # Create uploads directory if it doesn't exist
                    upload_dir = os.path.join(current_app.static_folder, 'uploads', 'teachers', 'documents')
                    os.makedirs(upload_dir, exist_ok=True)

                    # Generate unique filename
                    filename = secure_filename(f"{uuid.uuid4()}_{doc.filename}")
                    doc_path = os.path.join(upload_dir, filename)
                    doc.save(doc_path)

                    # Create Document record
                    new_doc = TeacherDocument(
                        teacher=teacher,
                        file_path=f"uploads/teachers/documents/{filename}",
                        filename=doc.filename,
                        description="Qualification Document"
                    )
                    db.session.add(new_doc)

        # Handle document deletion
        delete_doc_ids = request.form.getlist('delete_documents')
        if delete_doc_ids:
            for doc_id in delete_doc_ids:
                doc_to_delete = TeacherDocument.query.get(doc_id)
                if doc_to_delete and doc_to_delete.teacher_id == teacher.id:
                    # Remove file from disk
                    if doc_to_delete.file_path:
                        file_path = os.path.join(current_app.static_folder, doc_to_delete.file_path)
                        if os.path.exists(file_path):
                            try:
                                os.remove(file_path)
                            except OSError:
                                pass
                    db.session.delete(doc_to_delete)

        # Legacy: Handle single qualification document upload (if still used)
        if 'qualification_document' in request.files:
            doc = request.files['qualification_document']
            if doc and doc.filename:
                # Create uploads directory if it doesn't exist
                upload_dir = os.path.join(current_app.static_folder, 'uploads', 'teachers', 'documents')
                os.makedirs(upload_dir, exist_ok=True)

                # Generate unique filename
                filename = secure_filename(f"{uuid.uuid4()}_{doc.filename}")
                doc_path = os.path.join(upload_dir, filename)
                doc.save(doc_path)
                
                # Remove old document if exists
                if teacher.qualification_document:
                    old_doc_path = os.path.join(current_app.static_folder, teacher.qualification_document)
                    if os.path.exists(old_doc_path):
                        try:
                            os.remove(old_doc_path)
                        except OSError:
                            pass 

                # Store relative path in database
                teacher.qualification_document = f"uploads/teachers/documents/{filename}"
                
                # Also add to new table
                new_doc = TeacherDocument(
                    teacher=teacher,
                    file_path=f"uploads/teachers/documents/{filename}",
                    filename=doc.filename,
                    description="Qualification Document (Main)"
                )
                db.session.add(new_doc)

        db.session.commit()
        flash('Teacher updated successfully!', 'success')
        return redirect(url_for('teachers.list_teachers'))
        
    try:
        subjects = Subject.query.order_by(Subject.name).all()
    except Exception:
        subjects = []
    try:
        classrooms = Classroom.query.order_by(Classroom.name).all()
    except Exception:
        classrooms = []
    admin_school_id = getattr(current_user, 'school_id', '') if current_user and getattr(current_user, 'is_authenticated', False) else ''
    return render_template('teachers/form.html', teacher=teacher, subjects=subjects, classrooms=classrooms, generated_secret=None, admin_school_id=admin_school_id)
