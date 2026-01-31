import os
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure the project root is on sys.path so tests can import app and models
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import models
from app import create_app


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    # Create a temporary file to isolate the database for each test
    db_fd, db_path = tempfile.mkstemp()
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}'})

    # Create the database and load test data
    with app.app_context():
        models.db.create_all()
        # Create test admin user
        admin = models.User(email='admin@test.com', name='Test Admin')
        admin.set_password('testpass123')
        # some User models use boolean field, others method — set attribute
        try:
            admin.is_admin = True
        except Exception:
            pass
        models.db.session.add(admin)
        models.db.session.commit()

    yield app

    # Close and remove the temporary database
    # Ensure DB sessions/engines are closed before unlinking the file (Windows locks files)
    try:
        models.db.session.remove()
    except Exception:
        pass
    try:
        if hasattr(models.db, 'engine') and models.db.engine:
            models.db.engine.dispose()
    except Exception:
        pass

    os.close(db_fd)
    try:
        os.unlink(db_path)
    except PermissionError:
        # On Windows the file may still be locked briefly; ignore cleanup failure
        pass


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture
def auth(client):
    """Authentication helper for tests."""
    class AuthActions:
        def __init__(self, client):
            self._client = client

        def login(self, email='admin@test.com', password='testpass123'):
            return self._client.post(
                '/auth/login',
                data={'email': email, 'password': password}
            )

        def logout(self):
            return self._client.get('/auth/logout')

    return AuthActions(client)


@pytest.fixture
def db_session(app):
    """Provide the SQLAlchemy db object within app context."""
    with app.app_context():
        yield models.db


@pytest.fixture
def db(db_session):
    """Alias fixture so tests can request 'db' directly."""
    return db_session


@pytest.fixture
def student(db_session):
    s = models.Student(name='Test Student', roll_number='TS001')
    models.db.session.add(s)
    models.db.session.commit()
    # If a classroom exists, enroll the student in the first classroom so tests that
    # expect a student to be part of a class will pass.
    classroom = models.Classroom.query.first()
    if classroom:
        enrollment = models.Enrollment(student_id=s.id, classroom_id=classroom.id)
        models.db.session.add(enrollment)
        models.db.session.commit()
    return s


@pytest.fixture
def teacher(db_session):
    t = models.Teacher(name='Test Teacher')
    models.db.session.add(t)
    models.db.session.commit()
    return t


@pytest.fixture
def classroom(db_session):
    c = models.Classroom(name='Test Class', grade='10')
    models.db.session.add(c)
    models.db.session.commit()
    return c
