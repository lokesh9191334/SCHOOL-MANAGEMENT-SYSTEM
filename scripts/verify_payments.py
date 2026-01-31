import sys

sys.path.insert(0, '.')
from app import create_app
from models import Payment

app = create_app()
with app.app_context():
    payments = Payment.query.all()
    for p in payments:
        print(f'Payment {p.id}: method={p.payment_method}, txn={p.transaction_id}')
