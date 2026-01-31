from app import create_app
from models import User
app = create_app()
with app.app_context():
    client = app.test_client()
    admin = User.query.filter_by(email='smsad373@gmail.com').first()
    if admin:
        client.post('/auth/login', data={'email': admin.email, 'password': 'AdminPass123'})
    r = client.get('/fees', follow_redirects=True)
    with open('debug_fees_response2.html', 'w', encoding='utf-8') as f:
        f.write(r.get_data(as_text=True))
    print('Status', r.status_code)
    print('Contains feesTable', 'feesTable' in r.get_data(as_text=True))
    print('Sample row data-fee-type present?', 'data-fee-type' in r.get_data(as_text=True))
