import sys

sys.path.insert(0, '.')
import uuid
from datetime import date

from app import create_app
from models import Fee, Payment, Receipt, Student, db

app = create_app()

def ensure_student():
    with app.app_context():
        student = Student.query.first()
        if student:
            return student
        # Create a minimal student if none exists
        student = Student(name='Test Student')
        db.session.add(student)
        db.session.commit()
        return student

with app.app_context():
    student = ensure_student()

    # Create a fee for testing
    fee = Fee(student_id=student.id, fee_type_id=None, amount=1000, due_date=date.today(), description='Test fee')
    db.session.add(fee)
    db.session.commit()

    # Mark fee as paid
    fee.paid = True
    fee.payment_date = date.today()
    db.session.commit()

    # Case 1: Online payment (upi) - should get transaction_id
    payment1 = Payment(fee_id=fee.id, amount=fee.amount, paid_on=date.today(), transaction_id=f"TXN-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}", payment_method='upi')
    db.session.add(payment1)
    db.session.flush()
    receipt1 = Receipt(payment_id=payment1.id, receipt_number=f"RCP-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}", issued_to=student.name, parent_name=getattr(student, 'parent_name', None) or 'N/A', total_amount=fee.amount, payment_method='upi')
    db.session.add(receipt1)
    db.session.commit()

    # Call get_receipt directly
    from routes.fees import get_receipt
    handler = getattr(get_receipt, '__wrapped__', get_receipt)
    resp = handler(fee.id)
    # resp may be (Response, status) or Response object
    if isinstance(resp, tuple):
        body, status = resp
        print('Online payment status:', status)
        try:
            print('Online payment json:', body.get_json())
        except Exception:
            print('Online body text:', body.get_data(as_text=True))
    else:
        print('Online payment resp:', resp)

    # Cleanup payment1 and receipt1
    db.session.delete(receipt1)
    db.session.delete(payment1)
    db.session.commit()

    # Case 2: Offline payment (cash) - should NOT have transaction_id
    payment2 = Payment(fee_id=fee.id, amount=fee.amount, paid_on=date.today(), transaction_id=None, payment_method='cash')
    db.session.add(payment2)
    db.session.flush()
    receipt2 = Receipt(payment_id=payment2.id, receipt_number=f"RCP-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}", issued_to=student.name, parent_name=getattr(student, 'parent_name', None) or 'N/A', total_amount=fee.amount, payment_method='cash')
    db.session.add(receipt2)
    db.session.commit()

    resp2 = handler(fee.id)
    if isinstance(resp2, tuple):
        body2, status2 = resp2
        print('Offline payment status:', status2)
        try:
            print('Offline payment json:', body2.get_json())
        except Exception:
            print('Offline body text:', body2.get_data(as_text=True))
    else:
        print('Offline payment resp:', resp2)

    # Cleanup
    db.session.delete(receipt2)
    db.session.delete(payment2)
    db.session.delete(fee)
    db.session.commit()

    print('Test completed')
