from datetime import date, datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
from itsdangerous import URLSafeTimedSerializer
from flask import current_app

db = SQLAlchemy()

# Association tables for many-to-many relationships
subject_teachers = db.Table(
    'subject_teachers',
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id')),
    db.Column('teacher_id', db.Integer, db.ForeignKey('teacher.id'))
)

subject_classrooms = db.Table(
    'subject_classrooms',
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id')),
    db.Column('classroom_id', db.Integer, db.ForeignKey('classroom.id'))
)


class User(db.Model, UserMixin):
    """Application user: admin, teacher, staff"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # admin, teacher, parent, student
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Multi-school support
    school_id = db.Column(db.String(5), db.ForeignKey('schools.id'), nullable=True)
    
    # Teacher specific fields
    employee_id = db.Column(db.String(50), nullable=True)
    experience_years = db.Column(db.Integer, default=0)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        return self.role == 'admin'

# School model for multi-school support
class School(db.Model):
    __tablename__ = 'schools'
    
    id = db.Column(db.String(5), primary_key=True)  # 5-digit school ID
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text, nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    admin_name = db.Column(db.String(120), nullable=True)
    admin_email = db.Column(db.String(120), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Relationships
    users = db.relationship('User', backref='school', lazy='dynamic')
    
    def __repr__(self):
        return f'<School {self.id}: {self.name}>'




class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Backwards-compatible simple fields expected by tests
    name = db.Column(db.String(160), nullable=False)
    roll_number = db.Column(db.String(50), nullable=True)
    # additional more detailed fields (kept for compatibility with other code)
    first_name = db.Column(db.String(80), nullable=True)
    last_name = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    health_problem = db.Column(db.Boolean, default=False)
    health_problem_description = db.Column(db.Text, nullable=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    parent_name = db.Column(db.String(120), nullable=True)  # Legacy field, kept for backward compatibility
    parent_phone = db.Column(db.String(30), nullable=True)
    parent_email = db.Column(db.String(120), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    guardian_name = db.Column(db.String(120), nullable=True)  # Legacy field, kept for backward compatibility
    father_name = db.Column(db.String(120), nullable=True)  # Father's full name
    mother_name = db.Column(db.String(120), nullable=True)  # Mother's full name
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)  # Legacy address field, kept for backward compatibility
    permanent_address = db.Column(db.Text, nullable=True)  # Permanent address
    correspondence_address = db.Column(db.Text, nullable=True)  # Correspondence address
    photo = db.Column(db.String(255), nullable=True)  # Path to student photo

    # Aadhaar Card Fields (12-digit validation)
    student_aadhaar = db.Column(db.String(12), nullable=True, unique=True)  # Student's Aadhaar
    student_aadhaar_photo = db.Column(db.String(255), nullable=True)        # Student's Aadhaar Photo
    father_aadhaar = db.Column(db.String(12), nullable=True, unique=True)   # Father's Aadhaar
    father_aadhaar_photo = db.Column(db.String(255), nullable=True)         # Father's Aadhaar Photo
    mother_aadhaar = db.Column(db.String(12), nullable=True, unique=True)   # Mother's Aadhaar
    mother_aadhaar_photo = db.Column(db.String(255), nullable=True)         # Mother's Aadhaar Photo

    # Permanent record flag - once saved, cannot be deleted
    is_permanent = db.Column(db.Boolean, default=False)

    enrollments = db.relationship('Enrollment', back_populates='student', cascade='all, delete-orphan')
    attendances = db.relationship('Attendance', back_populates='student', cascade='all, delete-orphan')
    fees = db.relationship('Fee', back_populates='student', cascade='all, delete-orphan')
    classroom = db.relationship('Classroom', backref='direct_students')

    def full_name(self):
        if self.first_name or self.last_name:
            return f"{self.first_name or ''} {self.last_name or ''}".strip()
        return self.name

    @property
    def current_class(self):
        """Return the student's current class name or grade, if available.

        Checks enrollments (most recent) and falls back to direct class_id.
        """
        try:
            # First check enrollments
            if self.enrollments and len(self.enrollments) > 0:
                cls = self.enrollments[0].classroom
                if cls:
                    # Return a richer object (dict) with name, grade, stream, and room
                    return {
                        'id': getattr(cls, 'id', None),
                        'name': getattr(cls, 'name', None),
                        'grade': getattr(cls, 'grade', None),
                        'stream': getattr(cls, 'stream', None),
                        'room': getattr(cls, 'room', None)
                    }
            # Fall back to direct class_id relationship
            if self.classroom:
                return {
                    'id': self.classroom.id,
                    'name': self.classroom.name,
                    'grade': self.classroom.grade,
                    'stream': self.classroom.stream,
                    'room': self.classroom.room
                }
        except Exception:
            return None
        return None

    # Alias for tests that expect `attendance` attribute name
    @property
    def attendance(self):
        return list(self.attendances)

    def __repr__(self):
        return f'<Student {self.id} {self.name}>'


class TeacherAttendance(db.Model):
    """Tracks teacher attendance"""
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(20), nullable=False, default='present')  # present, absent, late, half-day, leave
    check_in = db.Column(db.Time, nullable=True)
    check_out = db.Column(db.Time, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    teacher = db.relationship('Teacher', backref='attendances')

    def __repr__(self):
        return f'<TeacherAttendance {self.id} {self.teacher_id} {self.date} {self.status}>'


class TeacherDocument(db.Model):
    """Stores multiple documents for teachers (Qualifications, ID proofs, etc.)"""
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)  # Path to the file
    filename = db.Column(db.String(255), nullable=False)   # Original filename
    description = db.Column(db.String(255), nullable=True) # Description/Name of document
    uploaded_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f'<TeacherDocument {self.id} {self.filename}>'


class Teacher(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    photo = db.Column(db.String(255), nullable=True)  # Path to teacher photo
    date_of_birth = db.Column(db.Date, nullable=True)
    date_of_joining = db.Column(db.Date, nullable=True)
    qualification = db.Column(db.String(200), nullable=True)
    qualification_document = db.Column(db.String(255), nullable=True)  # Path to qualification PDF
    documents = db.relationship('TeacherDocument', backref='teacher', cascade='all, delete-orphan')
    experience_years = db.Column(db.Integer, default=0)
    
    # Subjects and Classes
    subject = db.Column(db.String(120), nullable=True)  # Main subject
    class_teacher_of = db.Column(db.String(100), nullable=True)  # Class teacher of which class
    is_class_incharge = db.Column(db.Boolean, default=False)  # Class Incharge status
    
    # Identity documents
    employee_id = db.Column(db.String(50), nullable=True, unique=True)
    
    # Relationship with User
    user = db.relationship('User', backref=db.backref('teacher_profile', uselist=False))
    aadhaar = db.Column(db.String(12), nullable=True, unique=True)
    pan = db.Column(db.String(10), nullable=True, unique=True)
    bank_account = db.Column(db.String(50), nullable=True)
    ifsc_code = db.Column(db.String(20), nullable=True)
    # School and secret key for account linking
    school_id = db.Column(db.String(5), db.ForeignKey('schools.id'), nullable=True)
    secret_key = db.Column(db.String(5), nullable=True, unique=True)
    
    # Status
    status = db.Column(db.String(20), default='active')  # active, inactive, on_leave, terminated
    
    # Absence tracking
    is_absent = db.Column(db.Boolean, default=False)
    absent_reason = db.Column(db.Text, nullable=True)
    absent_date = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True)  # For substitution availability
    
    # Relationships
    subjects = db.relationship('Subject', secondary=subject_teachers, back_populates='teachers')
    
    # Methods
    def get_current_month_attendance(self):
        from datetime import date
        today = date.today()
        first_day = today.replace(day=1)
        
        return {
            'present': self.attendances.filter(
                db.extract('year', TeacherAttendance.date) == today.year,
                db.extract('month', TeacherAttendance.date) == today.month,
                TeacherAttendance.status == 'present'
            ).count(),
            'absent': self.attendances.filter(
                db.extract('year', TeacherAttendance.date) == today.year,
                db.extract('month', TeacherAttendance.date) == today.month,
                TeacherAttendance.status == 'absent'
            ).count(),
            'leave': self.attendances.filter(
                db.extract('year', TeacherAttendance.date) == today.year,
                db.extract('month', TeacherAttendance.date) == today.month,
                TeacherAttendance.status == 'leave'
            ).count(),
        }
        
    def get_salary_history(self):
        return self.salaries.order_by(Salary.payment_date.desc()).all()
        
    def get_current_salary(self):
        return self.salaries.order_by(Salary.payment_date.desc()).first()

    def __repr__(self):
        return f'<Teacher {self.id} {self.name}>'


class Classroom(db.Model):
    """Represents a class or section, e.g., Grade 6-A"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    # tests expect a 'grade' attribute; keep 'year' for legacy, add 'grade'
    year = db.Column(db.String(20), nullable=True)
    grade = db.Column(db.String(20), nullable=True)
    stream = db.Column(db.String(20), nullable=True)  # For 11th & 12th grades: science, commerce, arts, vocational

    # Enhanced features
    capacity = db.Column(db.Integer, nullable=True)  # Maximum students
    class_teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=True)
    room = db.Column(db.String(50), nullable=True)  # Physical location
    schedule = db.Column(db.Text, nullable=True)  # JSON string for schedule
    class_type = db.Column(db.String(30), default='regular')  # 'regular', 'special', 'remedial', etc.
    academic_year = db.Column(db.String(20), nullable=True)  # e.g., '2024-2025'
    status = db.Column(db.String(20), default='active')  # 'active', 'inactive', 'archived'
    description = db.Column(db.Text, nullable=True)  # Additional notes

    subjects = db.relationship('Subject', secondary=subject_classrooms, back_populates='classrooms')
    enrollments = db.relationship('Enrollment', back_populates='classroom', cascade='all, delete-orphan')
    class_teacher = db.relationship('Teacher', foreign_keys=[class_teacher_id])

    @property
    def students(self):
        # Return list of student objects via enrollments for compatibility with tests
        return [e.student for e in self.enrollments]

    def __repr__(self):
        return f'<Classroom {self.id} {self.name}>'


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    stream = db.Column(db.String(120), nullable=True)  # Stream for 11th/12th classes (Medical, Non-Medical, Arts, Commerce, etc.)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    teachers = db.relationship('Teacher', secondary=subject_teachers, back_populates='subjects')
    classrooms = db.relationship('Classroom', secondary=subject_classrooms, back_populates='subjects')
    materials = db.relationship('SubjectMaterial', backref='subject', cascade='all, delete-orphan')
    assignments = db.relationship('SubjectAssignment', backref='subject', cascade='all, delete-orphan')
    grades = db.relationship('SubjectGrade', backref='subject', cascade='all, delete-orphan')
    schedules = db.relationship('WeeklySchedule', backref='subject', cascade='all, delete-orphan')

    def __init__(self, *args, **kwargs):
        # Support both ID-based and object-based initialization
        teacher_id = kwargs.pop('teacher_id', None)
        classroom_id = kwargs.pop('classroom_id', None)
        teacher_obj = kwargs.pop('teacher', None)
        classroom_obj = kwargs.pop('classroom', None)
        
        super().__init__(*args, **kwargs)
        
        # Set direct references for immediate use (before session add)
        self._pending_teacher = teacher_obj
        self._pending_classroom = classroom_obj
        
        # Set IDs directly if provided
        if teacher_id:
            self.teacher_id = teacher_id
        if classroom_id:
            self.classroom_id = classroom_id

    def __repr__(self):
        return f'<Subject {self.id} {self.name}>'

    # Backwards-compatible single-teacher/classroom accessors
    @property
    def teacher(self):
        if hasattr(self, '_pending_teacher') and self._pending_teacher:
            return self._pending_teacher
        if self.teachers:
            return self.teachers[0]
        elif self.teacher_id and hasattr(db, 'session'):
            return db.session.get(Teacher, self.teacher_id)
        return None

    @teacher.setter
    def teacher(self, value):
        if value is None:
            self.teachers = []
            self.teacher_id = None
        else:
            self.teacher_id = getattr(value, 'id', None)
            if self.teacher_id and hasattr(db, 'session'):
                db.session.flush()
                if value in db.session:
                    self.teachers = [value]

    @property
    def classroom(self):
        if hasattr(self, '_pending_classroom') and self._pending_classroom:
            return self._pending_classroom
        if self.classrooms:
            return self.classrooms[0]
        elif self.classroom_id and hasattr(db, 'session'):
            return db.session.get(Classroom, self.classroom_id)
        return None

    @classroom.setter
    def classroom(self, value):
        if value is None:
            self.classrooms = []
            self.classroom_id = None
        else:
            self.classroom_id = getattr(value, 'id', None)
            if self.classroom_id and hasattr(db, 'session'):
                db.session.flush()
        if value in db.session:
            self.classrooms = [value]

class SubjectMaterial(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    uploaded_by = db.Column(db.String(120), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class SubjectAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    attachment_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), default='Active')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class SubjectGrade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Numeric(5, 2), nullable=False)
    max_score = db.Column(db.Numeric(5, 2), nullable=False)
    term = db.Column(db.String(50), nullable=True)
    date = db.Column(db.Date, default=date.today)
    student = db.relationship('Student')

class WeeklySchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    day_of_week = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(50), nullable=True)
    note = db.Column(db.String(255), nullable=True)
    teacher = db.relationship('Teacher')
    classroom = db.relationship('Classroom')

class TeacherSubstitution(db.Model):
    __tablename__ = 'teacher_substitution'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Original teacher details
    original_teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    original_teacher = db.relationship('Teacher', foreign_keys=[original_teacher_id], backref='absences')
    
    # Substitute teacher details
    substitute_teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    substitute_teacher = db.relationship('Teacher', foreign_keys=[substitute_teacher_id], backref='substitute_assignments')
    
    # Subject and class details
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='teacher_substitutions')
    
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    classroom = db.relationship('Classroom', backref='teacher_substitutions')
    
    # Schedule details
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    period_number = db.Column(db.Integer, nullable=False)  # 1, 2, 3, etc.
    
    # Status and reason
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected, completed
    reason = db.Column(db.Text, nullable=True)
    absence_reason = db.Column(db.String(100), nullable=True)  # sick, personal, emergency, etc.
    
    # Notifications
    notification_sent = db.Column(db.Boolean, default=False)
    notification_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Created by
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_by = db.relationship('User', backref='created_substitutions')
    
    def __repr__(self):
        return f'<Substitution {self.original_teacher.name} -> {self.substitute_teacher.name} on {self.date}>'

class TeacherSchedule(db.Model):
    __tablename__ = 'teacher_schedule'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Teacher and subject
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    teacher = db.relationship('Teacher', backref='teacher_schedule')
    
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='subject_schedule')
    
    # Class and room
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    classroom = db.relationship('Classroom', backref='classroom_schedule')
    
    # Schedule details
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 1=Tuesday, etc.
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    period_number = db.Column(db.Integer, nullable=False)
    room_number = db.Column(db.String(50), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<Schedule {self.teacher.name} - {self.subject.name} - {self.classroom.name}>'

class TeacherLeave(db.Model):
    __tablename__ = 'teacher_leave'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Teacher details
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    teacher = db.relationship('Teacher', backref='leaves')
    
    # Leave details
    leave_type = db.Column(db.String(50), nullable=False)  # sick, casual, emergency, etc.
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=True)  # For half-day leaves
    end_time = db.Column(db.Time, nullable=True)
    
    # Reason and status
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    approved_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    approved_by = db.relationship('User', backref='approved_leaves')
    approved_at = db.Column(db.DateTime, nullable=True)
    
    # Substitution created
    substitution_created = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<Leave {self.teacher.name} - {self.leave_type} from {self.start_date} to {self.end_date}>'

# Automatic Leave Approval System
class AutoLeaveApproval(db.Model):
    __tablename__ = 'auto_leave_approval'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Configuration
    auto_approval_enabled = db.Column(db.Boolean, default=True)
    approval_time_minutes = db.Column(db.Integer, default=30)  # Default 30 minutes
    apply_to_leave_types = db.Column(db.Text, default='sick,emergency')  # Comma-separated
    
    # Notification settings
    notify_admin_before_auto_approval = db.Column(db.Boolean, default=True)
    notify_teacher_on_auto_approval = db.Column(db.Boolean, default=True)
    
    # Time tracking
    last_updated = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    updated_by = db.relationship('User', backref='auto_approval_updates')
    
    def __repr__(self):
        return f'<AutoLeaveApproval enabled={self.auto_approval_enabled} minutes={self.approval_time_minutes}>'

class LeaveApprovalLog(db.Model):
    __tablename__ = 'leave_approval_log'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Leave reference
    leave_id = db.Column(db.Integer, db.ForeignKey('teacher_leave.id'), nullable=False)
    leave = db.relationship('TeacherLeave', backref='approval_logs')
    
    # Approval details
    approval_type = db.Column(db.String(20), default='auto')  # auto, manual
    approved_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    approved_by = db.relationship('User', backref='approval_logs')
    
    # Timing
    submitted_at = db.Column(db.DateTime, nullable=False)
    auto_approval_time = db.Column(db.DateTime, nullable=True)
    actual_approval_time = db.Column(db.DateTime, nullable=True)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, auto_approved, manual_approved, rejected
    
    # Notes
    notes = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f'<LeaveApprovalLog leave_id={self.leave_id} type={self.approval_type} status={self.status}>'

# Teacher Timetable System
class TimeTable(db.Model):
    __tablename__ = 'timetable'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic information
    name = db.Column(db.String(100), nullable=False)  # e.g., "Class 10A - Science Stream"
    description = db.Column(db.Text, nullable=True)
    
    # Class information
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    classroom = db.relationship('Classroom', backref='timetables')
    
    # Academic information
    academic_year = db.Column(db.String(20), nullable=False)  # e.g., "2024-2025"
    semester = db.Column(db.String(20), nullable=True)  # e.g., "First Semester"
    
    # Status and visibility
    is_active = db.Column(db.Boolean, default=True)
    is_published = db.Column(db.Boolean, default=False)  # Published to teachers
    
    # Creator information
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_by = db.relationship('User', backref='created_timetables')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<TimeTable {self.name} - {self.classroom.name if self.classroom else "General"}>'

class TimeTableEntry(db.Model):
    __tablename__ = 'timetable_entry'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Time table reference
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetable.id'), nullable=False)
    timetable = db.relationship('TimeTable', backref='entries')
    
    # Schedule information
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 6=Sunday
    period_number = db.Column(db.Integer, nullable=False)  # 1, 2, 3, etc.
    
    # Time information
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    
    # Subject and teacher
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='timetable_entries')
    
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    teacher = db.relationship('Teacher', backref='timetable_entries')
    
    # Classroom information
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    classroom = db.relationship('Classroom', backref='timetable_entries')
    
    # Additional information
    room_number = db.Column(db.String(50), nullable=True)
    is_lab_period = db.Column(db.Boolean, default=False)
    is_break_period = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<TimeTableEntry {self.day_of_week} - Period {self.period_number} - {self.subject.name}>'

class TeacherTimeTable(db.Model):
    __tablename__ = 'teacher_timetable'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Teacher reference
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    teacher = db.relationship('Teacher', backref='personal_timetables')
    
    # Academic information
    academic_year = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.String(20), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<TeacherTimeTable {self.teacher.name} - {self.academic_year}>'

class TeacherTimeTableEntry(db.Model):
    __tablename__ = 'teacher_timetable_entry'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Teacher timetable reference
    teacher_timetable_id = db.Column(db.Integer, db.ForeignKey('teacher_timetable.id'), nullable=False)
    teacher_timetable = db.relationship('TeacherTimeTable', backref='entries')
    
    # Schedule information
    day_of_week = db.Column(db.Integer, nullable=False)
    period_number = db.Column(db.Integer, nullable=False)
    
    # Time information
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    
    # Subject and class
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='teacher_timetable_entries')
    
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    classroom = db.relationship('Classroom', backref='teacher_timetable_entries')
    
    # Additional information
    room_number = db.Column(db.String(50), nullable=True)
    is_lab_period = db.Column(db.Boolean, default=False)
    is_break_period = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)
    
    # Substitution tracking
    original_teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=True)
    original_teacher = db.relationship('Teacher', foreign_keys=[original_teacher_id])
    date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='regular')  # regular, substitution
    substitution_reason = db.Column(db.Text, nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<TeacherTimeTableEntry {self.day_of_week} - Period {self.period_number} - {self.subject.name}>'

# Date Sheet System for Parents
class DateSheet(db.Model):
    __tablename__ = 'date_sheet'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic information
    title = db.Column(db.String(200), nullable=False)  # e.g., "Final Exams 2024-2025"
    description = db.Column(db.Text, nullable=True)
    
    # Class information
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    classroom = db.relationship('Classroom', backref='date_sheets')
    
    # Academic information
    academic_year = db.Column(db.String(20), nullable=False)  # e.g., "2024-2025"
    exam_type = db.Column(db.String(50), nullable=False)  # e.g., "Final", "Mid-term", "Unit Test"
    
    # Schedule information
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    
    # Status and visibility
    is_active = db.Column(db.Boolean, default=True)
    is_published = db.Column(db.Boolean, default=False)  # Published to parents and students
    
    # Creator information
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_by = db.relationship('User', backref='created_date_sheets')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<DateSheet {self.title} - {self.classroom.name if self.classroom else "All Classes"}>'

class DateSheetEntry(db.Model):
    __tablename__ = 'date_sheet_entry'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Date sheet reference
    date_sheet_id = db.Column(db.Integer, db.ForeignKey('date_sheet.id'), nullable=False)
    date_sheet = db.relationship('DateSheet', backref='entries')
    
    # Schedule information
    exam_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    
    # Subject information
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='date_sheet_entries')
    
    # Class information
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=True)
    classroom = db.relationship('Classroom', backref='date_sheet_entries')
    
    # Additional information
    exam_duration = db.Column(db.Integer, nullable=True)  # Duration in minutes
    max_marks = db.Column(db.Integer, nullable=True)
    exam_venue = db.Column(db.String(100), nullable=True)
    room_number = db.Column(db.String(50), nullable=True)  # Room number
    section = db.Column(db.String(50), nullable=True)  # Class section (A, B, C, etc.)
    floor_number = db.Column(db.String(20), nullable=True)  # Floor number
    building_name = db.Column(db.String(100), nullable=True)  # Building name
    special_instructions = db.Column(db.Text, nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_completed = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<DateSheetEntry {self.subject.name} - {self.exam_date.strftime("%d-%m-%Y")}>'

class ExamResult(db.Model):
    __tablename__ = 'exam_result'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Student and exam reference
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    student = db.relationship('Student', backref='exam_results')
    
    date_sheet_entry_id = db.Column(db.Integer, db.ForeignKey('date_sheet_entry.id'), nullable=False)
    date_sheet_entry = db.relationship('DateSheetEntry', backref='results')
    
    # Marks information
    marks_obtained = db.Column(db.Integer, nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)
    percentage = db.Column(db.Float, nullable=True)
    
    # Grade information
    grade = db.Column(db.String(10), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    
    # Status
    is_absent = db.Column(db.Boolean, default=False)
    is_passed = db.Column(db.Boolean, nullable=True)
    
    # Evaluation information
    evaluated_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    evaluated_by = db.relationship('User', backref='evaluated_results')
    evaluated_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<ExamResult {self.student.name} - {self.date_sheet_entry.subject.name}>'

class Enrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    enrolled_on = db.Column(db.Date, default=date.today)

    student = db.relationship('Student', back_populates='enrollments')
    classroom = db.relationship('Classroom', back_populates='enrollments')

    def __repr__(self):
        return f'<Enrollment student={self.student_id} class={self.classroom_id}>'


class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    present = db.Column(db.Boolean, default=True)
    photo = db.Column(db.String(255), nullable=True)  # Path to attendance photo

    student = db.relationship('Student', back_populates='attendances')

    def __repr__(self):
        return f'<Attendance {self.id} student={self.student_id} date={self.date} present={self.present}>'


class FeeType(db.Model):
    """Predefined fee categories like tuition, exam fees, transportation, etc."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    is_recurring = db.Column(db.Boolean, default=False)  # Monthly, quarterly, etc.
    frequency = db.Column(db.String(20), nullable=True)  # monthly, quarterly, annually
    default_amount = db.Column(db.Numeric(10, 2), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    fees = db.relationship('Fee', back_populates='fee_type', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<FeeType {self.name}>'


class InstallmentPlan(db.Model):
    """Payment installment plans for fees"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    number_of_installments = db.Column(db.Integer, nullable=False)
    installment_amount = db.Column(db.Numeric(10, 2), nullable=False)
    frequency = db.Column(db.String(20), default='monthly')  # monthly, quarterly
    start_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    installments = db.relationship('Installment', back_populates='plan', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<InstallmentPlan {self.name} - {self.number_of_installments} installments>'


class Installment(db.Model):
    """Individual installment payments"""
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('installment_plan.id'), nullable=False)
    installment_number = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    paid = db.Column(db.Boolean, default=False)
    paid_date = db.Column(db.Date, nullable=True)
    late_fee = db.Column(db.Numeric(10, 2), default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    plan = db.relationship('InstallmentPlan', back_populates='installments')

    def __repr__(self):
        return f'<Installment {self.installment_number} - {self.amount} due {self.due_date}>'


class Discount(db.Model):
    """Fee discounts and waivers"""
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    fee_id = db.Column(db.Integer, db.ForeignKey('fee.id'), nullable=True)  # Specific fee or general
    discount_type = db.Column(db.String(20), nullable=False)  # percentage, fixed_amount
    discount_value = db.Column(db.Numeric(10, 2), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.String(100), nullable=True)
    valid_from = db.Column(db.Date, nullable=True)
    valid_until = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    student = db.relationship('Student', backref='discounts')
    fee = db.relationship('Fee')

    def __repr__(self):
        return f'<Discount {self.discount_type} - {self.discount_value} for student {self.student_id}>'


class Receipt(db.Model):
    """Payment receipts for record keeping"""
    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payment.id'), nullable=False)
    receipt_number = db.Column(db.String(50), unique=True, nullable=False)
    issued_date = db.Column(db.DateTime, default=db.func.current_timestamp())
    issued_to = db.Column(db.String(200), nullable=False)  # Student/Parent name
    parent_name = db.Column(db.String(200), nullable=True)  # Snapshot of parent/guardian name at time of receipt
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    generated_by = db.Column(db.String(100), nullable=True)

    payment = db.relationship('Payment', back_populates='receipts')

    def __repr__(self):
        return f'<Receipt {self.receipt_number} - {self.total_amount}>'


class Reminder(db.Model):
    """Automated payment reminders"""
    id = db.Column(db.Integer, primary_key=True)
    fee_id = db.Column(db.Integer, db.ForeignKey('fee.id'), nullable=False)
    reminder_type = db.Column(db.String(20), nullable=False)  # email, sms, both
    scheduled_date = db.Column(db.DateTime, nullable=False)
    sent_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, sent, failed
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    fee = db.relationship('Fee')

    def __repr__(self):
        return f'<Reminder {self.reminder_type} for fee {self.fee_id} on {self.scheduled_date}>'


class Fee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    fee_type_id = db.Column(db.Integer, db.ForeignKey('fee_type.id'), nullable=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    paid = db.Column(db.Boolean, default=False)
    payment_date = db.Column(db.Date, nullable=True)
    installment_plan_id = db.Column(db.Integer, db.ForeignKey('installment_plan.id'), nullable=True)

    # Enhanced fields
    category = db.Column(db.String(50), nullable=True)  # tuition, exam, transport, etc.
    academic_year = db.Column(db.String(20), nullable=True)
    semester = db.Column(db.String(20), nullable=True)
    priority = db.Column(db.String(20), default='normal')  # high, normal, low
    late_fee_applicable = db.Column(db.Boolean, default=True)
    late_fee_rate = db.Column(db.Numeric(5, 2), default=0)  # Percentage per day/week
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Parent/Guardian information snapshot for receipts
    father_name = db.Column(db.String(120), nullable=True)  # Snapshot at fee creation
    mother_name = db.Column(db.String(120), nullable=True)  # Snapshot at fee creation
    guardian_name = db.Column(db.String(120), nullable=True)  # Snapshot at fee creation
    
    # Payment and tax settings
    payment_method = db.Column(db.String(50), nullable=True)  # cash, card, online, cheque
    tax_applicable = db.Column(db.Boolean, default=False)
    tax_percentage = db.Column(db.Numeric(5, 2), default=0)
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    
    # Premium features flags
    auto_reminder_enabled = db.Column(db.Boolean, default=True)
    online_payment_enabled = db.Column(db.Boolean, default=True)
    receipt_auto_generate = db.Column(db.Boolean, default=True)
    
    # Photo field for storing fee receipt/document photos
    photo = db.Column(db.String(255), nullable=True)

    student = db.relationship('Student', back_populates='fees')
    payments = db.relationship('Payment', back_populates='fee', cascade='all, delete-orphan')
    fee_type = db.relationship('FeeType', back_populates='fees')
    installment_plan = db.relationship('InstallmentPlan', backref='fees')
    discounts = db.relationship('Discount', overlaps="fee", cascade='all, delete-orphan')
    reminders = db.relationship('Reminder', overlaps="fee", cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Fee {self.id}: {self.student.name if self.student else "Unknown"} - {self.amount}>'

class ClassFee(db.Model):
    """Class-based fee structure that applies to all students in a class"""
    __tablename__ = 'class_fees'
    
    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    fee_type_id = db.Column(db.Integer, db.ForeignKey('fee_type.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.String(20), nullable=True)
    
    # Admin adjustment fields
    base_amount = db.Column(db.Numeric(10, 2), nullable=False)  # Original fixed amount
    adjustment_amount = db.Column(db.Numeric(10, 2), default=0)  # Admin can adjust (+/-)
    adjustment_reason = db.Column(db.Text, nullable=True)  # Reason for adjustment
    adjusted_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    adjusted_at = db.Column(db.DateTime, nullable=True)
    
    # Fee settings
    due_date = db.Column(db.Date, nullable=True)
    late_fee_applicable = db.Column(db.Boolean, default=True)
    late_fee_rate = db.Column(db.Numeric(5, 2), default=0)  # Percentage per day/week
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationships
    classroom = db.relationship('Classroom', backref='class_fees')
    fee_type = db.relationship('FeeType', backref='class_fees')
    adjusted_by_user = db.relationship('User', foreign_keys=[adjusted_by])
    
    @property
    def current_amount(self):
        """Calculate current amount including adjustments"""
        return float(self.base_amount + self.adjustment_amount)
    
    def __repr__(self):
        return f'<ClassFee {self.classroom.name if self.classroom else "Unknown"} - {self.fee_type.name if self.fee_type else "Unknown"}: {self.current_amount}>'

    @property
    def status(self):
        """Return payment status: paid, pending, or overdue"""
        if self.paid:
            return 'paid'
        if self.due_date and date.today() > self.due_date:
            return 'overdue'
        return 'pending'

    @property
    def total_discount(self):
        """Calculate total discount applied to this fee"""
        total = 0
        for discount in self.discounts:
            if discount.is_active:
                if discount.discount_type == 'percentage':
                    total += (self.amount * discount.discount_value / 100)
                elif discount.discount_type == 'fixed_amount':
                    total += discount.discount_value
        return total

    @property
    def final_amount(self):
        """Amount after discounts"""
        return max(0, self.amount - self.total_discount)

    @property
    def total_paid(self):
        """Total amount paid against this fee"""
        return sum((payment.amount or 0) for payment in self.payments)

    @property
    def remaining_amount(self):
        """Outstanding amount after payments and discounts"""
        remaining = (self.final_amount or 0) - (self.total_paid or 0)
        return remaining if remaining > 0 else 0

    @property
    def days_overdue(self):
        """Calculate days overdue if unpaid"""
        if self.paid or not self.due_date:
            return 0
        today = date.today()
        if today > self.due_date:
            return (today - self.due_date).days
        return 0

    @property
    def advance_amount(self):
        """Calculate advance amount if overpaid"""
        advance = (self.total_paid or 0) - (self.final_amount or 0)
        return advance if advance > 0 else 0

    @property
    def payment_status(self):
        """Return detailed payment status"""
        if self.advance_amount > 0:
            return 'advance'
        elif self.remaining_amount == 0:
            return 'paid'
        elif self.days_overdue > 0:
            return 'overdue'
        else:
            return 'pending'

    def process_payment(self, payment_amount, payment_method='cash', transaction_id=None):
        """
        Process a payment and automatically update fee status
        """
        try:
            # Create payment record
            payment = Payment(
                fee_id=self.id,
                amount=payment_amount,
                payment_method=payment_method,
                transaction_id=transaction_id,
                paid_on=date.today()
            )
            
            # Add payment to database
            db.session.add(payment)
            
            # Update fee status based on payment
            if self.remaining_amount <= payment_amount:
                self.paid = True
                self.paid_on = date.today()
            
            # Commit changes
            db.session.commit()
            
            # Log the payment processing
            from utils import log_activity
            log_activity(
                f'Payment processed: ₹{payment_amount} for fee {self.id}. Status: {self.payment_status}',
                'success'
            )
            
            return {
                'success': True,
                'payment_id': payment.id,
                'remaining_amount': self.remaining_amount,
                'advance_amount': self.advance_amount,
                'status': self.payment_status
            }
            
        except Exception as e:
            db.session.rollback()
            from utils import log_activity
            log_activity(
                f'Payment processing failed: {str(e)}',
                'error'
            )
            return {
                'success': False,
                'error': str(e)
            }

    def get_payment_summary(self):
        """Get complete payment summary for this fee"""
        return {
            'fee_id': self.id,
            'total_amount': float(self.amount or 0),
            'discount_amount': float(self.total_discount),
            'final_amount': float(self.final_amount),
            'total_paid': float(self.total_paid),
            'remaining_amount': float(self.remaining_amount),
            'advance_amount': float(self.advance_amount),
            'status': self.payment_status,
            'due_date': self.due_date.strftime('%Y-%m-%d') if self.due_date else None,
            'days_overdue': self.days_overdue,
            'payments': [
                {
                    'id': p.id,
                    'amount': float(p.amount),
                    'paid_on': p.paid_on.strftime('%Y-%m-%d'),
                    'method': p.payment_method,
                    'transaction_id': p.transaction_id
                }
                for p in self.payments
            ]
        }

    @property
    def late_fee_amount(self):
        """Calculate late fee based on overdue days"""
        if not self.late_fee_applicable or self.days_overdue == 0:
            return 0
        # Assuming daily late fee calculation
        return self.final_amount * (self.late_fee_rate / 100) * self.days_overdue


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fee_id = db.Column(db.Integer, db.ForeignKey('fee.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    paid_on = db.Column(db.Date, default=date.today)
    transaction_id = db.Column(db.String(100), unique=True, nullable=True)  # Unique transaction ID
    payment_method = db.Column(db.String(50), nullable=True)  # cash, bank, qr, etc.

    fee = db.relationship('Fee', back_populates='payments')
    receipts = db.relationship('Receipt', back_populates='payment', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Payment {self.id} fee={self.fee_id} amount={self.amount} txn={self.transaction_id}>'


class Salary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), default='pending')  # 'pending', 'paid', 'overdue', 'cancelled'
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relationships
    teacher = db.relationship('Teacher', backref='salaries')

    # Professional Salary Components
    base_salary = db.Column(db.Numeric(10, 2), nullable=True)
    house_rent_allowance = db.Column(db.Numeric(10, 2), default=0)
    conveyance_allowance = db.Column(db.Numeric(10, 2), default=0)
    medical_allowance = db.Column(db.Numeric(10, 2), default=0)
    lta = db.Column(db.Numeric(10, 2), default=0)  # Leave Travel Allowance
    other_allowances = db.Column(db.Numeric(10, 2), default=0)
    performance_bonus = db.Column(db.Numeric(10, 2), default=0)
    professional_development = db.Column(db.Numeric(10, 2), default=0)
    overtime_pay = db.Column(db.Numeric(10, 2), default=0)
    special_allowance = db.Column(db.Numeric(10, 2), default=0)

    # Deductions
    professional_tax = db.Column(db.Numeric(10, 2), default=0)
    provident_fund = db.Column(db.Numeric(10, 2), default=0)
    insurance = db.Column(db.Numeric(10, 2), default=0)
    other_deductions = db.Column(db.Numeric(10, 2), default=0)

    # Premium Professional Features
    variable_pay = db.Column(db.Numeric(10, 2), default=0)  # Variable pay/commission amount
    variable_pay_percentage = db.Column(db.Numeric(5, 2), default=0)  # Variable pay percentage
    stock_options = db.Column(db.Numeric(10, 2), default=0)  # Stock options/ESOP value
    shift_allowance = db.Column(db.Numeric(10, 2), default=0)  # Shift/night allowance
    project_allowance = db.Column(db.Numeric(10, 2), default=0)  # Project allowance
    certification_bonus = db.Column(db.Numeric(10, 2), default=0)  # Certification bonus
    training_allowance = db.Column(db.Numeric(10, 2), default=0)  # Training allowance
    gratuity = db.Column(db.Numeric(10, 2), default=0)  # Gratuity (employer contribution)
    employer_epf = db.Column(db.Numeric(10, 2), default=0)  # Employer EPF contribution
    health_insurance_premium = db.Column(db.Numeric(10, 2), default=0)  # Health insurance premium
    life_insurance = db.Column(db.Numeric(10, 2), default=0)  # Life insurance coverage

    # Tax Optimization & Savings
    tax_saving_80c = db.Column(db.Numeric(10, 2), default=0)  # Tax saving investments (80C)
    tax_saving_80d = db.Column(db.Numeric(10, 2), default=0)  # Medical insurance (80D)

    # Previous Employment & History
    previous_salary = db.Column(db.Numeric(10, 2), nullable=True)  # Previous annual salary
    salary_revision_percentage = db.Column(db.Numeric(5, 2), nullable=True)  # Salary revision percentage

    # Performance & Department
    department = db.Column(db.String(50), nullable=True)  # Department/Location
    performance_rating = db.Column(db.String(20), nullable=True)  # Performance rating (1-5)

    # Administrative Details
    salary_scale = db.Column(db.String(50), nullable=True)  # e.g., 'Entry Level', 'Senior'
    pay_grade = db.Column(db.String(20), nullable=True)  # e.g., 'Grade A', 'Grade B'
    pay_period = db.Column(db.String(20), default='monthly')  # 'monthly', 'weekly', 'bi-weekly', 'quarterly', 'annually'
    bank_account = db.Column(db.String(50), nullable=True)
    payment_method = db.Column(db.String(30), nullable=True)  # 'bank_transfer', 'cheque', 'cash', 'direct_deposit'

    def __repr__(self):
        return f'<Salary {self.id} teacher={self.teacher_id} amount={self.amount} status={self.status}>'

    @property
    def gross_earnings(self):
        """Calculate total gross earnings"""
        return (self.base_salary or 0) + self.house_rent_allowance + self.conveyance_allowance + \
               self.medical_allowance + self.lta + self.other_allowances + self.performance_bonus + \
               self.professional_development + self.overtime_pay + self.special_allowance

    @property
    def total_deductions(self):
        """Calculate total deductions"""
        return self.professional_tax + self.provident_fund + self.insurance + self.other_deductions

    @property
    def net_salary(self):
        """Calculate net salary after all deductions"""
        return self.gross_earnings - self.total_deductions



class Parent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    relation = db.Column(db.String(50), nullable=True)
    secret_key = db.Column(db.String(6), nullable=True, unique=True)  # 6-digit secret key for parent portal access
    
    user = db.relationship('User', backref=db.backref('parent_profile', uselist=False))
    student = db.relationship('Student', backref='parents')
    
    def generate_secret_key(self):
        """Generate a 6-digit secret key"""
        import random
        self.secret_key = f"{random.randint(100000, 999999)}"
        return self.secret_key
    
    def verify_secret_key(self, key):
        """Verify the provided secret key"""
        return self.secret_key == key

class ParentNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parent.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='general')
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    parent = db.relationship('Parent', backref='notifications')


class StudentLeave(db.Model):
    """Student leave requests submitted by parents to class teachers."""
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('parent.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=True)
    
    # Reason metadata
    reason_type = db.Column(db.String(50), nullable=False)  # urgent_home, fever_night, urgent_many_days
    days = db.Column(db.Integer, nullable=True)  # Only used when urgent_many_days is selected
    
    # Optional free-text note (for future expansion)
    note = db.Column(db.Text, nullable=True)
    
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, cancelled
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    student = db.relationship('Student', backref='leave_requests')
    parent = db.relationship('Parent', backref='leave_requests')
    teacher = db.relationship('Teacher', backref='student_leaves')

class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    audience = db.Column(db.String(50), default='all')
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    author = db.relationship('User')

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=True)
    subject = db.Column(db.String(200), nullable=True)  # Renamed from title to subject to match template
    status = db.Column(db.String(20), default='active')
    priority = db.Column(db.String(20), default='normal')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    last_message_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    messages = db.relationship('Message', backref='conversation_ref', cascade='all, delete-orphan')
    teacher = db.relationship('Teacher', backref='conversations')
    student = db.relationship('Student', backref='conversations')

    @property
    def title(self):
        return self.subject

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_messages')
    conversation = db.relationship('Conversation', backref='message_list')
    
    def __repr__(self):
        return f'<Message {self.id} from_user={self.sender_id} to_user={self.recipient_id}>'

class Setting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info')  # info, success, warning, error, message, payment
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='received_notifications')
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_notifications')
    
    def __repr__(self):
        return f'<Notification {self.id} from_user={self.sender_id} to_user={self.user_id} type={self.type}>'

class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp(), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    category = db.Column(db.String(50), nullable=False) # e.g., 'success', 'danger', 'info', 'warning'
    message = db.Column(db.Text, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True) # IPv4 or IPv6 - Primary IP
    remote_addr = db.Column(db.String(45), nullable=True) # Direct remote address
    x_forwarded_for = db.Column(db.String(255), nullable=True) # Full X-Forwarded-For chain
    x_real_ip = db.Column(db.String(45), nullable=True) # X-Real-IP header
    x_client_ip = db.Column(db.String(45), nullable=True) # X-Client-IP header
    ip_type = db.Column(db.String(20), nullable=True) # 'public', 'private', 'local'
    user_agent = db.Column(db.Text, nullable=True) # User agent string
    additional_data = db.Column(db.Text, nullable=True) # JSON data for additional tracking info
    
    user = db.relationship('User', backref='activity_logs')

    def __repr__(self):
        return f'<ActivityLog {self.category}: {self.message[:50]}>'

class Complaint(db.Model):
    __tablename__ = 'complaints'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Complaint Details
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # academic, facility, behavior, other
    priority = db.Column(db.String(20), default='normal')  # normal, high, urgent
    
    # Relationships
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender_type = db.Column(db.String(20), nullable=False)  # parent, student
    
    # Recipient (Admin or Teacher)
    recipient_type = db.Column(db.String(20), nullable=False)  # admin, teacher
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Teacher ID if recipient is teacher
    
    # Student Information (if complaint is about student)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=True)
    
    # Status and Tracking
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, resolved, rejected
    response = db.Column(db.Text, nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)
    responded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_complaints')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_complaints')
    student = db.relationship('Student', backref='complaints')
    responder = db.relationship('User', foreign_keys=[responded_by], backref='responded_complaints')
    
    def __repr__(self):
        return f'<Complaint {self.id}: {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'priority': self.priority,
            'sender_type': self.sender_type,
            'recipient_type': self.recipient_type,
            'status': self.status,
            'response': self.response,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'responded_at': self.responded_at.strftime('%Y-%m-%d %H:%M:%S') if self.responded_at else None,
            'sender_name': self.sender.name if self.sender else None,
            'recipient_name': self.recipient.name if self.recipient else None,
            'student_name': self.student.full_name() if self.student else None,
            'responder_name': self.responder.name if self.responder else None
        }
