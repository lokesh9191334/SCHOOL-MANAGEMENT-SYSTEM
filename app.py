import logging
import os
import uuid
from datetime import datetime

from flask import Flask, g, request, redirect, url_for, jsonify
from flask_login import LoginManager
from flask_migrate import Migrate
from authlib.integrations.flask_client import OAuth
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import time
from collections import defaultdict

from models import User, db
from config import Config


# Rate Limiting Storage
rate_limit_store = defaultdict(list)


class RateLimiter:
    def __init__(self, requests_per_minute=300, requests_per_hour=10000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.disabled = False

    def is_allowed(self, key):
        # Check if rate limiting is disabled
        if self.disabled:
            return True, 0
            
        now = time.time()
        minute_ago = now - 60
        hour_ago = now - 3600

        # Clean old entries
        rate_limit_store[key] = [req_time for req_time in rate_limit_store[key]
                                if req_time > hour_ago]

        # Check minute limit
        minute_requests = sum(1 for req_time in rate_limit_store[key] if req_time > minute_ago)
        if minute_requests >= self.requests_per_minute:
            return False, 60 - (now - rate_limit_store[key][-1])

        # Check hour limit
        hour_requests = len(rate_limit_store[key])
        if hour_requests >= self.requests_per_hour:
            return False, 3600 - (now - rate_limit_store[key][0])

        # Add current request
        rate_limit_store[key].append(now)
        return True, 0


# Global rate limiter
rate_limiter = RateLimiter()


def create_app(config=None):
    app = Flask(__name__)
    # Expose useful date utilities to Jinja templates
    app.jinja_env.globals['datetime'] = datetime
    app.jinja_env.globals['relativedelta'] = relativedelta
    
    # Configuration
    app.config.from_object(Config)
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    
    # Configure rate limiter based on environment
    if app.config.get('DISABLE_RATE_LIMITING', False):
        rate_limiter.disabled = True
        app.logger.info("Rate limiting DISABLED")
    elif app.config.get('DEBUG', False):
        # More lenient limits in development
        rate_limiter.requests_per_minute = 1000
        rate_limiter.requests_per_hour = 50000
        app.logger.info("Rate limiting set to DEVELOPMENT mode")
    else:
        app.logger.info("Rate limiting set to PRODUCTION mode")
    
    # Upload folder configuration
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    os.makedirs(os.path.join(app.root_path, 'logs'), exist_ok=True)
    server_log_path = os.path.join(app.root_path, 'logs', 'server.log')
    # Use UTF-8 with BOM so PowerShell renders correctly; truncate on start to remove old corrupted content.
    server_handler = logging.FileHandler(server_log_path, mode='w', encoding='utf-8-sig')
    server_handler.setLevel(logging.INFO)
    server_handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s in %(module)s: %(message)s'))

    app.logger.setLevel(logging.INFO)
    if not any(getattr(h, 'baseFilename', None) == server_log_path for h in app.logger.handlers):
        app.logger.addHandler(server_handler)

    werkzeug_logger = logging.getLogger('werkzeug')
    if not any(getattr(h, 'baseFilename', None) == server_log_path for h in werkzeug_logger.handlers):
        werkzeug_logger.addHandler(server_handler)
    werkzeug_logger.setLevel(logging.INFO)

    if config:
        app.config.update(config)

    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)
    
    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    # Auto-clean database on startup to prevent existing account conflicts
    # TEMPORARILY DISABLED TO ALLOW USER CREATION
    # with app.app_context():
    #     try:
    #         # Check for existing users and clean them automatically
    #         existing_users = User.query.all()
    #         if existing_users:
    #             print("🧹 AUTO-CLEANUP: Removing existing users to prevent conflicts...")
    #             for user in existing_users:
    #                 print(f"  ❌ Removing: {user.name} ({user.email})")
    #                 db.session.delete(user)
    #             
    #             # Clean related data
    #             from models import Parent, Teacher, Student, School
    #             Parent.query.delete()
    #             Teacher.query.delete()
    #             Student.query.delete()
    #             School.query.delete()
    #             
    #             db.session.commit()
    #             print("✅ AUTO-CLEANUP: Database is now clean!")
    #         else:
    #             print("✅ Database is already clean!")
    #     except Exception as e:
    #         print(f"⚠️ Auto-cleanup warning: {e}")
    #         db.session.rollback()

    # Log unauthorized accesses to ActivityLog
    @login_manager.unauthorized_handler
    def handle_unauthorized():
        try:
            from utils import log_activity
            # Get the most accurate IP address
            ip = request.headers.get('X-Real-IP') or \
                 request.headers.get('X-Client-IP') or \
                 (request.headers.get('X-Forwarded-For', '').split(',')[0].strip() if request.headers.get('X-Forwarded-For') else None) or \
                 request.remote_addr
            ua = request.headers.get('User-Agent', '')
            log_activity('warning', f'Unauthorized access to {request.path} by IP {ip} UA {ua}')
        except Exception:
            app.logger.exception('Failed to write unauthorized activity')
        return redirect(url_for('auth.login'))

    # Initialize Authlib OAuth
    oauth = OAuth(app)
    oauth.register(
        name='google',
        client_id=app.config.get('GOOGLE_CLIENT_ID'),
        client_secret=app.config.get('GOOGLE_CLIENT_SECRET'),
        server_metadata_url=app.config.get('GOOGLE_DISCOVERY_URL'),
        client_kwargs={'scope': 'openid email profile'},
    )

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
        
    # Register Blueprints
    from routes.ai_features import ai_features_bp
    from routes.api import api_bp
    from routes.api_integrations import api_integrations_bp
    from routes.attendance import attendance_bp
    from routes.auth import auth_bp
    from routes.chart import chart_bp
    from routes.classes import classes_bp
    from routes.classrooms import classrooms_bp
    from routes.dashboard import dashboard_bp
    from routes.fees import fees_bp
    from routes.mobile import mobile_bp
    from routes.notifications import notifications_bp
    from routes.parents import parents_bp
    from routes.payment_gateway import payment_bp
    from routes.payments import payments_bp
    from routes.ip_tracking import ip_tracking_bp
    from routes.salaries import salaries_bp
    from routes.students import students_bp
    from routes.subjects import subjects_bp
    from routes.teachers import teachers_bp
    from routes.complaints import complaints_bp
    from routes.class_fees import class_fees_bp
    from routes.admin_teacher import admin_teacher_bp
    from routes.teacher_substitution import teacher_substitution_bp
    from services.auto_approval_service import auto_approval_service
    from routes.timetable import timetable_bp
    from routes.enhanced_timetable_simple import enhanced_timetable_bp
    from routes.date_sheet import date_sheet_bp
    from routes.admin import admin_bp
    from routes.ip_tracker import ip_tracker_bp
    from routes.leave_status import leave_status_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/')
    app.register_blueprint(parents_bp, url_prefix='/parents')
    app.register_blueprint(students_bp, url_prefix='/students')
    app.register_blueprint(teachers_bp, url_prefix='/teachers')
    app.register_blueprint(classes_bp, url_prefix='/classes')
    app.register_blueprint(classrooms_bp, url_prefix='/classrooms')
    app.register_blueprint(subjects_bp, url_prefix='/subjects')
    app.register_blueprint(attendance_bp, url_prefix='/attendance')
    app.register_blueprint(fees_bp, url_prefix='/fees')
    app.register_blueprint(salaries_bp, url_prefix='/salaries')
    app.register_blueprint(notifications_bp, url_prefix='/notifications')
    app.register_blueprint(payments_bp, url_prefix='/payments')
    app.register_blueprint(ip_tracking_bp)
    app.register_blueprint(mobile_bp, url_prefix='/mobile')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(api_integrations_bp, url_prefix='/api_integrations')
    app.register_blueprint(ai_features_bp, url_prefix='/ai_features')
    app.register_blueprint(chart_bp, url_prefix='/chart')
    app.register_blueprint(complaints_bp, url_prefix='/complaints')
    app.register_blueprint(payment_bp, url_prefix='/payment')
    app.register_blueprint(class_fees_bp, url_prefix='/class-fees')
    app.register_blueprint(admin_teacher_bp, url_prefix='/admin')
    app.register_blueprint(teacher_substitution_bp, url_prefix='/substitution')
    app.register_blueprint(timetable_bp, url_prefix='/timetable')
    app.register_blueprint(enhanced_timetable_bp, url_prefix='/enhanced-timetable')
    app.register_blueprint(date_sheet_bp, url_prefix='/date-sheet')
    app.register_blueprint(admin_bp)
    app.register_blueprint(ip_tracker_bp, url_prefix='/ip-tracker')
    app.register_blueprint(leave_status_bp)

    # Start auto-approval monitoring service
    try:
        auto_approval_service.start_auto_approval_monitor()
        print("✅ Auto-approval monitoring service started")
    except Exception as e:
        print(f"⚠️ Error starting auto-approval service: {e}")

    # Security headers and audit logging
    security_log_path = os.path.join(app.root_path, 'logs', 'security_audit.log')
    security_logger = logging.getLogger('security_audit')
    security_logger.setLevel(logging.INFO)
    if not security_logger.handlers:
        fh = logging.FileHandler(security_log_path, encoding='utf-8')
        fmt = logging.Formatter('%(message)s')
        fh.setFormatter(fmt)
        security_logger.addHandler(fh)

    @app.before_request
    def rate_limit_and_security_check():
        """Rate limiting and basic security checks"""
        # Get client identifier
        client_ip = request.headers.get('X-Real-IP') or \
                   request.headers.get('X-Client-IP') or \
                   (request.headers.get('X-Forwarded-For', '').split(',')[0].strip() if request.headers.get('X-Forwarded-For') else None) or \
                   request.remote_addr

        # Skip rate limiting for static files and health checks
        if request.path.startswith('/static/') or request.path == '/health':
            return

        # Apply rate limiting
        allowed, retry_after = rate_limiter.is_allowed(client_ip)
        if not allowed:
            response = jsonify({
                'error': 'Rate limit exceeded',
                'retry_after': int(retry_after),
                'message': f'Too many requests. Try again in {int(retry_after)} seconds.'
            })
            response.status_code = 429
            response.headers['Retry-After'] = str(int(retry_after))
            response.headers['X-RateLimit-Reset'] = str(int(time.time() + retry_after))

            # Log rate limit violation
            security_logger.info(f"RATE_LIMIT_EXCEEDED - IP: {client_ip}, Path: {request.path}, Retry-After: {retry_after}")

            return response

        # Basic security checks
        user_agent = request.headers.get('User-Agent', '')

        # Block suspicious user agents
        suspicious_patterns = [
            'sqlmap', 'nmap', 'masscan', 'dirbuster', 'gobuster',
            'nikto', 'acunetix', 'openvas', 'nessus', 'qualys',
            'burp', 'owasp', 'metasploit', 'wpscan', 'joomlavs'
        ]

        if any(pattern.lower() in user_agent.lower() for pattern in suspicious_patterns):
            security_logger.warning(f"SUSPICIOUS_UA_BLOCKED - IP: {client_ip}, UA: {user_agent[:200]}")
            return jsonify({'error': 'Access denied'}), 403

        # Check for suspicious request patterns
        if len(request.url) > 2048:  # URL too long
            security_logger.warning(f"SUSPICIOUS_URL_BLOCKED - IP: {client_ip}, URL Length: {len(request.url)}")
            return jsonify({'error': 'Request too long'}), 414

        # Check request size (for POST requests)
        if request.method == 'POST' and request.content_length:
            if request.content_length > 10 * 1024 * 1024:  # 10MB limit
                security_logger.warning(f"LARGE_REQUEST_BLOCKED - IP: {client_ip}, Size: {request.content_length}")
                return jsonify({'error': 'Request too large'}), 413

    @app.before_request
    def assign_request_id_and_log():
        g.request_id = str(uuid.uuid4())
        g.start_time = datetime.utcnow()

    @app.after_request
    def set_security_headers(response):
        # Enhanced Security Headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-Permitted-Cross-Domain-Policies'] = 'none'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
        # response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        # response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        # response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'

        # HSTS for HTTPS
        if request.is_secure or os.environ.get('FORCE_HSTS', '1') == '1':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'

        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://code.jquery.com https://cdnjs.cloudflare.com https://www.google.com https://www.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.qrserver.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers['Content-Security-Policy'] = csp

        # Cache control for sensitive content
        try:
            ct = response.headers.get('Content-Type', '')
            if 'text/html' in ct:
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
                response.headers['Pragma'] = 'no-cache'
        except Exception:
            pass

        return response

    @app.teardown_request
    def audit_log_request(exception):
        try:
            user_id = getattr(getattr(request, 'current_user', None), 'id', None)
            if not user_id and hasattr(request, 'user') and getattr(request, 'user', None):
                user_id = request.user.id
        except Exception:
            user_id = None
        status = getattr(request, 'status_code', None)
        ip = request.headers.get('X-Real-IP') or \
             request.headers.get('X-Client-IP') or \
             (request.headers.get('X-Forwarded-For', '').split(',')[0].strip() if request.headers.get('X-Forwarded-For') else None) or \
             request.remote_addr
        ua = request.headers.get('User-Agent', '')
        line = {
            'ts': datetime.utcnow().isoformat(),
            'rid': getattr(g, 'request_id', ''),
            'method': request.method,
            'path': request.path,
            'ip': ip,
            'ua': ua[:200],
            'user_id': user_id,
            'status': status,
            'error': str(exception) if exception else None
        }
        try:
            security_logger.info(line)
        except Exception:
            pass

    @app.route('/health')
    def health_check():
        """Health check endpoint for monitoring."""
        try:
            # Test database connection
            with db.engine.connect() as conn:
                conn.execute(db.text('SELECT 1'))
            db_status = 'connected'
        except Exception:
            db_status = 'disconnected'

        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'database': db_status,
            'rate_limiter': 'active',
            'security': 'enhanced'
        })

    @app.route('/api/health')
    def api_health():
        """API health check."""
        return jsonify({
            'status': 'ok',
            'service': 'school-management-api',
            'timestamp': datetime.utcnow().isoformat(),
            'features': ['bulk_import', 'advanced_export', 'security_enhanced']
        })

    return app

app = create_app()

if __name__ == '__main__':
    # Listen on all interfaces so phone can connect via local IP
    app.run(debug=True, host='0.0.0.0', port=5000)
