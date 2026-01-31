#!/usr/bin/env python3
"""
Create sample attendance and fee data for parent portal testing
"""
import sys
import os
from datetime import date, timedelta
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models import Student, Attendance, Fee, FeeType, Payment

app = create_app()

def create_sample_data():
    """Create sample data for testing"""
    with app.app_context():
        # Get the test student
        student = Student.query.filter_by(email='test.student@example.com').first()
        if not student:
            print("ERROR: Test student not found!")
            return False

        print(f"Creating sample data for: {student.name}")

        # Create attendance for last 30 days
        today = date.today()
        attendance_count = 0

        for i in range(30):
            attendance_date = today - timedelta(days=i)

            # Skip weekends for school days
            if attendance_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                continue

            # Create attendance record (90% attendance rate)
            is_present = True if i < 27 else False  # 3 absences in 30 days

            attendance = Attendance(
                student_id=student.id,
                date=attendance_date,
                present=is_present
            )
            db.session.add(attendance)
            attendance_count += 1

        # Create fee types if they don't exist
        tuition_fee = FeeType.query.filter_by(name='Tuition Fee').first()
        if not tuition_fee:
            tuition_fee = FeeType(
                name='Tuition Fee',
                description='Monthly tuition fee',
                is_recurring=True,
                frequency='monthly',
                default_amount=5000.00
            )
            db.session.add(tuition_fee)

        exam_fee = FeeType.query.filter_by(name='Exam Fee').first()
        if not exam_fee:
            exam_fee = FeeType(
                name='Exam Fee',
                description='Examination fee',
                is_recurring=False,
                default_amount=1000.00
            )
            db.session.add(exam_fee)

        db.session.commit()

        # Create fees for current academic year
        # Tuition fee (paid)
        tuition_fee_record = Fee(
            student_id=student.id,
            fee_type_id=tuition_fee.id,
            amount=5000.00,
            due_date=date(today.year, today.month, 10),
            paid=True,
            payment_date=today - timedelta(days=5),
            academic_year=f"{today.year}-{today.year+1}",
            description="Monthly Tuition Fee"
        )
        db.session.add(tuition_fee_record)

        # Exam fee (pending)
        exam_fee_record = Fee(
            student_id=student.id,
            fee_type_id=exam_fee.id,
            amount=1000.00,
            due_date=today + timedelta(days=15),
            paid=False,
            academic_year=f"{today.year}-{today.year+1}",
            description="Final Exam Fee"
        )
        db.session.add(exam_fee_record)

        # Create payment for tuition fee
        payment = Payment(
            fee_id=tuition_fee_record.id,
            amount=5000.00,
            paid_on=tuition_fee_record.payment_date,
            payment_method='online',
            transaction_id=f"TXN_{student.id}_{tuition_fee_record.id}"
        )
        db.session.add(payment)

        db.session.commit()

        print("SUCCESS: Sample data created!")
        print(f"Attendance records: {attendance_count}")
        print(f"Fees created: 2 (1 paid, 1 pending)")
        print(f"Payment recorded: ₹5000 for tuition fee")

        return True

if __name__ == "__main__":
    success = create_sample_data()
    if success:
        print("\nSample data created successfully!")
        print("Parent portal will now show attendance and fee data!")
    else:
        print("\nFailed to create sample data!")