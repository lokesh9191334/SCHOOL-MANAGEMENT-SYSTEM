from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from models import (
    Announcement,
    Conversation,
    Message,
    Parent,
    ParentNotification,
    Student,
    Teacher,
    Classroom,
    StudentLeave,
    db,
)

parents_bp = Blueprint('parents', __name__, template_folder='../templates')

@parents_bp.route('/')
@login_required
def portal():
    if request.is_json or request.path.startswith('/api/'):
        profile = current_user.parent_profile
        if isinstance(profile, list):
            profile = profile[0] if profile else None
            
        # Find students linked to this parent
        students_count = 0
        if profile:
            students_count = Student.query.filter(
                (Student.parent_email == current_user.email) |
                (Student.father_name == profile.name) |
                (Student.mother_name == profile.name)
            ).count()
            
        return jsonify({
            'success': True,
            'data': {
                'students_count': students_count,
                'attendance_rate': 95, # Placeholder for now
                'user': {
                    'name': current_user.name,
                    'role': current_user.role,
                    'email': current_user.email
                }
            }
        })
    # Show parent dashboard
    return render_template('parent_dashboard.html')

@parents_bp.route('/student-details')
@login_required
def student_details():
    # Get parent profile
    profile = current_user.parent_profile
    if isinstance(profile, list):
        profile = profile[0] if profile else None
    if not profile:
        p = Parent(
            user_id=current_user.id,
            name=current_user.name or 'Parent',
            email=current_user.email,
            address=getattr(current_user, 'address', None)
        )
        db.session.add(p)
        db.session.commit()
        return redirect(url_for('parents.link_student'))
    
    # Get all students for this parent
    # Find students where parent_email or parent_name matches
    students = Student.query.filter(
        (Student.parent_email == current_user.email) |
        (Student.father_name == profile.name) |
        (Student.mother_name == profile.name)
    ).all()
    
    if not students:
        return redirect(url_for('parents.link_student'))
    
    attendance_rate = 0
    present_days = 0
    total_days = 0
    current_date = datetime.utcnow().date()
    
    return render_template('parents/student_details_multiple.html', 
                       students=students, 
                       attendance_rate=attendance_rate, 
                       present_days=present_days, 
                       total_days=total_days, 
                       current_date=current_date,
                       parent_profile=profile)


def _get_or_create_parent_profile():
    """Helper to get the current user's Parent profile, creating one if missing."""
    profile = current_user.parent_profile
    if isinstance(profile, list):
        profile = profile[0] if profile else None
    if not profile:
        profile = Parent(
            user_id=current_user.id,
            name=current_user.name or 'Parent',
            email=current_user.email,
            address=getattr(current_user, 'address', None)
        )
        db.session.add(profile)
        db.session.commit()
    return profile


@parents_bp.route('/send-leave', methods=['GET', 'POST'])
@login_required
def send_leave():
    """Allow parents to submit a leave request for their child to the class teacher."""
    profile = _get_or_create_parent_profile()

    # Find all students linked to this parent (by email/name or direct relation)
    students = Student.query.filter(
        (Student.parent_email == current_user.email) |
        (Student.father_name == profile.name) |
        (Student.mother_name == profile.name) |
        (Student.id == profile.student_id)
    ).all()

    # Pre-calculate class + incharge for display, so parent knows where leave will go
    student_targets = {}
    for s in students:
        classroom_id = None
        if s.current_class and isinstance(s.current_class, dict):
            classroom_id = s.current_class.get('id')
        if not classroom_id and s.class_id:
            classroom_id = s.class_id

        classroom = Classroom.query.get(classroom_id) if classroom_id else None
        teacher = classroom.class_teacher if classroom and classroom.class_teacher else None

        student_targets[s.id] = {
            'class_name': classroom.name if classroom else None,
            'teacher_name': teacher.name if teacher else None,
        }

    if request.method == 'POST':
        student_id = request.form.get('student_id')
        reason_type = request.form.get('reason_type')
        days_raw = request.form.get('days') or None

        if not student_id or not reason_type:
            flash('Please select student and reason.', 'error')
            return redirect(url_for('parents.send_leave'))

        try:
            student = Student.query.get(int(student_id))
        except Exception:
            student = None

        if not student:
            flash('Selected student not found.', 'error')
            return redirect(url_for('parents.send_leave'))

        # Resolve class teacher (class incharge) for this student via Classroom
        classroom_id = None
        if student.current_class and isinstance(student.current_class, dict):
            classroom_id = student.current_class.get('id')
        if not classroom_id and student.class_id:
            classroom_id = student.class_id

        class_teacher_id = None
        classroom = None
        if classroom_id:
            classroom = Classroom.query.get(classroom_id)
            if classroom and classroom.class_teacher:
                class_teacher_id = classroom.class_teacher.id

        if not class_teacher_id:
            flash('No class incharge assigned for this class yet. Please contact school or admin.', 'error')
            return redirect(url_for('parents.send_leave'))

        days = None
        if reason_type == 'urgent_many_days' and days_raw:
            try:
                days = int(days_raw)
            except ValueError:
                days = None

        leave = StudentLeave(
            student_id=student.id,
            parent_id=profile.id,
            teacher_id=class_teacher_id,
            reason_type=reason_type,
            days=days,
            status='pending',
        )
        db.session.add(leave)
        db.session.commit()

        flash('Leave request sent to class teacher.', 'success')
        return redirect(url_for('parents.portal'))

    return render_template('parents/send_leave.html', students=students, student_targets=student_targets)


@parents_bp.route('/leave-history')
@login_required
def leave_history():
    """Show all leave requests submitted by this parent, with status."""
    profile = _get_or_create_parent_profile()

    leaves = StudentLeave.query.filter_by(parent_id=profile.id).order_by(StudentLeave.created_at.desc()).all()

    return render_template('parents/leave_history.html', leaves=leaves, parent_profile=profile)

@parents_bp.route('/announcements')
@login_required
def announcements():
    announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
    # Mock notifications for the sidebar link
    return render_template('parents/announcements.html', announcements=announcements)

@parents_bp.route('/link-student', methods=['GET', 'POST'])
@login_required
def link_student():
    profile = current_user.parent_profile
    if isinstance(profile, list):
        profile = profile[0] if profile else None
    if not profile:
        p = Parent(
            user_id=current_user.id,
            name=current_user.name or 'Parent',
            email=current_user.email,
            address=getattr(current_user, 'address', None)
        )
        db.session.add(p)
        db.session.commit()
        profile = p
    if request.method == 'POST':
        sid = request.form.get('student_id')
        try:
            sid_int = int(sid)
            student = Student.query.get(sid_int)
            if not student:
                flash('Student not found.', 'error')
            else:
                profile.student_id = student.id
                db.session.commit()
                flash('Student linked successfully.', 'success')
                return redirect(url_for('parents.student_details'))
        except Exception:
            flash('Invalid student selection.', 'error')
    students = Student.query.order_by(Student.name.asc()).all()
    return render_template('parents/link_student.html', students=students)
@parents_bp.route('/messages')
@login_required
def messages():
    conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.updated_at.desc()).all()
    return render_template('parents/messages.html', conversations=conversations)

@parents_bp.route('/conversation/<int:conversation_id>')
@login_required
def view_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    # Security check: ensure current user owns this conversation
    if conversation.user_id != current_user.id:
        flash('Unauthorized access to conversation.', 'error')
        return redirect(url_for('parents.messages'))
    
    return render_template('parents/conversation.html', conversation=conversation)

@parents_bp.route('/new-conversation', methods=['GET', 'POST'])
@login_required
def new_conversation():
    if request.method == 'POST':
        teacher_id = request.form.get('teacher_id')
        subject = request.form.get('subject')
        message_content = request.form.get('message')
        priority = request.form.get('priority', 'normal')

        if not teacher_id or not subject or not message_content:
            flash('Please fill in all fields.', 'error')
            return redirect(url_for('parents.new_conversation'))

        # Create Conversation
        profile = current_user.parent_profile
        if isinstance(profile, list):
            profile = profile[0] if profile else None
        conversation = Conversation(
            user_id=current_user.id,
            teacher_id=teacher_id,
            student_id=profile.student.id if profile and profile.student else None,
            subject=subject,
            priority=priority,
            last_message_at=datetime.utcnow()
        )
        db.session.add(conversation)
        db.session.commit()

        # Create Initial Message
        message = Message(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            recipient_id=conversation.teacher.user_id,
            message=message_content
        )
        db.session.add(message)
        db.session.commit()

        flash('Conversation started successfully.', 'success')
        return redirect(url_for('parents.messages'))

    teachers = Teacher.query.all()
    return render_template('parents/new_conversation.html', teachers=teachers)

@parents_bp.route('/conversation/<int:conversation_id>/reply', methods=['POST'])
@login_required
def reply_to_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    if conversation.user_id != current_user.id:
        flash('Unauthorized access to conversation.', 'error')
        return redirect(url_for('parents.messages'))

    message_content = request.form.get('message_content')
    if not message_content:
        flash('Message content cannot be empty.', 'error')
        return redirect(url_for('parents.view_conversation', conversation_id=conversation.id))

    message = Message(
        conversation_id=conversation.id,
        sender='parent',
        content=message_content
    )
    db.session.add(message)
    conversation.last_message_at = datetime.utcnow()
    db.session.commit()

    flash('Message sent.', 'success')
    return redirect(url_for('parents.view_conversation', conversation_id=conversation.id))

@parents_bp.route('/conversation/<int:conversation_id>/messages', methods=['GET'])
@login_required
def get_conversation_messages(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    if conversation.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    messages = Message.query.filter_by(conversation_id=conversation.id).order_by(Message.created_at.asc()).all()
    messages_data = [{
        'sender': msg.sender,
        'content': msg.content,
        'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for msg in messages]
    
    return jsonify(messages_data)

@parents_bp.route('/documents')
@login_required
def documents():
    return render_template('parents/documents.html')

@parents_bp.route('/notifications')
@login_required
def notifications():
    profile = current_user.parent_profile
    if isinstance(profile, list):
        profile = profile[0] if profile else None
    notifications = []
    if profile:
        notifications = ParentNotification.query.filter_by(parent_id=profile.id).order_by(ParentNotification.created_at.desc()).all()
    return render_template('parents/notifications.html', notifications=notifications)
