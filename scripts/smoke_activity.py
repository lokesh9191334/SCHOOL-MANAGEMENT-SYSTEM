from app import create_app
from models import db, ActivityLog
app = create_app()
with app.app_context():
    client = app.test_client()
    r = client.get('/authorized_activity?page=1&per_page=5')
    print('Status', r.status_code)
    print('Contains form', 'Start YYYY-MM-DD' in r.get_data(as_text=True))
    r2 = client.get('/authorized_activity?ip=255.255.255.255')
    print('Filtered status', r2.status_code)
    print('No logs message present?', 'No activity logs found' in r2.get_data(as_text=True) or 'list-group' in r2.get_data(as_text=True))
