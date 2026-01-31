import sys

sys.path.insert(0, '.')
from app import create_app
from routes.fees import get_receipt

app = create_app()
with app.app_context():
    # Call the original (undecorated) function to bypass login_required
    handler = getattr(get_receipt, '__wrapped__', get_receipt)
    res = handler(1)

    # Handler may return (response, status) or a Response
    if isinstance(res, tuple):
        body, status = res
        try:
            data = body.get_json()
        except Exception:
            data = body.get_data(as_text=True)
    else:
        body = res
        status = getattr(res, 'status_code', None)
        try:
            data = body.get_json()
        except Exception:
            data = body.get_data(as_text=True)

    print('Status:', status)
    print('Body:', data)
