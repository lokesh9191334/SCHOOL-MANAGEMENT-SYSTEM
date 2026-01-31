import os
import uuid
from datetime import date, datetime

from flask import (
    Blueprint,
    Response,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
)
from flask_login import login_required
from werkzeug.utils import secure_filename

from models import (
    Classroom,
    Fee,
    FeeType,
    Payment,
    Receipt,
    Student,
    Subject,
    db,
)

fees_bp = Blueprint('fees', __name__)

@fees_bp.route('/')
@login_required
def list_fees():
    fees = Fee.query.all()
    fee_types = FeeType.query.all()
    classrooms = Classroom.query.all()
    streams = db.session.query(Subject.stream).distinct().filter(Subject.stream.isnot(None)).all()
    streams = [stream[0] for stream in streams if stream[0]]

    # If no streams found in database, provide default streams
    if not streams:
        streams = ['Non-Medical', 'Medical', 'Arts with Math', 'Commerce with Math', 'Medical with Math']
    return render_template('fees/index.html', fees=fees, fee_types=fee_types, classrooms=classrooms, streams=streams, datetime=datetime)

@fees_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_fee():
    if request.method == 'POST':
        student_id = request.form.get('student_id')
        fee_type_id = request.form.get('fee_type_id')
        amount = request.form.get('amount')
        due_date = request.form.get('due_date')
        description = request.form.get('description')

        fee = Fee(
            student_id=student_id,
            fee_type_id=fee_type_id,
            amount=amount,
            due_date=datetime.strptime(due_date, '%Y-%m-%d').date() if due_date else None,
            description=description
        )
        db.session.add(fee)
        db.session.commit()
        flash('Fee created successfully!', 'success')
        return redirect(url_for('fees.list_fees'))
    students = Student.query.all()
    fee_types = FeeType.query.all()
    classrooms = Classroom.query.all()
    streams = db.session.query(Subject.stream).distinct().filter(Subject.stream.isnot(None)).all()
    streams = [stream[0] for stream in streams if stream[0]]

    # If no streams found in database, provide default streams
    if not streams:
        streams = ['Non-Medical', 'Medical', 'Arts with Math', 'Commerce with Math', 'Medical with Math']
    return render_template('fees/form.html', students=students, fee_types=fee_types, classrooms=classrooms, streams=streams)

@fees_bp.route('/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_fee(id):
    fee = Fee.query.get_or_404(id)
    if request.method == 'POST':
        fee.student_id = request.form.get('student_id')
        fee.fee_type_id = request.form.get('fee_type_id')
        fee.amount = request.form.get('amount')
        fee.due_date = datetime.strptime(request.form.get('due_date'), '%Y-%m-%d')
        fee.description = request.form.get('description')
        
        # Handle photo upload
        if 'photo' in request.files:
            photo = request.files['photo']
            if photo and photo.filename:
                # Delete old photo if exists
                if fee.photo:
                    old_photo_path = os.path.join(current_app.static_folder, fee.photo)
                    if os.path.exists(old_photo_path):
                        os.remove(old_photo_path)
                
                upload_dir = os.path.join(current_app.static_folder, 'uploads', 'fees')
                os.makedirs(upload_dir, exist_ok=True)
                filename = secure_filename(f"{uuid.uuid4()}_{photo.filename}")
                photo_path = os.path.join(upload_dir, filename)
                photo.save(photo_path)
                fee.photo = f"uploads/fees/{filename}"
            elif not photo.filename and 'remove_photo' in request.form:
                # Remove photo if requested
                if fee.photo:
                    old_photo_path = os.path.join(current_app.static_folder, fee.photo)
                    if os.path.exists(old_photo_path):
                        os.remove(old_photo_path)
                fee.photo = None
        
        db.session.commit()
        flash('Fee updated successfully!', 'success')
        return redirect(url_for('fees.list_fees'))

    students = Student.query.all()
    fee_types = FeeType.query.all()
    classrooms = Classroom.query.all()
    streams = db.session.query(Subject.stream).distinct().filter(Subject.stream.isnot(None)).all()
    streams = [stream[0] for stream in streams if stream[0]]

@fees_bp.route('/add', methods=['POST'])
@login_required
def add_fee():
    student_id = request.form.get('student_id')
    amount = request.form.get('amount')
    due_date_str = request.form.get('due_date')
    fee_type_id = request.form.get('fee_type_id')
    due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None
    fee = Fee(
        student_id=student_id,
        fee_type_id=fee_type_id,
        amount=amount,
        due_date=due_date
    )
    db.session.add(fee)
    db.session.commit()
    return redirect(url_for('fees.list_fees'))

@fees_bp.route('/pay/<int:id>', methods=['POST'])
@login_required
def pay_fee(id):
    fee = Fee.query.get_or_404(id)
    fee.paid = True
    fee.payment_date = datetime.utcnow().date()
    db.session.commit()
    return redirect(url_for('fees.list_fees'))


@fees_bp.route('/<int:id>/delete', methods=['POST'])
@login_required
def delete_fee(id):
    """Delete a fee and its related payments/receipts. Returns to the fees list."""
    fee = Fee.query.get_or_404(id)
    try:
        # Remove associated uploaded photo if present
        if getattr(fee, 'photo', None):
            photo_path = os.path.join(current_app.static_folder, fee.photo)
            if os.path.exists(photo_path):
                os.remove(photo_path)

        # Delete related receipts and payments safely
        for payment in list(fee.payments or []):
            for receipt in list(getattr(payment, 'receipts', []) or []):
                db.session.delete(receipt)
            db.session.delete(payment)

        db.session.delete(fee)
        db.session.commit()
        flash('Fee deleted successfully!', 'success')
        # If the request is AJAX/JSON, return JSON response for client-side handling
        is_ajax = (
            request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
            request.is_json or
            request.accept_mimetypes.best_match(['application/json', 'text/html']) == 'application/json'
        )
        if is_ajax:
            return jsonify({'success': True, 'message': 'Fee deleted successfully!'}), 200
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting fee: {str(e)}', 'error')
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json:
            return jsonify({'success': False, 'message': str(e)}), 500

    return redirect(url_for('fees.list_fees'))

@fees_bp.route('/<int:id>/receipt')
@login_required
def get_receipt(id):
    """Get receipt data for a paid fee"""
    try:
        fee = Fee.query.get_or_404(id)
        
        # Check if fee has been paid
        if not fee.paid or not fee.payments:
            return jsonify({
                'success': False,
                'message': 'No receipt available for this fee'
            }), 404

        # Find the most relevant payment that has a receipt.
        payment = None
        receipt = None

        # Prefer the latest payment (by paid_on) that has receipts
        payments_with_receipts = [p for p in fee.payments if p.receipts]
        if payments_with_receipts:
            try:
                payments_with_receipts.sort(key=lambda p: p.paid_on or p.id, reverse=True)
            except Exception:
                payments_with_receipts = payments_with_receipts
            payment = payments_with_receipts[0]
            receipt = payment.receipts[0]

        # Fallback: if no payment with receipts found, check any payment's receipts
        if not receipt:
            for p in fee.payments:
                if p.receipts:
                    payment = p
                    receipt = p.receipts[0]
                    break

        if not receipt:
            return jsonify({
                'success': False,
                'message': 'Receipt not found'
            }), 404

        # Safely read student fields (different DBs may have different column names)
        student = fee.student
        student_name = student.name if student and hasattr(student, 'name') else 'N/A'
        father_name = 'N/A'
        if student:
            father_name = getattr(student, 'father_name', None) or getattr(student, 'parent_name', None) or getattr(student, 'father', None) or 'N/A'

        # Student class (use helper property if available)
        student_class = None
        if student and hasattr(student, 'current_class'):
            # current_class may be a dict with name/grade/stream
            student_class = student.current_class

        # Only include transaction id when appropriate (may be None)
        txn = payment.transaction_id if getattr(payment, 'transaction_id', None) else None

        return jsonify({
            'success': True,
            'receipt_number': receipt.receipt_number,
            'issued_date': receipt.issued_date.isoformat() if getattr(receipt, 'issued_date', None) else '',
            'student_name': student_name,
            'father_name': father_name,
            'fee_type': fee.fee_type.name if fee.fee_type else 'Fee',
            'amount': float(fee.amount),
            'payment_method': fee.payment_method or 'N/A',
            'payment_date': fee.payment_date.isoformat() if fee.payment_date else '',
            'transaction_id': txn,
            'student_class': student_class
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching receipt: {str(e)}'
        }), 500


@fees_bp.route('/api/process_payment', methods=['POST'])
@login_required
def process_payment():
    """Process payment for a fee and generate receipt"""
    try:
        fee_id = request.form.get('fee_id')
        payment_method = request.form.get('payment_method')
        payment_date_str = request.form.get('payment_date')
        
        # Validate required fields
        if not fee_id or not payment_method or not payment_date_str:
            return jsonify({
                'success': False,
                'message': 'Missing required payment information'
            }), 400
        
        # Get the fee
        fee = Fee.query.get_or_404(int(fee_id))
        
        # Parse payment date
        payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
        
        # Update fee as paid
        fee.paid = True
        fee.payment_date = payment_date
        fee.payment_method = payment_method
        
        # Only generate a transaction ID for online-like payment methods
        online_methods = {'upi', 'qr', 'online'}
        transaction_id = None
        if payment_method and payment_method.strip().lower() in online_methods:
            transaction_id = f"TXN-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        # Create Payment record
        payment = Payment(
            fee_id=fee.id,
            amount=fee.amount,
            paid_on=payment_date,
            transaction_id=transaction_id,
            payment_method=payment_method
        )
        
        db.session.add(payment)
        db.session.flush()  # Flush to get payment.id without committing
        
        # Generate Receipt
        receipt_number = f"RCP-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        student = fee.student
        receipt = Receipt(
            payment_id=payment.id,
            receipt_number=receipt_number,
            issued_to=student.name if student else 'N/A',
            parent_name=getattr(student, 'parent_name', None) if student else 'N/A',
            total_amount=fee.amount,
            payment_method=payment_method,
            notes=f"Payment received for {fee.fee_type.name if fee.fee_type else 'Fee'}"
        )
        
        db.session.add(receipt)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Payment processed successfully',
            'receipt_number': receipt_number,
            'transaction_id': transaction_id,
            'student_name': student.name if student else 'N/A',
            'father_name': getattr(student, 'father_name', None) if student else 'N/A',
            'amount': float(fee.amount),
            'fee_type': fee.fee_type.name if fee.fee_type else 'Fee'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error processing payment: {str(e)}'
        }), 500

@fees_bp.route('/fee_types')
@login_required
def fee_types():
    fee_types = FeeType.query.all()
    return render_template('fees/fee_types.html', fee_types=fee_types)

@fees_bp.route('/fee_types/add', methods=['GET', 'POST'])
@login_required
def add_fee_type():
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description')

        if not name:
            flash('Fee type name is required!', 'error')
            return redirect(url_for('fees.add_fee_type'))

        fee_type = FeeType(name=name, description=description)
        db.session.add(fee_type)
        db.session.commit()
        flash('Fee type created successfully!', 'success')
        return redirect(url_for('fees.fee_types'))

    return render_template('fees/fee_type_form.html')

@fees_bp.route('/fee_types/<int:id>/edit', methods=['GET', 'POST'])
@login_required
def edit_fee_type(id):
    fee_type = FeeType.query.get_or_404(id)
    if request.method == 'POST':
        name = request.form.get('custom_name') or request.form.get('name')
        fee_type.name = name
        fee_type.description = request.form.get('description')
        db.session.commit()
        flash('Fee type updated successfully!', 'success')
        return redirect(url_for('fees.fee_types'))

    return render_template('fees/fee_type_form.html', fee_type=fee_type)

@fees_bp.route('/fee_types/<int:id>/toggle', methods=['POST'])
@login_required
def toggle_fee_type(id):
    fee_type = FeeType.query.get_or_404(id)
    fee_type.is_active = not fee_type.is_active
    db.session.commit()
    status = 'activated' if fee_type.is_active else 'deactivated'
    flash(f'Fee type {status} successfully!', 'success')
    return redirect(url_for('fees.fee_types'))

@fees_bp.route('/receipts')
@login_required
def receipts():
    receipts = Receipt.query.all()
    return render_template('fees/receipts.html', receipts=receipts)

@fees_bp.route('/export')
@login_required
def export_fees():
    rows = ['id,student_id,amount,due_date,paid']
    for f in Fee.query.all():
        did = f.due_date.isoformat() if getattr(f, 'due_date', None) else ''
        paid = 'yes' if getattr(f, 'paid', False) else 'no'
        rows.append(f'{f.id},{f.student_id},{f.amount},{did},{paid}')
    csv_data = '\n'.join(rows)
    return Response(csv_data, content_type='text/csv')

@fees_bp.route('/receipt/<int:receipt_id>')
@login_required
def view_receipt(receipt_id):
    """Render a printable receipt page for a Receipt record."""
    receipt = Receipt.query.get_or_404(receipt_id)
    # Ensure related payment/fee/student are available in template
    payment = receipt.payment
    fee = payment.fee if payment else None
    student = fee.student if fee else None
    return render_template('fees/view_receipt.html', receipt=receipt)

@fees_bp.route('/analytics')
@login_required
def fees_analytics():
    total_fees = Fee.query.count()
    paid_fees = Receipt.query.count()
    pending_fees = total_fees - paid_fees

    return render_template('fees/analytics.html',
                         total_fees=total_fees,
                         paid_fees=paid_fees,
                         pending_fees=pending_fees)

@fees_bp.route('/student/<int:student_id>')
@login_required
def student_fees(student_id):
    """Display all fees for a specific student"""
    student = Student.query.get_or_404(student_id)
    fees = Fee.query.filter_by(student_id=student_id).all()
    return render_template('fees/student_fees.html', student=student, fees=fees)
