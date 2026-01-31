from app import create_app
from models import User, ActivityLog
app = create_app()
with app.app_context():
    client = app.test_client()
    admin = User.query.filter_by(email='smsad373@gmail.com').first()
    if admin:
        client.post('/auth/login', data={'email': admin.email, 'password': 'AdminPass123'})
    payload = {'message':'test client error','stack':'stacktrace','url':'/fees/test.js','line':123,'col':45}
    r = client.post('/api/client/log', json=payload)
    print('Client log endpoint status', r.status_code, r.get_json())
    log = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).first()
    print('Most recent activity log:', log.timestamp, log.category, log.message[:120])
