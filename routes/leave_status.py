from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from datetime import datetime, date
from models import TeacherLeave, StudentLeave, Teacher, Student, Parent, User, db
from utils import log_activity

leave_status_bp = Blueprint('leave_status', __name__)

@leave_status_bp.route('/leave-status')
@login_required
def leave_status():
    """Main leave status page - shows different views based on user role"""
    
    if current_user.role == 'teacher':
        return teacher_leave_status()
    elif current_user.role == 'parent':
        return parent_leave_status()
    elif current_user.role == 'admin':
        return admin_leave_status()
    else:
        flash('Access denied', 'error')
        return redirect(url_for('dashboard.index'))

def teacher_leave_status():
    """Show teacher's own leave applications"""
    teacher = Teacher.query.filter_by(user_id=current_user.id).first()
    
    if not teacher:
        flash('Teacher profile not found', 'error')
        return redirect(url_for('dashboard.index'))
    
    leaves = TeacherLeave.query.filter_by(teacher_id=teacher.id)\
        .order_by(TeacherLeave.created_at.desc()).all()
    
    # Format leaves for JSON response
    leaves_data = []
    for leave in leaves:
        leaves_data.append({
            'id': leave.id,
            'leave_type': leave.leave_type,
            'status': leave.status,
            'start_date': leave.start_date.strftime('%d %b %Y'),
            'end_date': leave.end_date.strftime('%d %b %Y'),
            'duration': (leave.end_date - leave.start_date).days + 1,
            'reason': leave.reason or 'No reason provided',
            'applied_on': leave.created_at.strftime('%d %b %Y %H:%M'),
            'approved_by': leave.approved_by.name if leave.approved_by else None,
            'approved_at': leave.approved_at.strftime('%d %b %Y %H:%M') if leave.approved_at else None
        })
    
    return render_template('leave_status/teacher_leave_status.html', 
                         leaves=leaves, leaves_data=leaves_data, teacher=teacher)

def parent_leave_status():
    """Show parent's student leave applications"""
    parent = Parent.query.filter_by(user_id=current_user.id).first()
    
    if not parent:
        flash('Parent profile not found', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all students for this parent
    students = Student.query.filter_by(parent_id=parent.id).all()
    student_ids = [s.id for s in students]
    
    # Get leave requests for all children
    leaves = StudentLeave.query.filter(StudentLeave.student_id.in_(student_ids))\
        .order_by(StudentLeave.created_at.desc()).all()
    
    # Format leaves for JSON response
    leaves_data = []
    for leave in leaves:
        leaves_data.append({
            'id': leave.id,
            'student_name': leave.student.name,
            'leave_type': leave.leave_type,
            'status': leave.status,
            'start_date': leave.start_date.strftime('%d %b %Y'),
            'end_date': leave.end_date.strftime('%d %b %Y'),
            'duration': (leave.end_date - leave.start_date).days + 1,
            'reason': leave.reason or 'No reason provided',
            'applied_on': leave.created_at.strftime('%d %b %Y %H:%M'),
            'teacher_name': leave.teacher.name if leave.teacher else 'Not assigned'
        })
    
    return render_template('leave_status/parent_leave_status.html',
                         leaves=leaves, leaves_data=leaves_data, parent=parent)

def admin_leave_status():
    """Show all leave applications for admin"""
    # Get all teacher leaves
    teacher_leaves = TeacherLeave.query.order_by(TeacherLeave.created_at.desc()).limit(50).all()
    
    # Get all student leaves
    student_leaves = StudentLeave.query.order_by(StudentLeave.created_at.desc()).limit(50).all()
    
    # Format teacher leaves
    teacher_leaves_data = []
    for leave in teacher_leaves:
        teacher_leaves_data.append({
            'id': leave.id,
            'teacher_name': leave.teacher.name,
            'leave_type': leave.leave_type,
            'status': leave.status,
            'start_date': leave.start_date.strftime('%d %b %Y'),
            'end_date': leave.end_date.strftime('%d %b %Y'),
            'duration': (leave.end_date - leave.start_date).days + 1,
            'reason': leave.reason or 'No reason provided',
            'applied_on': leave.created_at.strftime('%d %b %Y %H:%M'),
            'approved_by': leave.approved_by.name if leave.approved_by else None,
            'approved_at': leave.approved_at.strftime('%d %b %Y %H:%M') if leave.approved_at else None
        })
    
    # Format student leaves
    student_leaves_data = []
    for leave in student_leaves:
        student_leaves_data.append({
            'id': leave.id,
            'student_name': leave.student.name,
            'parent_name': leave.parent.name,
            'leave_type': leave.leave_type,
            'status': leave.status,
            'start_date': leave.start_date.strftime('%d %b %Y'),
            'end_date': leave.end_date.strftime('%d %b %Y'),
            'duration': (leave.end_date - leave.start_date).days + 1,
            'reason': leave.reason or 'No reason provided',
            'applied_on': leave.created_at.strftime('%d %b %Y %H:%M'),
            'teacher_name': leave.teacher.name if leave.teacher else 'Not assigned'
        })
    
    return render_template('leave_status/admin_leave_status.html',
                         teacher_leaves=teacher_leaves, 
                         student_leaves=student_leaves,
                         teacher_leaves_data=teacher_leaves_data,
                         student_leaves_data=student_leaves_data)

@leave_status_bp.route('/api/leave-status')
@login_required
def api_leave_status():
    """API endpoint to get leave status data"""
    
    if current_user.role == 'teacher':
        teacher = Teacher.query.filter_by(user_id=current_user.id).first()
        if not teacher:
            return jsonify({'error': 'Teacher profile not found'}), 404
        
        leaves = TeacherLeave.query.filter_by(teacher_id=teacher.id)\
            .order_by(TeacherLeave.created_at.desc()).all()
        
        leaves_data = []
        for leave in leaves:
            leaves_data.append({
                'id': leave.id,
                'leave_type': leave.leave_type,
                'status': leave.status,
                'start_date': leave.start_date.strftime('%d %b %Y'),
                'end_date': leave.end_date.strftime('%d %b %Y'),
                'duration': (leave.end_date - leave.start_date).days + 1,
                'reason': leave.reason or 'No reason provided',
                'applied_on': leave.created_at.strftime('%d %b %Y %H:%M'),
          'approved_by': leave.approved_by.name if leave.approved_by else None,
                'approved_at': leave.approved_at.strftime('%d %b %Y %H:%M') if leave.approved_at else None,
                'admin_comment': getattr(leave, 'admin_comment', None)
            })
        
        return jsonify({
            'leaves': leaves_data,
            'stats': {
                'total': len(leaves_data),
                'pending': len([l for l in leaves_data if l['status'] == 'pending']),
                'approved': len([l for l in leaves_data if l['status'] == 'approved']),
                'rejected': len([l for l in leaves_data if l['status'] == 'rejected'])
            }
        })
    
    elif current_user.role == 'parent':
        parent = Parent.query.filter_by(user_id=current_user.id).first()
        if not parent:
            return jsonify({'error': 'Parent profile not found'}), 404
        
        students = Student.query.filter_by(parent_id=parent.id).all()
        student_ids = [s.id for s in students]
        
        leaves = StudentLeave.query.filter(StudentLeave.student_id.in_(student_ids))\
            .order_by(StudentLeave.created_at.desc()).all()
        
        leaves_data = []
        for leave in leaves:
            leaves_data.append({
                'id': leave.id,
                'student_name': leave.student.name,
                'leave_type': leave.leave_type,
                'status': leave.status,
                'start_date': leave.start_date.strftime('%d %b %Y'),
                'end_date': leave.end_date.strftime('%d %b %Y'),
                'duration': (leave.end_date - leave.start_date).days + 1,
                'reason': leave.reason or 'No reason provided',
                'applied_on': leave.created_at.strftime('%d %b %Y %H:%M'),
                'teacher_name': leave.teacher.name if leave.teacher else 'Not assigned'
            })
        
        return jsonify({
            'leaves': leaves_data,
            'stats': {
                'total': len(leaves_data),
                'pending': len([l for l in leaves_data if l['status'] == 'pending']),
                'approved': len([l for l in leaves_data if l['status'] == 'approved']),
                'rejected': len([l for l in leaves_data if l['status'] == 'rejected'])
            }
        })
    
    else:
        return jsonify({'error': 'Access denied'}), 403
