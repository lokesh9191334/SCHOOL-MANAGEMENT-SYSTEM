import sys

sys.path.insert(0, '.')
from app import create_app

app = create_app()
with app.test_client() as client:
    resp = client.get('/fees/1/receipt')
    print('Status code:', resp.status_code)
    try:
        print('JSON:', resp.get_json())
    except Exception:
        print('Body:', resp.data.decode())
