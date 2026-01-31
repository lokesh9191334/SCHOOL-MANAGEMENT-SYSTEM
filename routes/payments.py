from flask import Blueprint, render_template, request, jsonify, current_app, flash, redirect, url_for
from flask_login import login_required, current_user
from models import db, Payment, Fee, Student, User, Notification, Parent
from datetime import datetime, date
from decimal import Decimal
import uuid

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/parent/fee-payment', methods=['GET', 'POST'])
@login_required
def parent_fee_payment():
    """Parent fee payment portal with automatic fee processing"""
    if current_user.role != 'parent':
        return render_template('errors/403.html'), 403
    
    # Get student for current parent
    from models import Parent
    parent = Parent.query.filter_by(user_id=current_user.id).first()
    if not parent:
        flash('No student associated with your account', 'error')
        return redirect(url_for('dashboard.index'))
    
    student = parent.student
    if not student:
        flash('No student found', 'error')
        return redirect(url_for('dashboard.index'))
    
    # Get all pending fees for the student
    fees = Fee.query.filter_by(student_id=student.id).all()
    
    if request.method == 'POST':
        try:
            fee_id = request.form.get('fee_id')
            payment_amount = Decimal(request.form.get('payment_amount'))
            payment_method = request.form.get('payment_method')
            
            if not fee_id or not payment_amount or payment_amount <= 0:
                flash('Invalid payment details', 'error')
                return redirect(request.url)
            
            # Get the fee
            fee = Fee.query.get_or_404(fee_id)
            
            # Process payment automatically
            result = fee.process_payment(
                payment_amount=float(payment_amount),
                payment_method=payment_method,
                transaction_id=str(uuid.uuid4())
            )
            
            if result['success']:
                # Create notification for admin
                create_payment_notification(fee, payment_amount, payment_method)
                
                # Create notification for parent
                parent_notification = Notification(
                    user_id=current_user.id,
                    message=f"Payment of ₹{payment_amount} processed successfully. Remaining balance: ₹{result['remaining_amount']}",
                    type='payment',
                    created_at=datetime.utcnow()
                )
                db.session.add(parent_notification)
                db.session.commit()
                
                flash(f'Payment of ₹{payment_amount} processed successfully!', 'success')
                
                # Return JSON for AJAX requests
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({
                        'success': True,
                        'message': 'Payment processed successfully',
                        'remaining_amount': float(result['remaining_amount']),
                        'advance_amount': float(result['advance_amount']),
                        'status': result['status']
                    })
                
                return redirect(url_for('payments.payment_receipt', payment_id=result['payment_id']))
            else:
                flash(f'Payment failed: {result["error"]}', 'error')
                
        except Exception as e:
            current_app.logger.error(f"Payment processing error: {str(e)}")
            flash('An error occurred while processing payment', 'error')
    
    # Prepare fee data for display
    fee_data = []
    for fee in fees:
        summary = fee.get_payment_summary()
        fee_data.append(summary)
    
    return render_template('payments/parent_payment.html', 
                         student=student, 
                         fees=fee_data)

@payments_bp.route('/payment-receipt/<int:payment_id>')
@login_required
def payment_receipt(payment_id):
    """Generate payment receipt"""
    payment = Payment.query.get_or_404(payment_id)
    fee = payment.fee
    
    # Check permissions
    if current_user.role == 'parent':
        # Verify this payment belongs to parent's student
        from models import Parent
        parent = Parent.query.filter_by(user_id=current_user.id).first()
        if not parent or fee.student_id != parent.student_id:
            return render_template('errors/403.html'), 403
    elif current_user.role != 'admin':
        return render_template('errors/403.html'), 403
    
    return render_template('payments/receipt.html', payment=payment, fee=fee)

@payments_bp.route('/api/student-fees/<int:student_id>')
@login_required
def get_student_fees(student_id):
    """API endpoint to get student fee details"""
    try:
        # Verify permissions
        if current_user.role == 'parent':
            from models import Parent
            parent = Parent.query.filter_by(user_id=current_user.id).first()
            if not parent or student_id != parent.student_id:
                return jsonify({'error': 'Unauthorized'}), 403
        elif current_user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        student = Student.query.get_or_404(student_id)
        fees = Fee.query.filter_by(student_id=student_id).all()
        
        fee_data = []
        total_due = 0
        total_paid = 0
        total_advance = 0
        
        for fee in fees:
            summary = fee.get_payment_summary()
            fee_data.append(summary)
            total_due += summary['remaining_amount']
            total_paid += summary['total_paid']
            total_advance += summary['advance_amount']
        
        return jsonify({
            'success': True,
            'student': {
                'id': student.id,
                'name': student.name,
                'class': student.classroom.name if student.classroom else 'N/A'
            },
            'fees': fee_data,
            'summary': {
                'total_due': float(total_due),
                'total_paid': float(total_paid),
                'total_advance': float(total_advance),
                'net_balance': float(total_due - total_advance)
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Error fetching student fees: {str(e)}")
        return jsonify({'error': str(e)}), 500

@payments_bp.route('/api/process-payment', methods=['POST'])
@login_required
def process_payment_api():
    """API endpoint for payment processing"""
    try:
        data = request.get_json()
        fee_id = data.get('fee_id')
        payment_amount = float(data.get('payment_amount'))
        payment_method = data.get('payment_method')
        
        if not fee_id or not payment_amount or payment_amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid payment details'})
        
        # Verify permissions
        fee = Fee.query.get_or_404(fee_id)
        if current_user.role == 'parent':
            from models import Parent
            parent = Parent.query.filter_by(user_id=current_user.id).first()
            if not parent or fee.student_id != parent.student_id:
                return jsonify({'success': False, 'error': 'Unauthorized'})
        elif current_user.role != 'admin':
            return jsonify({'success': False, 'error': 'Unauthorized'})
        
        # Process payment
        result = fee.process_payment(
            payment_amount=payment_amount,
            payment_method=payment_method,
            transaction_id=str(uuid.uuid4())
        )
        
        if result['success']:
            # Create notifications
            create_payment_notification(fee, payment_amount, payment_method)
            
            return jsonify({
                'success': True,
                'payment_id': result['payment_id'],
                'remaining_amount': float(result['remaining_amount']),
                'advance_amount': float(result['advance_amount']),
                'status': result['status'],
                'message': 'Payment processed successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            })
            
    except Exception as e:
        current_app.logger.error(f"API payment processing error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def create_payment_notification(fee, payment_amount, payment_method):
    """Create payment notification for admin"""
    try:
        admin_users = User.query.filter_by(role='admin').all()
        for admin in admin_users:
            notification = Notification(
                user_id=admin.id,
                message=f"Payment received: ₹{payment_amount} from {fee.student.name} via {payment_method}. Balance: ₹{fee.remaining_amount}",
                type='payment',
                created_at=datetime.utcnow()
            )
            db.session.add(notification)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Error creating payment notification: {str(e)}")

@payments_bp.route('/test')
def payment_test():
    """Test route to verify payment blueprint is working"""
    return render_template('payments/payment_test.html')

@payments_bp.route('/admin/payment-summary')
@login_required
def admin_payment_summary():
    """Admin payment summary dashboard"""
    if current_user.role != 'admin':
        return render_template('errors/403.html'), 403
    
    try:
        # Get recent payments
        recent_payments = Payment.query.order_by(Payment.paid_on.desc()).limit(20).all()
        
        # Get payment statistics
        from sqlalchemy import func
        total_payments = Payment.query.with_entities(func.sum(Payment.amount)).scalar() or 0
        today_payments = Payment.query.filter(Payment.paid_on == date.today()).with_entities(func.sum(Payment.amount)).scalar() or 0
        
        # Get pending fees
        pending_fees = Fee.query.filter_by(paid=False).count()
        
        # Get advance payments
        advance_total = sum(fee.advance_amount for fee in Fee.query.all() if fee.advance_amount > 0)
        
        return render_template('payments/admin_summary.html',
                             recent_payments=recent_payments,
                             total_payments=total_payments,
                             today_payments=today_payments,
                             pending_fees=pending_fees,
                             advance_total=advance_total)
                             
    except Exception as e:
        current_app.logger.error(f"Error loading admin payment summary: {str(e)}")
        flash('Error loading payment summary', 'error')
        return redirect(url_for('dashboard.index'))
