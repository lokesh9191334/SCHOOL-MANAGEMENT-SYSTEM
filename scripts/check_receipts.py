import sys

sys.path.insert(0, '.')
from app import create_app
from models import Fee

app = create_app()
with app.app_context():
    paid_fees = Fee.query.filter(Fee.paid==True).all()
    if not paid_fees:
        print('No paid fees found')
    for fee in paid_fees:
        print(f'Fee {fee.id}: paid={fee.paid}, payments={len(fee.payments)}')
        for p in fee.payments:
            print(f'  Payment {p.id}: method={p.payment_method}, txn={p.transaction_id}, receipts={len(p.receipts)}')
            for r in p.receipts:
                print(f'    Receipt {r.id}: number={r.receipt_number}, issued_to={r.issued_to}')
