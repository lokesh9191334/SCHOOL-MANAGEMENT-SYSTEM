from app import create_app
from models import db, User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email='smsad373@gmail.com').first()
    if user:
        user.set_password('AdminPass123')
        db.session.commit()
        print(f'Password reset for {user.email}')
        print(f'Testing verification: {user.check_password("AdminPass123")}')
    else:
        print('User not found')
