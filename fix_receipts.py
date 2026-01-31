import sys

sys.path.insert(0, '.')
import uuid
from datetime import date

from app import create_app
from models import Payment, db

app = create_app()
with app.app_context():
    # Find all paid fees without payments
    # Normalize transaction_id for all payments:
    # - For online methods (upi/qr/online): ensure a transaction_id exists
    # - For other methods: ensure transaction_id is None
    payments = Payment.query.all()
    if not payments:
        print("✅ No payments found in database!")
    else:
        online_methods = {'upi', 'qr', 'online'}
        assigned = 0
        cleared = 0
        for payment in payments:
            method = (payment.payment_method or '').strip().lower()
            if method in online_methods:
                if not payment.transaction_id:
                    payment.transaction_id = f"TXN-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
                    assigned += 1
                    print(f"Assigned txn for Payment {payment.id} (method={payment.payment_method}): {payment.transaction_id}")
                else:
                    print(f"Payment {payment.id} already has txn: {payment.transaction_id}")
            else:
                if payment.transaction_id:
                    payment.transaction_id = None
                    cleared += 1
                    print(f"Cleared txn for Payment {payment.id} (method={payment.payment_method})")
                else:
                    print(f"Payment {payment.id} (method={payment.payment_method}) has no txn - OK")
        print(f"Assigned: {assigned}, Cleared: {cleared}")
    
    db.session.commit()
    print('✅ All payments fixed!')
