from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_required, current_user
from app import db
from utils import log_activity
from models import ClassFee, Classroom, FeeType, User
from datetime import datetime, date

class_fees_bp = Blueprint('class_fees', __name__)

@class_fees_bp.route('/class-fees')
@login_required
def list_class_fees():
    """List all class fees with admin controls"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    academic_year = request.args.get('academic_year', str(datetime.now().year))
    class_fees = ClassFee.query.filter_by(academic_year=academic_year).all()
    
    # Group by class for better display
    fees_by_class = {}
    for fee in class_fees:
        class_name = fee.classroom.name if fee.classroom else 'Unknown'
        if class_name not in fees_by_class:
            fees_by_class[class_name] = []
        fees_by_class[class_name].append(fee)
    
    return render_template('class_fees/list.html', 
                         fees_by_class=fees_by_class,
                         academic_year=academic_year)

@class_fees_bp.route('/class-fees/setup/<int:class_id>', methods=['GET', 'POST'])
@login_required
def setup_class_fees(class_id):
    """Setup or edit fees for a specific class"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    classroom = Classroom.query.get_or_404(class_id)
    academic_year = request.args.get('academic_year', str(datetime.now().year))
    
    if request.method == 'POST':
        fee_type_id = request.form.get('fee_type_id')
        base_amount = float(request.form.get('base_amount', 0))
        due_date = request.form.get('due_date')
        description = request.form.get('description', '')
        semester = request.form.get('semester', '')
        
        # Check if fee already exists for this class and fee type
        existing_fee = ClassFee.query.filter_by(
            class_id=class_id,
            fee_type_id=fee_type_id,
            academic_year=academic_year,
            semester=semester
        ).first()
        
        if existing_fee:
            # Update existing fee
            existing_fee.base_amount = base_amount
            existing_fee.amount = base_amount
            existing_fee.due_date = datetime.strptime(due_date, '%Y-%m-%d').date() if due_date else None
            existing_fee.description = description
            existing_fee.updated_at = datetime.now()
            
            log_activity('info', f'Class fee updated for {classroom.name}', user_id=current_user.id)
            flash('Class fee updated successfully!', 'success')
        else:
            # Create new class fee
            class_fee = ClassFee(
                class_id=class_id,
                fee_type_id=fee_type_id,
                base_amount=base_amount,
                amount=base_amount,
                academic_year=academic_year,
                semester=semester,
                due_date=datetime.strptime(due_date, '%Y-%m-%d').date() if due_date else None,
                description=description
            )
            
            db.session.add(class_fee)
            log_activity('info', f'Class fee created for {classroom.name}', user_id=current_user.id)
            flash('Class fee created successfully!', 'success')
        
        db.session.commit()
        return redirect(url_for('class_fees.setup_class_fees', class_id=class_id, academic_year=academic_year))
    
    # GET request - show form
    fee_types = FeeType.query.all()
    existing_fees = ClassFee.query.filter_by(
        class_id=class_id,
        academic_year=academic_year
    ).all()
    
    return render_template('class_fees/setup.html',
                         classroom=classroom,
                         fee_types=fee_types,
                         existing_fees=existing_fees,
                         academic_year=academic_year)

@class_fees_bp.route('/class-fees/adjust/<int:fee_id>', methods=['GET', 'POST'])
@login_required
def adjust_class_fee(fee_id):
    """Adjust class fee amount"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    class_fee = ClassFee.query.get_or_404(fee_id)
    
    if request.method == 'POST':
        adjustment_amount = float(request.form.get('adjustment_amount', 0))
        adjustment_reason = request.form.get('adjustment_reason', '')
        
        # Update adjustment
        class_fee.adjustment_amount = adjustment_amount
        class_fee.adjustment_reason = adjustment_reason
        class_fee.adjusted_by = current_user.id
        class_fee.adjusted_at = datetime.now()
        class_fee.amount = class_fee.current_amount
        class_fee.updated_at = datetime.now()
        
        db.session.commit()
        
        log_activity('info', f'Class fee adjusted for {class_fee.classroom.name} by {adjustment_amount}', user_id=current_user.id)
        flash(f'Fee adjusted successfully! New amount: {class_fee.current_amount}', 'success')
        
        return redirect(url_for('class_fees.list_class_fees'))
    
    return render_template('class_fees/adjust.html', class_fee=class_fee)

@class_fees_bp.route('/class-fees/generate-for-students/<int:class_id>')
@login_required
def generate_fees_for_students(class_id):
    """Generate individual student fees based on class fees"""
    if current_user.role != 'admin':
        flash('This page is only accessible to administrators.', 'error')
        return redirect(url_for('dashboard.index'))
    
    classroom = Classroom.query.get_or_404(class_id)
    academic_year = request.args.get('academic_year', str(datetime.now().year))
    
    # Get all students in this class
    students = Student.query.filter_by(class_id=class_id).all()
    
    # Get class fees
    class_fees = ClassFee.query.filter_by(
        class_id=class_id,
        academic_year=academic_year,
        is_active=True
    ).all()
    
    generated_count = 0
    for student in students:
        for class_fee in class_fees:
            # Check if student already has this fee
            from models import Fee
            existing_fee = Fee.query.filter_by(
                student_id=student.id,
                fee_type_id=class_fee.fee_type_id,
                academic_year=academic_year
            ).first()
            
            if not existing_fee:
                # Create individual fee for student
                student_fee = Fee(
                    student_id=student.id,
                    fee_type_id=class_fee.fee_type_id,
                    amount=class_fee.current_amount,
                    due_date=class_fee.due_date,
                    academic_year=academic_year,
                    semester=class_fee.semester,
                    category=class_fee.fee_type.name,
                    description=class_fee.description
                )
                
                db.session.add(student_fee)
                generated_count += 1
    
    db.session.commit()
    
    log_activity('info', f'Generated {generated_count} fees for {classroom.name}', user_id=current_user.id)
    flash(f'Successfully generated {generated_count} fees for {len(students)} students!', 'success')
    
    return redirect(url_for('class_fees.list_class_fees'))
