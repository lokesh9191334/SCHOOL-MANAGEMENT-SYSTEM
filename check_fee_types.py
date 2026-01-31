from app import create_app
from models import FeeType

app = create_app()
with app.app_context():
    fee_types = FeeType.query.all()
    print('Fee Types:')
    for ft in fee_types:
        print(f'- {ft.name}')
    if not fee_types:
        print('No fee types found')
