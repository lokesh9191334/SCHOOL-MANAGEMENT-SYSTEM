import sys
from pathlib import Path

# Ensure project root is on sys.path so imports like `from app import create_app` work
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

import uuid

from flask import render_template

from app import create_app
from models import Receipt, db


def find_and_render():
    app = create_app()
    with app.app_context():
        # Find a receipt whose payment -> fee -> student -> classroom exists
        receipts = Receipt.query.all()
        target = None
        for r in receipts:
            try:
                payment = r.payment
                fee = payment.fee if payment else None
                student = fee.student if fee else None
                classroom = getattr(student, 'classroom', None) if student else None
                name = getattr(classroom, 'name', None) if classroom else None
                if name:
                    target = r
                    break
            except Exception:
                continue

        if not target:
            print('No existing receipt found with a student assigned to a classroom — creating a temporary one for verification...')
            # Create temporary classroom, student, enrollment, fee, payment, receipt
            from models import Classroom, Enrollment, Fee, Payment, Student
            classroom = Classroom(name='TestClass-10A', grade='10')
            student = Student(name='Temporary Student', class_id=None)
            db.session.add(classroom)
            db.session.add(student)
            db.session.flush()
            # Create enrollment linking student and classroom
            enrollment = Enrollment(student_id=student.id, classroom_id=classroom.id)
            db.session.add(enrollment)
            db.session.flush()

            fee = Fee(student_id=student.id, amount=1000, paid=True, payment_date=None)
            db.session.add(fee)
            db.session.flush()

            payment = Payment(fee_id=fee.id, amount=fee.amount, paid_on=None, transaction_id=None, payment_method='cash')
            db.session.add(payment)
            db.session.flush()

            receipt = Receipt(payment_id=payment.id, receipt_number=f'TEST-RCP-{uuid.uuid4().hex[:6].upper()}', issued_to=student.name, parent_name=student.parent_name or '', total_amount=fee.amount, payment_method='cash')
            db.session.add(receipt)
            db.session.commit()
            target = receipt
            created_objects = [receipt, payment, fee, enrollment, student, classroom]

        # Render the server template for inspection inside a request context
        from flask import url_for as flask_url_for

        def safe_url_for(endpoint, **values):
            try:
                return flask_url_for(endpoint, **values)
            except Exception:
                return '#'

        with app.test_request_context('/'):
            html = render_template('fees/view_receipt.html', receipt=target, url_for=safe_url_for)
        # Try to extract the Class line for quick verification
        import re
        m = re.search(r"<strong>Class:</strong>\s*(.*?)<", html)
        if m:
            cls = m.group(1).strip()
            print(f'Found receipt id={target.id} for student with class: {cls}')
        else:
            # Fallback: print a short snippet around 'Class:'
            idx = html.find('Class:')
            start = max(0, idx-80)
            end = min(len(html), idx+160)
            print('Rendered receipt (snippet):')
            print(html[start:end])
        # Cleanup temporary objects if we created them
        if 'created_objects' in locals():
            try:
                for obj in created_objects:
                    db.session.delete(obj)
                db.session.commit()
                print('Temporary test data removed.')
            except Exception:
                db.session.rollback()
                print('Warning: failed to clean up temporary test data.')
        return 0


if __name__ == '__main__':
    exit(find_and_render())
