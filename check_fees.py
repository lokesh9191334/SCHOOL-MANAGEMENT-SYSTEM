from app import create_app
from models import Fee

app = create_app()
with app.app_context():
    fees = Fee.query.all()
    print(f'Total fees: {len(fees)}')
    for f in fees:
        print(f'ID: {f.id}, Amount: {f.amount}, Paid: {f.paid}')
