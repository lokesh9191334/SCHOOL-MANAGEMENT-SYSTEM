from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify, current_app
from flask_login import login_required, current_user
from app import db
from utils import log_activity
from models import Complaint, Student, Teacher, User
from datetime import datetime

complaints_bp = Blueprint('complaints', __name__)

@complaints_bp.route('/complaints', methods=['GET', 'POST'])
@login_required
def complaints():
    """Handle complaint submission and viewing for parents"""
    if current_user.role != 'parent':
        flash('This page is only accessible to parents.', 'error')
        return redirect(url_for('parents.portal'))
    
    if request.method == 'POST':
        # Get form data
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        category = request.form.get('category', '')
        priority = request.form.get('priority', 'normal')
        recipient_type = request.form.get('recipient_type', 'admin')
        recipient_id = request.form.get('recipient_id', '')
        student_id = request.form.get('student_id', '')
        
        # Validation
        if not title or not description or not category:
            flash('Please fill in all required fields.', 'error')
            return redirect(url_for('complaints.complaints'))
        
        if len(title) < 5:
            flash('Title must be at least 5 characters long.', 'error')
            return redirect(url_for('complaints.complaints'))
        
        if len(description) < 20:
            flash('Description must be at least 20 characters long.', 'error')
            return redirect(url_for('complaints.complaints'))
        
        # Create complaint
        complaint = Complaint(
            title=title,
            description=description,
            category=category,
            priority=priority,
            sender_id=current_user.id,
            sender_type='parent',
            recipient_type=recipient_type,
            recipient_id=int(recipient_id) if recipient_id and recipient_type == 'teacher' else None,
            student_id=int(student_id) if student_id else None
        )
        
        db.session.add(complaint)
        db.session.commit()
        
        log_activity('info', f'Complaint submitted: {title}', user_id=current_user.id)
        flash('Complaint submitted successfully! We will respond within 24-48 hours.', 'success')
        
        return redirect(url_for('complaints.my_complaints'))
    
    # GET request - show complaint form
    teachers = Teacher.query.all()
    students = Student.query.filter_by(parent_id=current_user.id).all()
    
    return render_template('complaints/complaint_form.html', 
                         teachers=teachers, 
                         students=students)

@complaints_bp.route('/my-complaints')
@login_required
def my_complaints():
    """Show parent's complaint history"""
    if current_user.role != 'parent':
        flash('This page is only accessible to parents.', 'error')
        return redirect(url_for('parents.portal'))
    
    complaints = Complaint.query.filter_by(sender_id=current_user.id, sender_type='parent')\
                             .order_by(Complaint.created_at.desc()).all()
    
    return render_template('complaints/my_complaints.html', complaints=complaints)

@complaints_bp.route('/admin/complaints')
@login_required
def admin_complaints():
    """Show all complaints for admin with full student information"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    status = request.args.get('status', 'all')
    query = Complaint.query
    
    if status != 'all':
        query = query.filter_by(status=status)
    
    # Get all complaints with student information
    complaints = query.order_by(Complaint.created_at.desc()).all()
    
    # Add student information to each complaint
    complaints_with_info = []
    for complaint in complaints:
        complaint_data = {
            'id': complaint.id,
            'title': complaint.title,
            'description': complaint.description,
            'category': complaint.category,
            'priority': complaint.priority,
            'status': complaint.status,
            'response': complaint.response,
            'responded_at': complaint.responded_at,
            'created_at': complaint.created_at,
            'sender_type': complaint.sender_type,
            'sender_name': complaint.sender.name if complaint.sender else 'Unknown',
            'recipient_type': complaint.recipient_type,
            'recipient_name': complaint.recipient.name if complaint.recipient else 'Admin',
            'student': None
        }
        
        # Add student information if available
        if complaint.student:
            student = complaint.student
            parent = student.parent if student else None
            
            complaint_data['student'] = {
                'name': student.name,
                'class_name': student.class_name,
                'section': student.section,
                'roll_number': student.roll_number,
                'parent': {
                    'father_name': parent.father_name if parent and parent.father_name else 'Not specified',
                    'mother_name': parent.mother_name if parent and parent.mother_name else 'Not specified',
                    'phone': parent.phone if parent else 'Not specified',
                    'email': parent.email if parent else 'Not specified'
                } if parent else None
            }
        
        complaints_with_info.append(complaint_data)
    
    return render_template('complaints/admin_complaints.html', 
                         complaints=complaints_with_info, 
                         status=status)

@complaints_bp.route('/teacher/complaints')
@login_required
def teacher_complaints():
    """Show complaints for teachers"""
    if current_user.role != 'teacher':
        flash('This page is only accessible to teachers.', 'error')
        return redirect(url_for('dashboard.index'))
    
    status = request.args.get('status', 'all')
    teacher = Teacher.query.filter_by(user_id=current_user.id).first()
    
    if not teacher:
        flash('No teacher profile found.', 'error')
        return redirect(url_for('dashboard.index'))
    
    query = Complaint.query.filter_by(recipient_type='teacher', recipient_id=current_user.id)
    
    if status != 'all':
        query = query.filter_by(status=status)
    
    complaints = query.order_by(Complaint.created_at.desc()).all()
    
    return render_template('complaints/teacher_complaints.html', 
                         complaints=complaints, 
                         status=status,
                         teacher=teacher)

@complaints_bp.route('/complaint/<int:complaint_id>/respond', methods=['POST'])
@login_required
def respond_complaint(complaint_id):
    """Respond to a complaint"""
    complaint = Complaint.query.get_or_404(complaint_id)
    
    # Check authorization
    if current_user.role == 'admin' and complaint.recipient_type != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    if current_user.role == 'teacher' and (complaint.recipient_type != 'teacher' or complaint.recipient_id != current_user.id):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    response = request.form.get('response', '').strip()
    status = request.form.get('status', 'in_progress')
    
    if not response:
        return jsonify({'success': False, 'message': 'Response cannot be empty'}), 400
    
    # Update complaint
    complaint.response = response
    complaint.status = status
    complaint.responded_at = datetime.utcnow()
    complaint.responded_by = current_user.id
    
    db.session.commit()
    
    log_activity('info', f'Complaint {complaint_id} responded by {current_user.role}', user_id=current_user.id)
    
    return jsonify({'success': True, 'message': 'Response submitted successfully'})

@complaints_bp.route('/complaint/<int:complaint_id>/status', methods=['POST'])
@login_required
def update_complaint_status(complaint_id):
    """Update complaint status"""
    complaint = Complaint.query.get_or_404(complaint_id)
    
    # Check authorization
    if current_user.role == 'admin' and complaint.recipient_type != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    if current_user.role == 'teacher' and (complaint.recipient_type != 'teacher' or complaint.recipient_id != current_user.id):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    status = request.form.get('status')
    
    if status not in ['pending', 'in_progress', 'resolved', 'rejected']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400
    
    complaint.status = status
    if status in ['resolved', 'rejected']:
        complaint.responded_at = datetime.utcnow()
        complaint.responded_by = current_user.id
    
    db.session.commit()
    
    log_activity('info', f'Complaint {complaint_id} status updated to {status} by {current_user.role}', user_id=current_user.id)
    
    return jsonify({'success': True, 'message': 'Status updated successfully'})
