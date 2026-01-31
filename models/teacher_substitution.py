from app import db
from datetime import datetime, date, time
from models import User, Teacher, Subject, Classroom

class TeacherSubstitution(db.Model):
    __tablename__ = 'teacher_substitution'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Original teacher details
    original_teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    original_teacher = db.relationship('Teacher', foreign_keys=[original_teacher_id], backref='absences')
    
    # Substitute teacher details
    substitute_teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    substitute_teacher = db.relationship('Teacher', foreign_keys=[substitute_teacher_id], backref='substitutions')
    
    # Subject and class details
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='substitutions')
    
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    classroom = db.relationship('Classroom', backref='substitutions')
    
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Created by
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_by = db.relationship('User', backref='created_substitutions')
    
    def __repr__(self):
        return f'<Substitution {self.original_teacher.name} -> {self.substitute_teacher.name} on {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'original_teacher': self.original_teacher.name if self.original_teacher else None,
            'substitute_teacher': self.substitute_teacher.name if self.substitute_teacher else None,
            'subject': self.subject.name if self.subject else None,
            'classroom': self.classroom.name if self.classroom else None,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'period_number': self.period_number,
            'status': self.status,
            'reason': self.reason,
            'absence_reason': self.absence_reason,
            'notification_sent': self.notification_sent,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

class TeacherSchedule(db.Model):
    __tablename__ = 'teacher_schedule'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Teacher and subject
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher.id'), nullable=False)
    teacher = db.relationship('Teacher', backref='schedule')
    
    subject_id = db.Column(db.Integer, db.ForeignKey('subject.id'), nullable=False)
    subject = db.relationship('Subject', backref='schedule')
    
    # Class and room
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    classroom = db.relationship('Classroom', backref='schedule')
    
    # Schedule details
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 1=Tuesday, etc.
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    period_number = db.Column(db.Integer, nullable=False)
    room_number = db.Column(db.String(50), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Schedule {self.teacher.name} - {self.subject.name} - {self.classroom.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'teacher': self.teacher.name if self.teacher else None,
            'subject': self.subject.name if self.subject else None,
            'classroom': self.classroom.name if self.classroom else None,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'period_number': self.period_number,
            'room_number': self.room_number,
            'is_active': self.is_active
        }

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Leave {self.teacher.name} - {self.leave_type} from {self.start_date} to {self.end_date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'teacher': self.teacher.name if self.teacher else None,
            'leave_type': self.leave_type,
            'start_date': self.start_date.strftime('%Y-%m-%d') if self.start_date else None,
            'end_date': self.end_date.strftime('%Y-%m-%d') if self.end_date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'reason': self.reason,
            'status': self.status,
            'approved_by': self.approved_by.name if self.approved_by else None,
            'approved_at': self.approved_at.strftime('%Y-%m-%d %H:%M:%S') if self.approved_at else None,
            'substitution_created': self.substitution_created,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }
