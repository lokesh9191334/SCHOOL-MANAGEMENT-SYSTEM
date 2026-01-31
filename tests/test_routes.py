def test_login_required(client):
    """Test that protected routes require login."""
    # Try to access protected routes
    routes = [
        '/students/add',
        '/teachers/add',
        '/subjects/add',
        '/fees/create',
        '/attendance/mark'
    ]
    for route in routes:
        response = client.get(route)
        assert response.status_code == 302  # Should redirect to login

def test_admin_required(client, auth):
    """Test that admin-only actions are protected."""
    # Login as non-admin
    auth.login(email='teacher@test.com', password='test123')
    
    # Try to delete resources
    routes = [
        '/students/delete/1',
        '/teachers/delete/1',
        '/subjects/delete/1'
    ]
    for route in routes:
        response = client.post(route)
        assert response.status_code == 302  # Should redirect

def test_student_views(client, auth):
    """Test student listing and creation."""
    # Login
    auth.login()
    
    # List students
    response = client.get('/students/')
    assert response.status_code == 200
    
    # Create student
    response = client.post('/students/add', data={
        'name': 'New Student',
        'roll_number': 'NS001',
        'classroom_id': '1'
    })
    assert response.status_code == 302  # Should redirect to list

def test_attendance_marking(client, auth):
    """Test attendance marking functionality."""
    # Login
    auth.login()
    
    # Mark attendance
    response = client.post('/attendance/mark', data={
        'date': '2025-11-05',
        'present_1': 'on'  # Student 1 is present
    })
    assert response.status_code == 302  # Should redirect to list

def test_fee_management(client, auth):
    """Test fee creation and payment."""
    # Login
    auth.login()
    
    # Create fee
    response = client.post('/fees/add', data={
        'student_id': '1',
        'amount': '1000',
        'due_date': '2025-12-01'
    })
    assert response.status_code == 302  # Should redirect to list
    
    # Mark fee as paid
    response = client.post('/fees/pay/1', data={'amount': '1000'})
    assert response.status_code == 302  # Should redirect to list

def test_csv_exports(client, auth):
    """Test CSV export functionality."""
    # Login
    auth.login()
    
    # Try all export routes
    routes = [
        '/students/export',
        '/attendance/export',
        '/fees/export'
    ]
    for route in routes:
        response = client.get(route)
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'text/csv'