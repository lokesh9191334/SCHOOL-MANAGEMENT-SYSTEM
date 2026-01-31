from app import db
from datetime import datetime, time

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
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    def __repr__(self):
        return f'<TeacherTimeTableEntry {self.day_of_week} - Period {self.period_number} - {self.subject.name}>'
