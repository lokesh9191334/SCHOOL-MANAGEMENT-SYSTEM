from datetime import datetime

from app import create_app
from models import Fee, FeeType, Student

app = create_app()
with app.app_context():
    # Get first student
    student = Student.query.first()
    if not student:
        print("No students found")
        exit()

    # Get first fee type
    fee_type = FeeType.query.first()
    if not fee_type:
        print("No fee types found")
        exit()

    # Create unpaid fees
    unpaid_fee1 = Fee(
        student_id=student.id,
        fee_type_id=fee_type.id,
        amount=5000.00,
        paid=False,
        due_date=datetime(2024, 12, 31),
        description="Unpaid Tuition Fee"
    )

    unpaid_fee2 = Fee(
        student_id=student.id,
        fee_type_id=fee_type.id,
        amount=2500.00,
        paid=False,
        due_date=datetime(2024, 12, 31),
        description="Unpaid Exam Fee"
    )

    from models import db
    db.session.add(unpaid_fee1)
    db.session.add(unpaid_fee2)
    db.session.commit()

    print("Added 2 unpaid fees")
