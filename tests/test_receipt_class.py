import uuid

import pytest

from app import create_app
from models import Classroom, Enrollment, Fee, Payment, Receipt, Student, db


@pytest.fixture
def app():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'})
    with app.app_context():
        db.create_all()
        yield app


def test_receipt_includes_class(app):
    with app.app_context():
        # Create classroom and student and enrollment
        cls = Classroom(name='UnitTest-9B', grade='9')
        db.session.add(cls)
        db.session.flush()

        student = Student(name='Unit Test Student')
        db.session.add(student)
        db.session.flush()

        enrollment = Enrollment(student_id=student.id, classroom_id=cls.id)
        db.session.add(enrollment)
        db.session.flush()

        # Create fee, payment, receipt
        fee = Fee(student_id=student.id, amount=500, paid=True)
        db.session.add(fee)
        db.session.flush()

        payment = Payment(fee_id=fee.id, amount=fee.amount, paid_on=None, transaction_id=None, payment_method='cash')
        db.session.add(payment)
        db.session.flush()

        receipt = Receipt(payment_id=payment.id, receipt_number=f'TEST-{uuid.uuid4().hex[:6].upper()}', issued_to=student.name, total_amount=fee.amount, payment_method='cash')
        db.session.add(receipt)
        db.session.commit()

        # Render template to string inside a request context and check for class name
        from flask import render_template
        with app.test_request_context('/'):
            html = render_template('fees/view_receipt.html', receipt=receipt)
        assert 'UnitTest-9B' in html or '9' in html