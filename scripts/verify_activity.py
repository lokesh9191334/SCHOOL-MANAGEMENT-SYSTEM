from app import create_app
from models import db, ActivityLog, User

app = create_app()
with app.app_context():
    client = app.test_client()
    # failed login
    r = client.post('/auth/login', data={'email':'nonexistent@example.com','password':'x'})
    print('Failed login status', r.status_code)
    # try existing admin
    u = User.query.filter_by(email='smsad373@gmail.com').first()
    if u:
        r2 = client.post('/auth/login', data={'email':u.email,'password':'AdminPass123'})
        print('Correct login status', r2.status_code)
    logs = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(6).all()
    print('Recent activity logs:')
    for l in logs:
        print(l.timestamp, l.category, l.message, l.ip_address, l.user_id)
