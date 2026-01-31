from app import create_app
from models import db, ActivityLog, User
app = create_app()
with app.app_context():
    client = app.test_client()
    # login as admin
    admin = User.query.filter_by(email='smsad373@gmail.com').first()
    if admin:
        rv = client.post('/auth/login', data={'email': admin.email, 'password': 'AdminPass123'})
        print('Login status', rv.status_code)
    else:
        print('Admin user not found')
    r = client.get('/authorized_activity?page=1&per_page=5')
    print('Status', r.status_code)
    print('Contains form', 'Start YYYY-MM-DD' in r.get_data(as_text=True))
    r2 = client.get('/authorized_activity?ip=255.255.255.255')
    print('Filtered status', r2.status_code)
    print('No logs message present?', 'No activity logs found' in r2.get_data(as_text=True) or 'list-group' in r2.get_data(as_text=True))
