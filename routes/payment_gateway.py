"""
Payment Gateway Integration for Fee Management System
Supports multiple payment methods with cost optimization
"""
import logging
import os
from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, request, session, url_for
from flask_login import login_required

from models import Fee, Payment, db

payment_bp = Blueprint('payment', __name__, template_folder='../templates')

# Payment Gateway Configuration
PAYMENT_CONFIG = {
    'razorpay': {
        'api_key': os.getenv('RAZORPAY_KEY_ID', 'rzp_test_your_key_here'),
        'api_secret': os.getenv('RAZORPAY_KEY_SECRET', 'your_secret_here'),
        'webhook_secret': os.getenv('RAZORPAY_WEBHOOK_SECRET', 'webhook_secret'),
        'fee_structure': {
            'card': 2.36,  # 2.36% + GST
            'netbanking': 0,  # Free
            'upi': 0,  # Free for bank-to-bank
            'wallet': 0.5  # 0.5%
        }
    },
    'phonepe': {
        'merchant_id': os.getenv('PHONEPE_MERCHANT_ID', 'your_merchant_id'),
        'salt_key': os.getenv('PHONEPE_SALT_KEY', 'your_salt_key'),
        'salt_index': os.getenv('PHONEPE_SALT_INDEX', '1'),
        'fee_structure': {
            'card': 2.5,  # 2.5%
            'netbanking': 0,  # Free
            'upi': 0,  # Free for bank-to-bank
            'wallet': 0.5  # 0.5%
        }
    }
}

# Bank Transfer Details
BANK_DETAILS = {
    'account_name': 'School Management System',
    'account_number': '123456789012',
    'ifsc_code': 'SBIN0001234',
    'bank_name': 'State Bank of India',
    'branch': 'Main Branch',
    'upi_id': 'schoolmanagement@oksbi'
}

class PaymentGateway:
    """Unified Payment Gateway Interface"""

    def __init__(self, gateway='razorpay'):
        self.gateway = gateway
        self.config = PAYMENT_CONFIG.get(gateway, PAYMENT_CONFIG['razorpay'])

    def create_order(self, amount, currency='INR', receipt=None, notes=None):
        """Create payment order"""
        if self.gateway == 'razorpay':
            return self._create_razorpay_order(amount, currency, receipt, notes)
        elif self.gateway == 'phonepe':
            return self._create_phonepe_order(amount, currency, receipt, notes)
        else:
            raise ValueError(f"Unsupported gateway: {self.gateway}")

    def verify_payment(self, payment_id, order_id, signature=None):
        """Verify payment signature"""
        if self.gateway == 'razorpay':
            return self._verify_razorpay_payment(payment_id, order_id, signature)
        elif self.gateway == 'phonepe':
            return self._verify_phonepe_payment(payment_id, order_id)
        else:
            raise ValueError(f"Unsupported gateway: {self.gateway}")

    def _create_razorpay_order(self, amount, currency, receipt, notes):
        """Create Razorpay order"""
        import razorpay

        client = razorpay.Client(
            auth=(self.config['api_key'], self.config['api_secret'])
        )

        order_data = {
            'amount': int(amount * 100),  # Amount in paisa
            'currency': currency,
            'receipt': receipt or f'rcpt_{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'payment_capture': 1,  # Auto capture
            'notes': notes or {}
        }

        try:
            order = client.order.create(order_data)
            return {
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency'],
                'status': order['status'],
                'gateway': 'razorpay',
                'key': self.config['api_key']
            }
        except Exception as e:
            logging.error(f"Razorpay order creation failed: {str(e)}")
            raise

    def _create_phonepe_order(self, amount, currency, receipt, notes):
        """Create PhonePe order"""
        # PhonePe integration would go here
        # For now, return mock response
        order_id = f'PP_{datetime.now().strftime("%Y%m%d%H%M%S")}'
        return {
            'order_id': order_id,
            'amount': int(amount * 100),
            'currency': currency,
            'status': 'created',
            'gateway': 'phonepe'
        }

    def _verify_razorpay_payment(self, payment_id, order_id, signature):
        """Verify Razorpay payment"""
        import razorpay

        client = razorpay.Client(
            auth=(self.config['api_key'], self.config['api_secret'])
        )

        try:
            # Verify signature
            params_dict = {
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            }
            client.utility.verify_payment_signature(params_dict)
            return True
        except Exception as e:
            logging.error(f"Razorpay payment verification failed: {str(e)}")
            return False

    def _verify_phonepe_payment(self, payment_id, order_id):
        """Verify PhonePe payment"""
        # PhonePe verification would go here
        return True

def get_payment_fee(amount, method, gateway='razorpay'):
    """Calculate payment gateway fee"""
    fee_structure = PAYMENT_CONFIG[gateway]['fee_structure']
    fee_percentage = fee_structure.get(method, 2.36)  # Default to card fee
    return (amount * fee_percentage) / 100

@payment_bp.route('/initiate/<int:fee_id>', methods=['GET', 'POST'])
@login_required
def initiate_payment(fee_id):
    """Initiate payment for a fee"""
    fee = Fee.query.get_or_404(fee_id)

    if request.method == 'POST':
        payment_method = request.form.get('payment_method')
        gateway = request.form.get('gateway', 'razorpay')

        # Calculate final amount including gateway fees
        gateway_fee = get_payment_fee(fee.final_amount, payment_method, gateway)
        total_amount = fee.final_amount + gateway_fee

        # Create payment gateway order
        pg = PaymentGateway(gateway)

        notes = {
            'fee_id': str(fee.id),
            'student_id': str(fee.student_id),
            'student_name': fee.student.full_name() if fee.student else 'Unknown',
            'description': fee.description or f'Fee payment - {fee.category or "General"}'
        }

        try:
            order = pg.create_order(
                amount=total_amount,
                currency='INR',
                receipt=f'fee_{fee.id}_{datetime.now().strftime("%Y%m%d")}',
                notes=notes
            )

            # Store order details in session
            session['payment_order'] = {
                'order_id': order['order_id'],
                'fee_id': fee.id,
                'amount': total_amount,
                'gateway_fee': gateway_fee,
                'payment_method': payment_method,
                'gateway': gateway
            }

            if gateway == 'razorpay':
                return render_template('payments/razorpay_checkout.html',
                                     order=order,
                                     fee=fee,
                                     gateway_fee=gateway_fee,
                                     total_amount=total_amount)
            elif gateway == 'phonepe':
                return render_template('payments/phonepe_checkout.html',
                                     order=order,
                                     fee=fee,
                                     gateway_fee=gateway_fee,
                                     total_amount=total_amount)
            else:
                # Bank transfer
                return render_template('payments/bank_transfer.html',
                                     fee=fee,
                                     bank_details=BANK_DETAILS,
                                     amount=total_amount)

        except Exception as e:
            flash(f'Payment initiation failed: {str(e)}', 'error')
            return redirect(url_for('fees.list_fees'))

    # GET request - show payment options
    return render_template('payments/initiate.html',
                         fee=fee,
                         bank_details=BANK_DETAILS,
                         payment_config=PAYMENT_CONFIG)

@payment_bp.route('/success', methods=['POST'])
@login_required
def payment_success():
    """Handle successful payment"""
    payment_data = request.get_json() if request.is_json else request.form

    if not payment_data:
        return jsonify({'error': 'No payment data received'}), 400

    # Get order details from session
    order_details = session.get('payment_order')
    if not order_details:
        return jsonify({'error': 'No active payment session'}), 400

    # Verify payment
    pg = PaymentGateway(order_details['gateway'])

    if order_details['gateway'] == 'razorpay':
        payment_id = payment_data.get('razorpay_payment_id')
        order_id = payment_data.get('razorpay_order_id')
        signature = payment_data.get('razorpay_signature')

        if not pg.verify_payment(payment_id, order_id, signature):
            return jsonify({'error': 'Payment verification failed'}), 400

    elif order_details['gateway'] == 'phonepe':
        payment_id = payment_data.get('transaction_id')
        order_id = order_details['order_id']

        if not pg.verify_payment(payment_id, order_id):
            return jsonify({'error': 'Payment verification failed'}), 400

    # Create payment record
    try:
        payment = Payment(
            fee_id=order_details['fee_id'],
            amount=order_details['amount'],
            paid_on=datetime.now().date()
        )

        # Update fee status
        fee = Fee.query.get(order_details['fee_id'])
        fee.paid = True
        fee.payment_date = datetime.now().date()
        fee.payment_method = order_details['payment_method']

        db.session.add(payment)
        db.session.commit()

        # Clear session
        session.pop('payment_order', None)

        flash('Payment completed successfully!', 'success')
        return jsonify({'success': True, 'redirect': url_for('fees.list_fees')})

    except Exception as e:
        db.session.rollback()
        logging.error(f"Payment processing failed: {str(e)}")
        return jsonify({'error': 'Payment processing failed'}), 500

@payment_bp.route('/bank_transfer/<int:fee_id>', methods=['POST'])
@login_required
def bank_transfer_payment(fee_id):
    """Handle bank transfer payment submission"""
    fee = Fee.query.get_or_404(fee_id)

    transaction_id = request.form.get('transaction_id')
    transfer_date = request.form.get('transfer_date')
    bank_reference = request.form.get('bank_reference')
    remarks = request.form.get('remarks')

    if not transaction_id or not transfer_date:
        flash('Transaction ID and transfer date are required', 'error')
        return redirect(url_for('payment.initiate_payment', fee_id=fee_id))

    try:
        # Create payment record
        payment = Payment(
            fee_id=fee.id,
            amount=fee.final_amount,
            paid_on=datetime.strptime(transfer_date, '%Y-%m-%d').date()
        )

        # Update fee status
        fee.paid = True
        fee.payment_date = payment.paid_on
        fee.payment_method = 'bank_transfer'

        # Store bank transfer details as notes
        fee.description = f"{fee.description or ''}\nBank Transfer - TXN: {transaction_id}, Ref: {bank_reference}, Remarks: {remarks}".strip()

        db.session.add(payment)
        db.session.commit()

        flash('Bank transfer payment recorded successfully! It will be verified within 24 hours.', 'success')
        return redirect(url_for('fees.list_fees'))

    except Exception as e:
        db.session.rollback()
        flash(f'Payment recording failed: {str(e)}', 'error')
        return redirect(url_for('payment.initiate_payment', fee_id=fee_id))

@payment_bp.route('/webhook/razorpay', methods=['POST'])
def razorpay_webhook():
    """Handle Razorpay webhooks"""
    try:
        signature = request.headers.get('X-Razorpay-Signature')
        payload = request.get_data()

        secret = PAYMENT_CONFIG['razorpay']['webhook_secret']
        import hashlib
        import hmac
        digest = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(digest, signature):
            return jsonify({'error': 'Invalid signature'}), 400

        event = request.get_json(silent=True) or {}
        logging.info(f"Razorpay webhook verified: {event.get('event')}")

        return jsonify({'status': 'ok'}), 200

    except Exception as e:
        logging.error(f"Webhook processing failed: {str(e)}")
        return jsonify({'error': 'Webhook processing failed'}), 500

@payment_bp.route('/fee_structure', methods=['GET'])
@login_required
def fee_structure():
    """Display payment gateway fee structure"""
    return render_template('payments/fee_structure.html',
                         payment_config=PAYMENT_CONFIG,
                         bank_details=BANK_DETAILS)

# Utility functions
def format_currency(amount):
    """Format amount as currency"""
    return f"₹{amount:,.2f}"

def get_payment_methods():
    """Get available payment methods"""
    return [
        {'id': 'card', 'name': 'Credit/Debit Card', 'icon': 'fas fa-credit-card'},
        {'id': 'netbanking', 'name': 'Net Banking', 'icon': 'fas fa-university'},
        {'id': 'upi', 'name': 'UPI', 'icon': 'fas fa-mobile-alt'},
        {'id': 'wallet', 'name': 'Digital Wallet', 'icon': 'fas fa-wallet'},
        {'id': 'bank_transfer', 'name': 'Bank Transfer', 'icon': 'fas fa-exchange-alt'}
    ]

# Register template filter
@payment_bp.app_template_filter('currency')
def currency_filter(amount):
    return format_currency(amount)

# Make functions available to templates
@payment_bp.context_processor
def inject_payment_functions():
    return {
        'get_payment_methods': get_payment_methods,
        'format_currency': format_currency
    }
