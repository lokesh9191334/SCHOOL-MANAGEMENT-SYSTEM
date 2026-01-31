from app import create_app
from models import User, db

app = create_app()
with app.app_context():
    if not User.query.filter_by(email='admin@example.com').first():
        admin = User(name='Administrator', email='admin@example.com', role='admin')
        admin.set_password('adminpass')
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: admin@example.com / adminpass")
    else:
        print("Admin user already exists.")
