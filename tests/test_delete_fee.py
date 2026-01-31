from models import Fee, FeeType


def test_delete_fee_authenticated(client, auth, db, student):
    # Create a fee type and fee for the student
    ft = FeeType(name='Test Fee Type', description='For delete test')
    db.session.add(ft)
    db.session.commit()

    fee = Fee(student_id=student.id, fee_type_id=ft.id, amount=1000)
    db.session.add(fee)
    db.session.commit()

    # Ensure fee exists
    assert db.session.get(Fee, fee.id) is not None

    # Login as admin
    resp = auth.login()
    assert resp.status_code in (302, 200)

    # Perform delete
    del_resp = client.post(f'/fees/{fee.id}/delete', follow_redirects=True)
    assert del_resp.status_code == 200

    # Fee should be gone
    assert db.session.get(Fee, fee.id) is None
