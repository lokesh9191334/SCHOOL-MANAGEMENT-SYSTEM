from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from models import User, db
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/users')
@login_required
def manage_users():
    """Manage all users - Admin only"""
    if current_user.role != 'admin':
        flash('Access denied. Admin privileges required.', 'danger')
        return redirect(url_for('dashboard.index'))
    
    users = User.query.all()
    return render_template('admin/manage_users.html', users=users)

@admin_bp.route('/delete-user/<int:user_id>', methods=['POST'])
@login_required
def delete_user(user_id):
    """Delete a user - Admin only"""
    if current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
    
    try:
        user = User.query.get_or_404(user_id)
        
        # Prevent admin from deleting themselves
        if user.id == current_user.id:
            return jsonify({'success': False, 'message': 'You cannot delete your own account.'}), 400
        
        # Delete associated profiles based on role
        if user.role == 'parent':
            from models import Parent
            parent = Parent.query.filter_by(user_id=user.id).first()
            if parent:
                db.session.delete(parent)
        elif user.role == 'teacher':
            from models import Teacher
            teacher = Teacher.query.filter_by(user_id=user.id).first()
            if teacher:
                db.session.delete(teacher)
        
        # Delete the user
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'User {user.name} has been deleted successfully.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False, 
            'message': f'Error deleting user: {str(e)}'
        }), 500

@admin_bp.route('/clear-all-users', methods=['POST'])
@login_required
def clear_all_users():
    """Clear all users from database - Admin only"""
    if current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
    
    try:
        from models import User, Parent, Teacher, Student, School, db
        
        # Get counts before deletion
        user_count = User.query.count()
        parent_count = Parent.query.count()
        teacher_count = Teacher.query.count()
        student_count = Student.query.count()
        school_count = School.query.count()
        
        # Delete all records in order to avoid foreign key constraints
        # Start with dependent records
        from models import (
            Attendance, Fee, StudentLeave, TeacherLeave, 
            Complaint, Notification, Message, Payment, 
            Receipt, Salary, Timetable, Subject, Classroom
        )
        
        # Delete attendance records
        Attendance.query.delete()
        
        # Delete fee records
        Fee.query.delete()
        
        # Delete leave records
        StudentLeave.query.delete()
        TeacherLeave.query.delete()
        
        # Delete complaints
        Complaint.query.delete()
        
        # Delete notifications
        Notification.query.delete()
        
        # Delete messages
        Message.query.delete()
        
        # Delete payments
        Payment.query.delete()
        
        # Delete receipts
        Receipt.query.delete()
        
        # Delete salaries
        Salary.query.delete()
        
        # Delete timetables
        Timetable.query.delete()
        
        # Delete subjects
        Subject.query.delete()
        
        # Delete classrooms
        Classroom.query.delete()
        
        # Delete student records
        Student.query.delete()
        
        # Delete parent profiles
        Parent.query.delete()
        
        # Delete teacher profiles
        Teacher.query.delete()
        
        # Delete school records
        School.query.delete()
        
        # Delete user records
        User.query.delete()
        
        # Commit all changes
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {user_count} users, {parent_count} parents, {teacher_count} teachers, {student_count} students, and {school_count} schools. All data has been cleared.'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error clearing users: {str(e)}'
        }), 500

@admin_bp.route('/remove-existing-users')
@login_required
def remove_existing_users():
    """Show page to remove existing users - Admin only"""
    if current_user.role != 'admin':
        flash('Access denied. Admin privileges required.', 'danger')
        return redirect(url_for('dashboard.index'))
    
    from models import User, db
    
    # Get all users
    users = User.query.all()
    
    return render_template('admin/remove_existing_users.html', users=users)

@admin_bp.route('/clear-users-page')
@login_required
def clear_users_page():
    """Show page to clear all users - Admin only"""
    if current_user.role != 'admin':
        flash('Access denied. Admin privileges required.', 'danger')
        return redirect(url_for('dashboard.index'))
    
    from models import User, db
    
    # Get user statistics
    total_users = User.query.count()
    admin_count = User.query.filter_by(role='admin').count()
    teacher_count = User.query.filter_by(role='teacher').count()
    parent_count = User.query.filter_by(role='parent').count()
    
    return render_template('admin/clear_users.html', 
                         total_users=total_users,
                         admin_count=admin_count,
                         teacher_count=teacher_count,
                         parent_count=parent_count)

@admin_bp.route('/bulk-delete-users', methods=['POST'])
@login_required
def bulk_delete_users():
    """Delete multiple users - Admin only"""
    if current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
    
    try:
        user_ids = request.json.get('user_ids', [])
        
        if not user_ids:
            return jsonify({'success': False, 'message': 'No users selected for deletion.'}), 400
        
        # Prevent admin from deleting themselves
        if current_user.id in user_ids:
            return jsonify({'success': False, 'message': 'You cannot delete your own account.'}), 400
        
        deleted_count = 0
        errors = []
        
        for user_id in user_ids:
            try:
                user = User.query.get(user_id)
                if user:
                    # Delete associated profiles
                    if user.role == 'parent':
                        from models import Parent
                        parent = Parent.query.filter_by(user_id=user.id).first()
                        if parent:
                            db.session.delete(parent)
                    elif user.role == 'teacher':
                        from models import Teacher
                        teacher = Teacher.query.filter_by(user_id=user.id).first()
                        if teacher:
                            db.session.delete(teacher)
                    
                    db.session.delete(user)
                    deleted_count += 1
                    
            except Exception as e:
                errors.append(f"Error deleting user {user_id}: {str(e)}")
        
        if deleted_count > 0:
            db.session.commit()
            
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} users.',
            'deleted_count': deleted_count,
            'errors': errors
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error deleting users: {str(e)}'
        }), 500
