from app import db
from datetime import datetime, date

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
