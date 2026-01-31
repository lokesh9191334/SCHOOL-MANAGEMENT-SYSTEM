"""
Notification system for sending emails and SMS reminders
"""
import os
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Blueprint, current_app, flash, request, jsonify, render_template
from flask_login import login_required, current_user

from models import Reminder, db, Notification, Message, Payment, Student, User, Parent

notifications_bp = Blueprint('notifications', __name__)

# Email configuration
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')

# SMS configuration (using Twilio as example)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')

# Scheduler for automated reminders
scheduler = BackgroundScheduler()
scheduler.start()

def send_email(to_email, subject, body):
    """Send email using SMTP"""
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USERNAME, to_email, text)
        server.quit()
        return True
    except Exception as e:
        current_app.logger.error(f"Email sending failed: {str(e)}")
        return False

def send_sms(to_phone, message):
    """Send SMS using Twilio"""
    try:
        if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
            current_app.logger.warning("Twilio credentials not configured")
            return False

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        data = {
            'From': TWILIO_PHONE_NUMBER,
            'To': to_phone,
            'Body': message
        }

        response = requests.post(url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))

        if response.status_code == 201:
            current_app.logger.info(f"SMS sent successfully to {to_phone}")
            return True
        else:
            current_app.logger.error(f"Failed to send SMS to {to_phone}: {response.text}")
            return False
    except Exception as e:
        current_app.logger.error(f"Failed to send SMS to {to_phone}: {str(e)}")
        return False

def send_reminder_notification(reminder):
    """Send a reminder notification based on type"""
    try:
        fee = reminder.fee
        if not fee or not fee.student:
            current_app.logger.error(f"No fee or student found for reminder {reminder.id}")
            return False

        student = fee.student

        # Prepare message content
        message_content = reminder.message or f"""
Dear {student.full_name()},

This is a reminder that your fee payment of ₹{fee.amount} is due on {fee.due_date.strftime('%d %b %Y') if fee.due_date else 'N/A'}.

Please make the payment at your earliest convenience to avoid any late fees.

Thank you,
School Management Team
"""

        success = False

        if reminder.reminder_type in ['email', 'both']:
            if student.email:
                subject = f"Fee Payment Reminder - {student.full_name()}"
                success = send_email(student.email, subject, message_content)
            else:
                current_app.logger.warning(f"No email address for student {student.full_name()}")

        if reminder.reminder_type in ['sms', 'both']:
            if student.phone:
                # Format phone number for SMS (add country code if not present)
                phone = student.phone
                if not phone.startswith('+'):
                    phone = '+91' + phone.lstrip('0')  # Assuming Indian numbers, adjust as needed

                success = send_sms(phone, message_content[:160])  # SMS limit
            else:
                current_app.logger.warning(f"No phone number for student {student.full_name()}")

        # Update reminder status
        reminder.sent = True
        reminder.sent_at = datetime.utcnow()
        db.session.commit()

        return success

    except Exception as e:
        current_app.logger.error(f"Failed to send reminder {reminder.id}: {str(e)}")
        return False

def process_pending_reminders():
    """Process all pending reminders that are due"""
    try:
        now = datetime.utcnow()
        pending_reminders = Reminder.query.filter(
            Reminder.scheduled_date <= now,
            Reminder.sent == False
        ).all()

        sent_count = 0
        for reminder in pending_reminders:
            if send_reminder_notification(reminder):
                sent_count += 1

        if sent_count > 0:
            current_app.logger.info(f"Successfully sent {sent_count} reminders")

    except Exception as e:
        current_app.logger.error(f"Error processing pending reminders: {str(e)}")

def schedule_reminder(reminder):
    """Schedule a reminder for future sending"""
    try:
        # Add job to scheduler
        job_id = f"reminder_{reminder.id}"
        scheduler.add_job(
            func=send_reminder_notification,
            trigger="date",
            run_date=reminder.scheduled_date,
            args=[reminder],
            id=job_id,
            replace_existing=True
        )
        current_app.logger.info(f"Reminder {reminder.id} scheduled for {reminder.scheduled_date}")
    except Exception as e:
        current_app.logger.error(f"Failed to schedule reminder {reminder.id}: {str(e)}")

@notifications_bp.route('/send_reminder/<int:reminder_id>', methods=['POST'])
@login_required
def send_reminder_now(reminder_id):
    """Send a reminder immediately"""
    try:
        reminder = Reminder.query.get_or_404(reminder_id)

        if send_reminder_notification(reminder):
            flash('Reminder sent successfully!', 'success')
        else:
            flash('Failed to send reminder. Please check the logs.', 'error')

    except Exception as e:
        current_app.logger.error(f"Error sending reminder {reminder_id}: {str(e)}")
        flash('An error occurred while sending the reminder.', 'error')

    return redirect(request.referrer or url_for('fees.list_reminders'))

@notifications_bp.route('/')
@login_required
def index():
    """Notifications Dashboard"""
    return render_template('notifications/index.html')

@notifications_bp.route('/send_custom', methods=['POST'])
@login_required
def send_custom():
    """Send custom notification (Mock)"""
    flash('Notification queued for sending!', 'success')
    return redirect(url_for('notifications.index'))

@notifications_bp.route('/test_email', methods=['GET'])
@login_required
def test_email():
    """Test email functionality"""
    try:
        test_email = current_app.config.get('ADMIN_EMAIL', SMTP_USERNAME)
        if not test_email:
            flash('No test email configured', 'warning')
            return redirect(request.referrer or url_for('main.index'))

        subject = "Test Email from School Management System"
        body = """
        <h2>Test Email</h2>
        <p>This is a test email to verify that the email notification system is working correctly.</p>
        <p>If you received this email, the notification system is properly configured.</p>
        <br>
        <p>Best regards,<br>School Management System</p>
        """

        if send_email(test_email, subject, body):
            flash('Test email sent successfully! Check your inbox.', 'success')
        else:
            flash('Failed to send test email. Please check SMTP configuration.', 'error')

    except Exception as e:
        current_app.logger.error(f"Error sending test email: {str(e)}")
        flash('An error occurred while sending the test email.', 'error')

    return redirect(request.referrer or url_for('main.index'))

@notifications_bp.route('/test_sms', methods=['GET'])
@login_required
def test_sms():
    """Test SMS functionality"""
    try:
        test_phone = current_app.config.get('ADMIN_PHONE', '')
        if not test_phone:
            flash('No test phone number configured', 'warning')
            return redirect(request.referrer or url_for('main.index'))

        message = "Test SMS from School Management System. If you received this message, SMS notifications are working correctly."

        if send_sms(test_phone, message):
            flash('Test SMS sent successfully! Check your phone.', 'success')
        else:
            flash('Failed to send test SMS. Please check Twilio configuration.', 'error')

    except Exception as e:
        current_app.logger.error(f"Error sending test SMS: {str(e)}")
        flash('An error occurred while sending the test SMS.', 'error')

    return redirect(request.referrer or url_for('main.index'))

# Initialize scheduler when the app starts
def init_scheduler():
    """Initialize the reminder scheduler"""
    try:
        # Schedule the reminder processor to run every 5 minutes
        scheduler.add_job(
            func=process_pending_reminders,
            trigger="interval",
            minutes=5,
            id="process_reminders",
            replace_existing=True
        )
        current_app.logger.info("Reminder scheduler initialized")
    except Exception as e:
        current_app.logger.error(f"Failed to initialize reminder scheduler: {str(e)}")

# Call this function when the app starts
# This should be called from app.py or __init__.py
