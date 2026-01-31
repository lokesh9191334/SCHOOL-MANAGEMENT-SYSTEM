from datetime import datetime
from app import db
from models import User

class Complaint(db.Model):
    __tablename__ = 'complaints'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Complaint Details
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # academic, facility, behavior, other
    priority = db.Column(db.String(20), default='normal')  # normal, high, urgent
    
    # Relationships
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sender_type = db.Column(db.String(20), nullable=False)  # parent, student
    
    # Recipient (Admin or Teacher)
    recipient_type = db.Column(db.String(20), nullable=False)  # admin, teacher
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Teacher ID if recipient is teacher
    
    # Student Information (if complaint is about student)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=True)
    
    # Status and Tracking
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, resolved, rejected
    response = db.Column(db.Text, nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)
    responded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
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
