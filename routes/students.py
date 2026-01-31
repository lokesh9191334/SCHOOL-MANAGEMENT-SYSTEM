import csv
import io
import os
import uuid
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import (
    Blueprint,
    Response,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError

from models import Classroom, Fee, FeeType, Payment, Student, Subject, db
from utils import log_activity

students_bp = Blueprint('students', __name__, template_folder='../templates')


def sanitize_input(text, max_length=255):
    """Sanitize input text by removing potentially dangerous characters."""
    if not text:
        return text

    # Convert to string if not already
    text = str(text).strip()

    # Remove null bytes and other dangerous characters
    text = text.replace('\x00', '').replace('\r', '').replace('\n', ' ')

    # Limit length
    if len(text) > max_length:
        text = text[:max_length]

    # Remove suspicious patterns but keep essential characters
    # Allow alphanumeric, spaces, basic punctuation
    text = re.sub(r'[^\w\s\.\-\,\(\)\&\+\'\"]', '', text)

    return text




@students_bp.route('/', methods=['GET'])
@login_required
def list_students():
    """List all students with their associated classes."""
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Filter parameters
    search = request.args.get('search', '')
    class_filter = request.args.get('class_filter', '')
    status_filter = request.args.get('status_filter', '')
    
    # Build query with filters
    query = Student.query
    
    if search:
        query = query.filter(Student.name.ilike(f'%{search}%') | \
                           Student.roll_number.ilike(f'%{search}%') | \
                           Student.first_name.ilike(f'%{search}%') | \
                           Student.last_name.ilike(f'%{search}%'))
    
    if class_filter:
        query = query.filter_by(class_id=int(class_filter))
    
    if status_filter:
        is_active = status_filter == 'active'
        query = query.filter_by(is_active=is_active)
    
    # Get paginated results
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    students = pagination.items
    total_students = pagination.total
    
    classes = Classroom.query.all()
    
    return render_template('students/index.html',
                         students=students,
                         classes=classes,
                         total_students=total_students,
                         per_page=per_page,
                         page=page,
                         search=search,
                         class_filter=class_filter,
                         status_filter=status_filter)


@students_bp.route('/add', methods=['GET', 'POST'])
@login_required
def add_student():
    if current_user.role == 'teacher':
        flash('शिक्षकों को छात्र पंजीकृत करने की अनुमति नहीं है।', 'error')
        return redirect(url_for('students.list_students'))
    """Add a new student."""
    if request.method == 'POST':
        # Sanitize and validate all form inputs
        form_data = {
            'first_name': sanitize_input(request.form.get('first_name', ''), 80),
            'last_name': sanitize_input(request.form.get('last_name', ''), 80),
            'roll_number': sanitize_input(request.form.get('roll_number', ''), 50),
            'email': sanitize_input(request.form.get('email', ''), 120),
            'gender': sanitize_input(request.form.get('gender', ''), 20),
            'date_of_birth': request.form.get('date_of_birth', '').strip(),
            'class_id': request.form.get('class_id', '').strip(),
            'permanent_address': sanitize_input(request.form.get('permanent_address', ''), 500),
            'correspondence_address': sanitize_input(request.form.get('correspondence_address', ''), 500),
            'phone': sanitize_input(request.form.get('phone', ''), 30),
            'father_name': sanitize_input(request.form.get('father_name', ''), 120),
            'mother_name': sanitize_input(request.form.get('mother_name', ''), 120),
            'parent_phone': sanitize_input(request.form.get('parent_phone', ''), 30),
            'parent_email': sanitize_input(request.form.get('parent_email', ''), 120),
            'health_problem_description': sanitize_input(request.form.get('health_problem_description', ''), 500),
            'guardian_name': sanitize_input(request.form.get('guardian_name', ''), 120),
            'parent_name': sanitize_input(request.form.get('parent_name', ''), 120)
        }

        # Handle Aadhaar numbers (numeric only)
        student_aadhaar = request.form.get('student_aadhaar', '').strip()
        if student_aadhaar:
            form_data['student_aadhaar'] = re.sub(r'\D', '', student_aadhaar)

        father_aadhaar = request.form.get('father_aadhaar', '').strip()
        if father_aadhaar:
            form_data['father_aadhaar'] = re.sub(r'\D', '', father_aadhaar)

        mother_aadhaar = request.form.get('mother_aadhaar', '').strip()
        if mother_aadhaar:
            form_data['mother_aadhaar'] = re.sub(r'\D', '', mother_aadhaar)

        # Additional boolean fields
        form_data['is_active'] = request.form.get('is_active') == 'on'
        form_data['health_problem'] = request.form.get('health_problem') == 'true'

        # Validate the sanitized data
        validation_errors = []
        if not form_data['first_name']:
            validation_errors.append("First name is required")
        if not form_data['last_name']:
            validation_errors.append("Last name is required")
        if not form_data['roll_number']:
            validation_errors.append("Roll number is required")
        if not form_data['gender']:
            validation_errors.append("Gender is required")
        if not form_data['date_of_birth']:
            validation_errors.append("Date of birth is required")
        if not form_data['class_id']:
            validation_errors.append("Class selection is required")
        if not form_data['father_name']:
            validation_errors.append("Father name is required")
        if not form_data['mother_name']:
            validation_errors.append("Mother name is required")
        if not form_data['parent_phone']:
            validation_errors.append("Parent phone is required")

        # Additional validations
        if form_data['email'] and not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", form_data['email']):
            validation_errors.append("Invalid email format")

        if form_data['phone']:
            digits = re.sub(r'\D', '', form_data['phone'])
            if len(digits) < 10 or len(digits) > 15:
                validation_errors.append("Phone number must be 10-15 digits")

        # Aadhaar validations
        for field, label in [('student_aadhaar', 'Student Aadhaar'), ('father_aadhaar', 'Father Aadhaar'), ('mother_aadhaar', 'Mother Aadhaar')]:
            if form_data.get(field) and len(form_data[field]) != 12:
                validation_errors.append(f"{label} must be exactly 12 digits")

        # Date validation
        if form_data['date_of_birth']:
            try:
                dob = datetime.strptime(form_data['date_of_birth'], '%Y-%m-%d').date()
                today = date.today()
                if dob > today:
                    validation_errors.append("Date of birth cannot be in the future")
                elif dob.year < 1950:
                    validation_errors.append("Date of birth seems unreasonably old")
            except ValueError:
                validation_errors.append("Invalid date format. Please use YYYY-MM-DD")

        if validation_errors:
            for error in validation_errors:
                flash(error, 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=form_data,
                                   current_year=datetime.now().year)

        # Extract validated data
        first_name = form_data['first_name']
        last_name = form_data['last_name']
        roll_number = form_data['roll_number']
        email = form_data['email'] or None
        gender = form_data['gender']
        dob_str = form_data['date_of_birth']
        class_id = form_data['class_id']
        permanent_address = form_data['permanent_address'] or None
        correspondence_address = form_data['correspondence_address'] or None
        address = permanent_address  # Use permanent address as default for legacy systems
        phone = form_data['phone'] or None
        is_active = form_data['is_active']
        health_problem = form_data['health_problem']
        health_problem_description = form_data['health_problem_description'] or None
        father_name = form_data['father_name']
        mother_name = form_data['mother_name']
        parent_phone = form_data['parent_phone']
        parent_email = form_data['parent_email'] or None
        guardian_name = form_data['guardian_name'] or None
        parent_name = form_data['parent_name'] or father_name  # Use father_name as default for legacy
        student_aadhaar = form_data.get('student_aadhaar') or None
        father_aadhaar = form_data.get('father_aadhaar') or None
        mother_aadhaar = form_data.get('mother_aadhaar') or None

        # Get full name from first and last name
        name = f"{first_name} {last_name}".strip()

        try:
            dob = datetime.strptime(dob_str, '%Y-%m-%d').date()
        except ValueError:
            log_activity('Invalid date format. Please use YYYY-MM-DD.', 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=request.form,
                                   current_year=datetime.now().year)

        # Validate student age (5-18 years)
        from datetime import date
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        if age < 5 or age > 18:
            log_activity(f'Student age {age} is not valid. Must be between 5-18 years.', 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=request.form,
                                   current_year=datetime.now().year)

        # Check if roll number already exists
        if Student.query.filter_by(roll_number=roll_number).first():
            log_activity(f'Student with roll number {roll_number} already exists.', 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=request.form,
                                   current_year=datetime.now().year)

        # Handle file uploads
        def save_uploaded_file(file, subfolder=''):
            """Save uploaded file and return the path."""
            if file and file.filename:
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                upload_path = os.path.join(current_app.root_path, 'static', 'uploads')
                if subfolder:
                    upload_path = os.path.join(upload_path, subfolder)
                    os.makedirs(upload_path, exist_ok=True)
                else:
                    os.makedirs(upload_path, exist_ok=True)
                file_path = os.path.join(upload_path, unique_filename)
                file.save(file_path)
                if subfolder:
                    return f"uploads/{subfolder}/{unique_filename}"
                return f"uploads/{unique_filename}"
            return None

        # Process student photo
        student_photo = save_uploaded_file(request.files.get('photo'), 'students')
        
        # Process Aadhaar photos
        student_aadhaar_photo = save_uploaded_file(request.files.get('student_aadhaar_photo'))
        father_aadhaar_photo = save_uploaded_file(request.files.get('father_aadhaar_photo'))
        mother_aadhaar_photo = save_uploaded_file(request.files.get('mother_aadhaar_photo'))

        # Create new student
        new_student = Student(
            name=name,
            first_name=first_name,
            last_name=last_name,
            roll_number=roll_number,
            email=email,
            gender=gender,
            date_of_birth=dob,
            class_id=int(class_id),
            address=address,
            permanent_address=permanent_address,
            correspondence_address=correspondence_address,
            phone=phone,
            is_active=is_active,
            health_problem=health_problem,
            health_problem_description=health_problem_description,
            guardian_name=guardian_name,
            parent_name=parent_name,
            parent_phone=parent_phone,
            parent_email=parent_email,
            father_name=father_name,
            mother_name=mother_name,
            photo=student_photo,
            student_aadhaar=student_aadhaar,
            student_aadhaar_photo=student_aadhaar_photo,
            father_aadhaar=father_aadhaar,
            father_aadhaar_photo=father_aadhaar_photo,
            mother_aadhaar=mother_aadhaar,
            mother_aadhaar_photo=mother_aadhaar_photo
        )
        db.session.add(new_student)
        db.session.commit()
        
        # Create parent record with secret key
        try:
            from models import Parent
            parent_email = request.form.get('parent_email')
            parent_secret_key = request.form.get('parent_secret_key')
            
            if parent_email and parent_secret_key:
                # Check if parent already exists
                existing_parent = Parent.query.filter_by(email=parent_email).first()
                if not existing_parent:
                    parent = Parent(
                        name=f"{request.form.get('father_name', '')} {request.form.get('mother_name', '')}".strip() or "Parent",
                        email=parent_email,
                        phone=request.form.get('parent_phone'),
                        student_id=new_student.id,
                        relation="Parent/Guardian",
                        secret_key=parent_secret_key
                    )
                    db.session.add(parent)
                    log_activity(f'Parent record created for {new_student.name} with secret key', 'success')
        except Exception as e:
            log_activity(f'Error creating parent record: {str(e)}', 'error')
        
        db.session.commit()
        
        # Handle student fee creation
        try:
            annual_fee = request.form.get('annual_fee')
            fee_category = request.form.get('fee_category')
            payment_frequency = request.form.get('payment_frequency')
            due_date = request.form.get('due_date')
            
            if annual_fee:
                from models import Fee
                new_fee = Fee(
                    student_id=new_student.id,
                    amount=float(annual_fee),
                    category=fee_category or 'tuition',
                    academic_year=f"{datetime.now().year}-{datetime.now().year + 1}",
                    due_date=datetime.strptime(due_date, '%Y-%m-%d').date() if due_date else None,
                    description=f"{fee_category or 'Tuition'} fee for {name}",
                    created_at=datetime.utcnow()
                )
                db.session.add(new_fee)
                
                # Handle additional fees
                fee_types = request.form.getlist('fee_type_id')
                fee_amounts = request.form.getlist('other_fee_amount')
                fee_notes = request.form.getlist('other_fee_note')
                
                for i, fee_type_id in enumerate(fee_types):
                    if fee_type_id and i < len(fee_amounts) and fee_amounts[i]:
                        additional_fee = Fee(
                            student_id=new_student.id,
                            fee_type_id=int(fee_type_id) if fee_type_id else None,
                            amount=float(fee_amounts[i]),
                            category='additional',
                            description=fee_notes[i] if i < len(fee_notes) else 'Additional fee',
                            academic_year=f"{datetime.now().year}-{datetime.now().year + 1}",
                            created_at=datetime.utcnow()
                        )
                        db.session.add(additional_fee)
                
                db.session.commit()
                log_activity(f'Student fees created for {name}', 'success')
        except Exception as e:
            log_activity(f'Error creating student fees: {str(e)}', 'error')
            print(f"Fee creation error: {e}")
        
        log_activity(f'Student {name} added successfully.', 'success')
        return redirect(url_for('students.list_students'))

    # GET request - show the add form
    classes = Classroom.query.all()
    # Get fee types for dropdown
    from models import FeeType
    fee_types = FeeType.query.all()
    # Add current year and next year for the template
    current_year = datetime.now().year
    next_year = current_year + 1
    return render_template('students/form.html', 
                         classes=classes,
                         fee_types=fee_types,
                         current_year=current_year,
                         next_year=next_year)


@students_bp.route('/edit/<int:student_id>', methods=['GET', 'POST'])
@login_required
def edit_student(student_id):
    """Edit an existing student's details."""
    student = db.session.get(Student, student_id) or abort(404)

    if request.method == 'POST':
        # Update student details from actual form fields
        student.first_name = request.form.get('first_name')
        student.last_name = request.form.get('last_name')
        student.roll_number = request.form.get('roll_number')
        student.email = request.form.get('email')
        student.gender = request.form.get('gender')
        dob_str = request.form.get('date_of_birth')
        student.class_id = request.form.get('class_id')
        student.permanent_address = request.form.get('permanent_address')
        student.correspondence_address = request.form.get('correspondence_address')
        # Update legacy address field for backward compatibility
        student.address = student.permanent_address  # Use permanent address as default for legacy systems
        student.phone = request.form.get('phone')
        student.is_active = request.form.get('is_active') == 'on'
        student.health_problem = request.form.get('health_problem') == 'true'
        student.health_problem_description = request.form.get('health_problem_description')
        student.father_name = request.form.get('father_name')
        student.mother_name = request.form.get('mother_name')
        student.parent_phone = request.form.get('parent_phone')
        student.parent_email = request.form.get('parent_email')
        # Update legacy fields for backward compatibility
        student.guardian_name = request.form.get('guardian_name')
        student.parent_name = request.form.get('parent_name') or student.father_name  # Use father_name as default for legacy
        student.student_aadhaar = request.form.get('student_aadhaar')
        student.father_aadhaar = request.form.get('father_aadhaar')
        student.mother_aadhaar = request.form.get('mother_aadhaar')
        
        # Update full name from first and last name
        student.name = f"{student.first_name} {student.last_name}".strip()

        # Validate required fields based on form template
        if not all([student.first_name, student.last_name, student.roll_number, student.gender, dob_str, student.class_id, student.father_name, student.mother_name, student.parent_phone]):
            log_activity('Required fields are missing.', 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=student,
                                   current_year=datetime.now().year)

        try:
            student.date_of_birth = datetime.strptime(dob_str, '%Y-%m-%d').date()
        except ValueError:
            log_activity('Invalid date format. Please use YYYY-MM-DD.', 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=student,
                                   current_year=datetime.now().year)

        # Check if roll number already exists for another student
        existing_student = Student.query.filter_by(roll_number=student.roll_number).first()
        if existing_student and existing_student.id != student.id:
            log_activity(f'Student with roll number {student.roll_number} already exists.', 'error')
            return render_template('students/form.html',
                                   classes=Classroom.query.all(),
                                   student=student,
                                   current_year=datetime.now().year)

        # Handle file uploads
        def save_uploaded_file(file, subfolder=''):
            """Save uploaded file and return the path."""
            if file and file.filename:
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                upload_path = os.path.join(current_app.root_path, 'static', 'uploads')
                if subfolder:
                    upload_path = os.path.join(upload_path, subfolder)
                    os.makedirs(upload_path, exist_ok=True)
                else:
                    os.makedirs(upload_path, exist_ok=True)
                file_path = os.path.join(upload_path, unique_filename)
                file.save(file_path)
                if subfolder:
                    return f"uploads/{subfolder}/{unique_filename}"
                return f"uploads/{unique_filename}"
            return None

        def delete_file_if_exists(file_path):
            """Delete file from filesystem if it exists."""
            if file_path:
                full_path = os.path.join(current_app.root_path, 'static', file_path)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except Exception as e:
                        log_activity(f'Error deleting file {file_path}: {str(e)}', 'error')

        # Process student photo with removal option
        if request.form.get('remove_photo') == '1':
            delete_file_if_exists(student.photo)
            student.photo = None
        else:
            new_photo = save_uploaded_file(request.files.get('photo'), 'students')
            if new_photo:
                delete_file_if_exists(student.photo)
                student.photo = new_photo

        # Process Aadhaar photos with removal option
        # Student Aadhaar Photo
        if request.form.get('remove_student_aadhaar_photo') == '1':
            delete_file_if_exists(student.student_aadhaar_photo)
            student.student_aadhaar_photo = None
        else:
            new_student_aadhaar_photo = save_uploaded_file(request.files.get('student_aadhaar_photo'))
            if new_student_aadhaar_photo:
                delete_file_if_exists(student.student_aadhaar_photo)
                student.student_aadhaar_photo = new_student_aadhaar_photo

        # Father Aadhaar Photo
        if request.form.get('remove_father_aadhaar_photo') == '1':
            delete_file_if_exists(student.father_aadhaar_photo)
            student.father_aadhaar_photo = None
        else:
            new_father_photo = save_uploaded_file(request.files.get('father_aadhaar_photo'))
            if new_father_photo:
                delete_file_if_exists(student.father_aadhaar_photo)
                student.father_aadhaar_photo = new_father_photo

        # Mother Aadhaar Photo
        if request.form.get('remove_mother_aadhaar_photo') == '1':
            delete_file_if_exists(student.mother_aadhaar_photo)
            student.mother_aadhaar_photo = None
        else:
            new_mother_photo = save_uploaded_file(request.files.get('mother_aadhaar_photo'))
            if new_mother_photo:
                delete_file_if_exists(student.mother_aadhaar_photo)
                student.mother_aadhaar_photo = new_mother_photo

        db.session.commit()
        log_activity(f'Student {student.name} updated successfully.', 'success')
        return redirect(url_for('students.list_students'))

    # GET request - show edit form
    classes = Classroom.query.all()
    # Add current year and next year for the template
    current_year = datetime.now().year
    next_year = current_year + 1
    return render_template('students/form.html',
                         student=student,
                         classes=classes,
                         current_year=current_year,
                         next_year=next_year)


@students_bp.route('/toggle-active/<int:student_id>', methods=['POST'])
@login_required
def toggle_student_active(student_id):
    """Toggle a student's active/inactive status."""
    student = db.session.get(Student, student_id) or abort(404)

    # Toggle the active status
    student.is_active = not student.is_active
    db.session.commit()
    status = "active" if student.is_active else "inactive"
    log_activity(f'Student {student.name} marked as {status}.', 'success')

    # Redirect back to the student view page instead of the list
    return redirect(url_for('students.view_student', student_id=student.id))


@students_bp.route('/delete/<int:student_id>', methods=['POST'])
@login_required
def delete_student(student_id):
    """Delete a student (admin only)."""
    student = db.session.get(Student, student_id) or abort(404)

    if not current_user.is_admin:
        log_activity('You are not authorized to delete students.', 'error')
        return redirect(url_for('students.list_students'))

    try:
        db.session.delete(student)
        db.session.commit()
        log_activity(f'Student {student.name} deleted successfully.', 'success')
    except IntegrityError:
        db.session.rollback()
        log_activity(f'Cannot delete student {student.name} because there are associated records (e.g., payments, enrollments).', 'error')
    except Exception as e:
        db.session.rollback()
        log_activity(f'Error deleting student {student.name}: {str(e)}', 'error')

    return redirect(url_for('students.list_students'))


@students_bp.route('/export/<format>', methods=['GET'])
@login_required
def export_students(format):
    """Export students data to CSV or Excel format."""
    students = Student.query.all()
    
    # CSV export
    if format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Admission Number', 'Name', 'Gender', 'Date of Birth', 'Class', 'Admission Date', 'Parent Name', 'Parent Phone', 'Parent Email', 'Address'])
        
        # Write data
        for student in students:
            writer.writerow([
                student.admission_number,
                student.name,
                student.gender,
                student.date_of_birth.strftime('%Y-%m-%d'),
                student.current_class.name if student.current_class else 'N/A',
                student.admission_date.strftime('%Y-%m-%d'),
                student.parent_name,
                student.parent_phone,
                student.parent_email,
                student.address
            ])
        
        output.seek(0)
        return Response(output.getvalue(), mimetype='text/csv', headers={
            'Content-Disposition': f'attachment; filename=students_{date.today().strftime("%Y-%m-%d")}.csv'
        })
    
    # Excel export (simplified as CSV for now)
    elif format == 'excel':
        # For simplicity, we'll just return CSV with Excel extension
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Admission Number', 'Name', 'Gender', 'Date of Birth', 'Class', 'Admission Date', 'Parent Name', 'Parent Phone', 'Parent Email', 'Address'])
        
        # Write data
        for student in students:
            writer.writerow([
                student.admission_number,
                student.name,
                student.gender,
                student.date_of_birth.strftime('%Y-%m-%d'),
                student.current_class.name if student.current_class else 'N/A',
                student.admission_date.strftime('%Y-%m-%d'),
                student.parent_name,
                student.parent_phone,
                student.parent_email,
                student.address
            ])
        
        output.seek(0)
        return Response(output.getvalue(), mimetype='application/vnd.ms-excel', headers={
            'Content-Disposition': f'attachment; filename=students_{date.today().strftime("%Y-%m-%d")}.xls'
        })
    
    # Invalid format
    else:
        flash('Invalid export format.', 'error')
        return redirect(url_for('students.list_students'))


@students_bp.route('/analytics', methods=['GET'])
@login_required
def student_analytics():
    """Show student analytics."""
    students = Student.query.all()
    classes = Classroom.query.all()
    
    # Simple analytics data
    total_students = len(students)
    male_students = len([s for s in students if s.gender == 'male'])
    female_students = len([s for s in students if s.gender == 'female'])
    
    class_stats = []
    for classroom in classes:
        class_students = [s for s in students if s.current_class_id == classroom.id]
        class_stats.append({
            'class_name': classroom.name,
            'student_count': len(class_students)
        })
    
    return render_template('students/analytics.html',
                         total_students=total_students,
                         male_students=male_students,
                         female_students=female_students,
                         class_stats=class_stats,
                         classes=classes)


@students_bp.route('/bulk-delete', methods=['POST'])
@login_required
def bulk_delete_students():
    """Bulk delete students."""
    if not current_user.is_admin:
        log_activity('You are not authorized to perform bulk delete.', 'error')
        return redirect(url_for('students.list_students'))
    
    student_ids = request.form.getlist('student_ids')
    if not student_ids:
        flash('No students selected for deletion.', 'warning')
        return redirect(url_for('students.list_students'))
    
    deleted_count = 0
    for student_id in student_ids:
        try:
            student = db.session.get(Student, int(student_id))
            if student:
                db.session.delete(student)
                deleted_count += 1
        except Exception as e:
            log_activity(f'Error deleting student ID {student_id}: {str(e)}', 'error')
    
    try:
        db.session.commit()
        log_activity(f'Successfully deleted {deleted_count} students.', 'success')
    except IntegrityError:
        db.session.rollback()
        log_activity('Cannot delete some students due to associated records.', 'error')
    except Exception as e:
        db.session.rollback()
        log_activity(f'Error during bulk delete: {str(e)}', 'error')
    
    return redirect(url_for('students.list_students'))


@students_bp.route('/view/<int:student_id>', methods=['GET'])
@login_required
def view_student(student_id):
    """View a student's details."""
    student = db.session.get(Student, student_id) or abort(404)
    return render_template('students/view.html', student=student)


@students_bp.route('/result/<int:student_id>', methods=['GET'])
@login_required
def student_result(student_id):
    """View a student's results."""
    student = db.session.get(Student, student_id) or abort(404)
    # For now, just render the template with basic student info
    # This would be expanded to show actual results later
    return render_template('students/result.html', student=student)


@students_bp.route('/import', methods=['GET', 'POST'])
@login_required
def import_students():
    """Import students from CSV file."""
    if current_user.role == 'teacher':
        flash('शिक्षकों को छात्र आयात करने की अनुमति नहीं है।', 'error')
        return redirect(url_for('students.list_students'))

    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file uploaded.', 'error')
            return redirect(request.url)

        file = request.files['file']
        if file.filename == '':
            flash('No file selected.', 'error')
            return redirect(request.url)

        if not file.filename.lower().endswith('.csv'):
            flash('Please upload a CSV file.', 'error')
            return redirect(request.url)

        try:
            # Read CSV content
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_reader = csv.DictReader(stream)

            # Validate CSV headers
            required_headers = ['first_name', 'last_name']
            csv_headers = [header.strip().lower() for header in csv_reader.fieldnames or []]

            # Check if required headers exist (case insensitive)
            missing_headers = []
            for required in required_headers:
                if required not in csv_headers:
                    missing_headers.append(required.title())

            if missing_headers:
                flash(f'Missing required columns: {", ".join(missing_headers)}', 'error')
                return redirect(request.url)

            # Process CSV data
            students_data = []
            row_number = 1
            duplicates_skipped = 0
            errors = []

            skip_duplicates = request.form.get('skip_duplicates') == 'on'

            for row in csv_reader:
                row_number += 1

                try:
                    # Extract and clean data
                    first_name = row.get('first_name', '').strip()
                    last_name = row.get('last_name', '').strip()

                    if not first_name or not last_name:
                        errors.append(f'Row {row_number}: First name and last name are required')
                        continue

                    # Check for duplicates if skip_duplicates is enabled
                    email = row.get('email', '').strip() or None
                    roll_number = row.get('roll_number', '').strip() or None

                    if skip_duplicates and (email or roll_number):
                        existing_student = None
                        if email:
                            existing_student = Student.query.filter_by(email=email).first()
                        if not existing_student and roll_number:
                            existing_student = Student.query.filter_by(roll_number=roll_number).first()

                        if existing_student:
                            duplicates_skipped += 1
                            continue

                    # Prepare and sanitize student data
                    student_data = {
                        'first_name': sanitize_input(first_name, 80),
                        'last_name': sanitize_input(last_name, 80),
                        'name': sanitize_input(f"{first_name} {last_name}", 160),
                        'email': sanitize_input(email, 120) if email else None,
                        'roll_number': sanitize_input(roll_number, 50) if roll_number else None,
                        'phone': sanitize_input(row.get('phone', '').strip(), 30) or None,
                        'gender': sanitize_input(row.get('gender', '').strip(), 20) or None,
                        'father_name': sanitize_input(row.get('father_name', '').strip(), 120) or None,
                        'mother_name': sanitize_input(row.get('mother_name', '').strip(), 120) or None,
                        'parent_phone': sanitize_input(row.get('parent_phone', '').strip(), 30) or None,
                        'parent_email': sanitize_input(row.get('parent_email', '').strip(), 120) or None,
                        'permanent_address': sanitize_input(row.get('permanent_address', '').strip(), 500) or None,
                        'correspondence_address': sanitize_input(row.get('correspondence_address', '').strip(), 500) or None,
                        'date_of_birth': None,
                        'is_active': True
                    }

                    # Aadhaar numbers (no sanitization needed for digits)
                    student_aadhaar = row.get('student_aadhaar', '').strip()
                    if student_aadhaar:
                        student_data['student_aadhaar'] = re.sub(r'\D', '', student_aadhaar)

                    father_aadhaar = row.get('father_aadhaar', '').strip()
                    if father_aadhaar:
                        student_data['father_aadhaar'] = re.sub(r'\D', '', father_aadhaar)

                    mother_aadhaar = row.get('mother_aadhaar', '').strip()
                    if mother_aadhaar:
                        student_data['mother_aadhaar'] = re.sub(r'\D', '', mother_aadhaar)

                    # Validate the data
                    validation_errors = validate_student_data(student_data)
                    if validation_errors:
                        errors.extend([f'Row {row_number}: {error}' for error in validation_errors])
                        continue

                    # Parse date of birth if provided (validation already done)
                    dob_str = row.get('date_of_birth', '').strip()
                    if dob_str and not validation_errors:  # Only parse if validation passed
                        try:
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']:
                                try:
                                    student_data['date_of_birth'] = datetime.strptime(dob_str, fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except Exception:
                            pass  # Keep as None if parsing fails

                    students_data.append(student_data)

                except Exception as e:
                    errors.append(f'Row {row_number}: {str(e)}')
                    continue

            # Import students in batches to handle unlimited records
            imported_count = 0
            batch_size = 50  # Process in batches of 50 to avoid memory issues

            for i in range(0, len(students_data), batch_size):
                batch = students_data[i:i + batch_size]

                for student_data in batch:
                    try:
                        student = Student(**student_data)
                        db.session.add(student)
                        imported_count += 1
                    except Exception as e:
                        errors.append(f'Error importing {student_data["name"]}: {str(e)}')

                # Commit each batch
                try:
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    errors.append(f'Error committing batch {i//batch_size + 1}: {str(e)}')
                    continue

            # Log activity
            log_activity('success', f'Imported {imported_count} students from CSV', current_user.id)

            # Prepare result message
            messages = []
            if imported_count > 0:
                messages.append(f'Successfully imported {imported_count} students.')
            if duplicates_skipped > 0:
                messages.append(f'Skipped {duplicates_skipped} duplicate entries.')
            if errors:
                messages.append(f'{len(errors)} errors occurred during import.')

            flash(' '.join(messages), 'success' if imported_count > 0 else 'warning')

            # Show detailed results if there were errors
            if errors:
                flash('Import completed with some errors. Check the details below.', 'warning')
                return render_template('students/import_results.html',
                                     imported_count=imported_count,
                                     duplicates_skipped=duplicates_skipped,
                                     errors=errors)

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'CSV import error: {str(e)}', exc_info=True)
            flash(f'Error importing CSV file: {str(e)}', 'error')
            return redirect(request.url)

    return render_template('students/import.html')


@students_bp.route('/download-template', methods=['GET'])
@login_required
def download_template():
    """Download CSV template for student import."""
    if current_user.role == 'teacher':
        flash('शिक्षकों को छात्र आयात करने की अनुमति नहीं है।', 'error')
        return redirect(url_for('students.list_students'))
    # Create CSV template with sample data
    output = io.StringIO()
    writer = csv.writer(output)

    # Write headers
    headers = [
        'first_name', 'last_name', 'email', 'roll_number', 'phone', 'gender',
        'father_name', 'mother_name', 'parent_phone', 'parent_email',
        'permanent_address', 'correspondence_address', 'date_of_birth'
    ]
    writer.writerow(headers)

    # Write sample data
    sample_data = [
        ['John', 'Doe', 'john.doe@example.com', '2024001', '+1234567890', 'Male',
         'Robert Doe', 'Jane Doe', '+1234567890', 'robert.doe@example.com',
         '123 Main St, City, State', '123 Main St, City, State', '2005-05-15'],
        ['Jane', 'Smith', 'jane.smith@example.com', '2024002', '+1234567891', 'Female',
         'Michael Smith', 'Sarah Smith', '+1234567891', 'michael.smith@example.com',
         '456 Oak Ave, City, State', '456 Oak Ave, City, State', '2005-08-20'],
        ['Ahmed', 'Khan', 'ahmed.khan@example.com', '2024003', '+1234567892', 'Male',
         'Ali Khan', 'Fatima Khan', '+1234567892', 'ali.khan@example.com',
         '789 Pine Rd, City, State', '789 Pine Rd, City, State', '2005-12-10']
    ]

    for row in sample_data:
        writer.writerow(row)

    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename=student_import_template.csv',
            'Content-Type': 'text/csv; charset=utf-8'
        }
    )


@students_bp.route('/export-advanced', methods=['GET', 'POST'])
@login_required
def export_students_advanced():
    """Advanced export with filtering and selection options."""
    if current_user.role == 'teacher':
        flash('शिक्षकों को छात्र निर्यात करने की अनुमति नहीं है।', 'error')
        return redirect(url_for('students.list_students'))

    classes = Classroom.query.all()

    if request.method == 'POST':
        # Get filter parameters
        export_type = request.form.get('export_type', 'all')
        selected_classes = request.form.getlist('classes')
        selected_sections = request.form.getlist('sections')
        status_filter = request.form.get('status_filter', 'all')
        include_parent_info = request.form.get('include_parent_info') == 'on'
        include_contact_info = request.form.get('include_contact_info') == 'on'

        # Build query based on filters
        query = Student.query

        if export_type == 'selected_classes' and selected_classes:
            # Filter by selected classes
            class_ids = [int(cid) for cid in selected_classes if cid.isdigit()]
            if class_ids:
                query = query.filter(Student.class_id.in_(class_ids))

        if status_filter != 'all':
            is_active = status_filter == 'active'
            query = query.filter_by(is_active=is_active)

        students = query.all()

        if not students:
            flash('No students found matching the selected criteria.', 'warning')
            return redirect(request.url)

        # Create CSV output
        output = io.StringIO()
        writer = csv.writer(output)

        # Build header based on selected options
        header = ['ID', 'First Name', 'Last Name', 'Full Name', 'Roll Number']

        if include_contact_info:
            header.extend(['Email', 'Phone'])

        header.extend(['Gender', 'Date of Birth', 'Class Name', 'Is Active'])

        if include_parent_info:
            header.extend(['Father Name', 'Mother Name', 'Parent Phone', 'Parent Email'])

        header.extend(['Permanent Address', 'Correspondence Address'])

        writer.writerow(header)

        # Write student data
        for student in students:
            row = [
                student.id,
                student.first_name or '',
                student.last_name or '',
                student.full_name(),
                student.roll_number or ''
            ]

            if include_contact_info:
                row.extend([
                    student.email or '',
                    student.phone or ''
                ])

            row.extend([
                student.gender or '',
                student.date_of_birth.strftime('%Y-%m-%d') if student.date_of_birth else '',
                student.current_class.get('name', '') if student.current_class else '',
                'Yes' if student.is_active else 'No'
            ])

            if include_parent_info:
                row.extend([
                    student.father_name or '',
                    student.mother_name or '',
                    student.parent_phone or '',
                    student.parent_email or ''
                ])

            row.extend([
                student.permanent_address or '',
                student.correspondence_address or ''
            ])

            writer.writerow(row)

        output.seek(0)

        # Generate filename with timestamp and filters
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filters_desc = []
        if export_type == 'selected_classes' and selected_classes:
            filters_desc.append('filtered')
        if status_filter != 'all':
            filters_desc.append(status_filter)

        filter_str = '_' + '_'.join(filters_desc) if filters_desc else ''
        filename = f'students_export_{timestamp}{filter_str}.csv'

        return Response(
            output.getvalue(),
            mimetype='text/csv; charset=utf-8',
            headers={
                'Content-Disposition': f'attachment; filename={filename}',
                'Content-Type': 'text/csv; charset=utf-8'
            }
        )

    return render_template('students/export_advanced.html', classes=classes)