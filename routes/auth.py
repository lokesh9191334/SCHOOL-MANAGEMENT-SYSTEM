import os
import uuid
import random
from datetime import datetime, timedelta

from flask import Blueprint, current_app, flash, redirect, render_template, request, url_for, session, jsonify
from flask_login import login_required, login_user, logout_user, current_user
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message

from models import Parent, Student, Teacher, User, db, School
from utils import log_activity

auth_bp = Blueprint('auth', __name__, template_folder='../templates')

def is_password_strong(password: str) -> bool:
    if not password or len(password) < 8:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    return has_upper and has_lower and has_digit

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # Force logout if requested (for clean login page after registration)
    force_logout = request.args.get('force_logout', 'false').lower() == 'true'
    if force_logout:
        if current_user.is_authenticated:
            logout_user()
            from flask import session
            session.clear()
            current_app.logger.info("Force logout applied, showing clean login page")
    
    # If user is already logged in, redirect to appropriate dashboard
    try:
        if current_user.is_authenticated:
            current_app.logger.info(f"User already authenticated: {current_user.email}, redirecting to dashboard")
            if current_user.role == 'parent':
                return redirect(url_for('parents.portal'))
            elif current_user.role == 'teacher':
                return redirect(url_for('teachers.portal'))
            elif current_user.role == 'admin':
                return redirect(url_for('dashboard.profile'))
            else:
                return redirect(url_for('dashboard.profile'))
        else:
            current_app.logger.info("User not authenticated, showing login form")
    except:
        # If current_user is not available, continue to login form
        current_app.logger.info("Current_user not available, showing login form")
        pass

    if request.method == 'POST':
        # Log incoming request details for live debugging
        try:
            current_app.logger.info("LIVE LOGIN REQUEST - headers: %s", dict(request.headers))
            current_app.logger.info("LIVE LOGIN REQUEST - form keys: %s", list(request.form.keys()))
            current_app.logger.info("LIVE LOGIN REQUEST - form data (partial): %s", {k: (v[:30] + '...' if len(v) > 30 else v) for k, v in request.form.items()})
        except Exception:
            current_app.logger.exception('Error logging request details')

        email = request.form.get('email')
        password = request.form.get('password')
        school_id = request.form.get('school_id')
        account_type = request.form.get('account_type')  # Add account_type validation
        current_app.logger.info(f"LOGIN ATTEMPT - Email: {email}, School ID: {school_id}, Account Type: {account_type}, Password Length: {len(password) if password else 0}")
        
        # Validate school ID for non-admin users
        if school_id and (len(school_id) != 5 or not school_id.isdigit()):
            current_app.logger.error(f"INVALID SCHOOL ID FORMAT - School ID: {school_id}")
            flash('Invalid school ID format. Please enter 5 digits.', 'danger')
            return redirect(url_for('auth.login'))
        
        try:
            user = User.query.filter_by(email=email).first()
            current_app.logger.info(f"USER QUERY RESULT - Found: {user is not None}")
            
            if user:
                current_app.logger.info(f"USER DETAILS - Role: {user.role}, Has Password: {user.password_hash is not None}")
                
                if user.password_hash is None:
                    current_app.logger.warning(f"User {email} has no password hash. Redirecting to set password.")
                    log_activity('warning', f'Login attempt for account without password: {email}', user_id=user.id)
                    flash('Your account does not have a password set. Please set one to log in with email and password.', 'info')
                    return redirect(url_for('auth.set_password'))
                
                current_app.logger.info(f"CHECKING PASSWORD - Input: {password}")
                if user.check_password(password):
                    # Validate school ID for parent and teacher only (not for admin)
                    if user.role == 'parent' or user.role == 'teacher':
                        if not school_id or user.school_id != school_id:
                            current_app.logger.error(f"SCHOOL ID MISMATCH - User School ID: {user.school_id}, Provided: {school_id}")
                            flash('Invalid school ID for this account.', 'danger')
                            return redirect(url_for('auth.login'))
                    
                    current_app.logger.info(f"PASSWORD CORRECT - Logging in user {email}")
                    login_user(user)
                    try:
                        log_activity('success', f'User logged in: {email}', user_id=user.id)
                    except Exception:
                        current_app.logger.exception('Failed to write login activity')
                    # Log whether Flask-Login recognized the user immediately
                    try:
                        current_app.logger.info(f"After login_user: current_user.is_authenticated={current_user.is_authenticated}")
                    except Exception:
                        current_app.logger.exception('Error checking current_user after login')
                    current_app.logger.info(f"User {email} logged in successfully. Role: {user.role}")
                    # Removed success flash message for clean login experience
                    if user.role == 'parent':
                        current_app.logger.info(f"Redirecting parent to parents portal")
                        return redirect(url_for('parents.portal'))
                    elif user.role == 'teacher':
                        current_app.logger.info(f"Redirecting teacher to teachers portal")
                        return redirect(url_for('teachers.portal')) # Assuming a teachers portal exists
                    elif user.role == 'admin':
                        current_app.logger.info(f"Redirecting admin to profile")
                        return redirect(url_for('dashboard.profile'))
                    # Default: take user to their profile page
                    return redirect(url_for('dashboard.profile'))
                else:
                    current_app.logger.error(f"PASSWORD INCORRECT - Email: {email}")
                    try:
                        log_activity('danger', f'Failed login - incorrect password for {email}', user_id=user.id)
                    except Exception:
                        current_app.logger.exception('Failed to write failed-login activity')
                    # Removed flash message to prevent error display on login panel
            else:
                current_app.logger.error(f"USER NOT FOUND - Email: {email}")
                try:
                    log_activity('danger', f'Failed login - user not found: {email}')
                except Exception:
                    current_app.logger.exception('Failed to write failed-login activity')
                # Removed flash message to prevent error display on login panel
        except Exception as e:
            current_app.logger.error(f"Error during login for email {email}: {e}", exc_info=True)
            try:
                log_activity('danger', f'Error during login for {email}: {e}')
            except Exception:
                current_app.logger.exception('Failed to write exception activity')
            # Removed flash message to prevent error display on login panel
    
    # Check if mobile device
    user_agent = request.headers.get('User-Agent', '').lower()
    is_mobile = any(mobile in user_agent for mobile in ['mobile', 'android', 'iphone', 'ipad', 'tablet'])
    
    # Use professional premium login template
    return render_template('login.html')

@auth_bp.route('/google-login')
def google_login():
    oauth = current_app.extensions['authlib.integrations.flask_client']
    # Explicitly use localhost:5000 to match Google Cloud Console configuration
    callback_url = 'http://localhost:5000/auth/callback'
    
    # Generate state manually and store it in a cookie that works across hostnames
    from authlib.common.security import generate_token
    state = generate_token(32)
    # Set cookie with state that's accessible across the domain
    response = oauth.google.authorize_redirect(callback_url, state=state)
    response.set_cookie('google_oauth_state', state, httponly=True, path='/', samesite='Lax')
    return response

@auth_bp.route('/callback')
def google_callback():
    oauth = current_app.extensions['authlib.integrations.flask_client']
    
    # Check if there's an error in the callback
    if 'error' in request.args:
        flash(f"Google login failed: {request.args['error_description']}", 'danger')
        return redirect(url_for('auth.login'))

    # Get state from cookie instead of session
    request_state = request.args.get('state')
    cookie_state = request.cookies.get('google_oauth_state')
    
    if not request_state or not cookie_state or request_state != cookie_state:
        flash('CSRF error: Invalid state parameter', 'danger')
        return redirect(url_for('auth.login'))
    
    # Exchange code for token without state validation (we already did it)
    token = oauth.google.authorize_access_token(request_state=request_state)
    userinfo = oauth.google.get('https://www.googleapis.com/oauth2/v3/userinfo').json()
    current_app.logger.debug(f"Userinfo from Google: {userinfo}")

    email = userinfo.get('email')
    google_id = userinfo.get('sub') # 'sub' is the unique ID for the user from Google

    if not email:
        # If email is not provided by Google, we need to prompt the user for it
        # Store userinfo in session to retrieve after email input
        session['google_userinfo'] = userinfo
        flash('Google did not provide your email. Please enter your email to continue.', 'info')
        return redirect(url_for('auth.prompt_email_for_google_user'))

    name = userinfo.get('name') or (email.split('@')[0] if email else 'Google User')

    # Store user info in session and redirect to account type selection
    # This ensures all users, including existing ones, are asked to select their account type
    session['google_new_user'] = {
        'name': name,
        'email': email,
        'google_id': google_id
    }
    flash('Please select your account type to continue.', 'info')
    return redirect(url_for('auth.select_account_type'))


@auth_bp.route('/select-account-type', methods=['GET', 'POST'])
def select_account_type():
    # Check if user has google new user info in session
    if 'google_new_user' not in session:
        flash('Please login with Google first.', 'danger')
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        account_type = request.form.get('account_type')
        phone = request.form.get('phone')
        
        if not account_type:
            flash('Please select an account type.', 'danger')
            return redirect(url_for('auth.select_account_type'))
        
        if not phone:
            flash('Please enter your phone number.', 'danger')
            return redirect(url_for('auth.select_account_type'))
        
        # Get user info from session
        user_info = session.pop('google_new_user')
        
        # Check if user already exists
        user = User.query.filter_by(email=user_info['email']).first()
        
        if user:
            # Update existing user's role and phone
            user.role = account_type
            user.name = user_info['name']  # Update name from Google
            user.phone = phone  # Update phone from form
            db.session.commit()
            flash(f'Successfully updated account type to {account_type}!', 'success')
        else:
            # Create new user with selected account type and phone
            user = User(
                name=user_info['name'],
                email=user_info['email'],
                role=account_type,
                phone=phone
            )
            db.session.add(user)
            db.session.flush()  # Get user ID without committing
            flash(f'Successfully created account as {account_type}!', 'success')
        
        # Create or update corresponding profile based on account type
        if account_type == 'teacher':
            # Check if teacher profile exists
            teacher = Teacher.query.filter_by(email=user_info['email']).first()
            if teacher:
                # Update existing teacher profile
                teacher.name = user_info['name']
                teacher.email = user_info['email']
                teacher.phone = phone
            else:
                # Create new teacher profile with Google info and phone
                teacher = Teacher(
                    name=user_info['name'],
                    email=user_info['email'],
                    phone=phone
                )
                db.session.add(teacher)
        elif account_type == 'parent':
            # Check if parent profile exists
            parent = Parent.query.filter_by(email=user_info['email']).first()
            if parent:
                # Update existing parent profile
                parent.name = user_info['name']
                parent.email = user_info['email']
                parent.phone = phone
            else:
                # Create new parent profile with Google info and phone
                parent = Parent(
                    name=user_info['name'],
                    email=user_info['email'],
                    phone=phone,
                    user_id=user.id
                )
                db.session.add(parent)
        
        db.session.commit()
        
        # Log in the user
        login_user(user)
        return redirect(url_for('dashboard.index'))
    
    return render_template('auth/select_account_type.html')

@auth_bp.route('/parent-register', methods=['GET', 'POST'])
def parent_register():
    if request.method == 'POST':
        # Get form data
        secret_key = request.form.get('secret_key', '').strip()
        school_id = request.form.get('school_id', '').strip()
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validate secret key (6-digit)
        if not secret_key or len(secret_key) != 6 or not secret_key.isdigit():
            flash('Invalid secret key. Please enter the 6-digit secret key provided by the school.', 'danger')
            return render_template('auth/parent_register.html')
        
        # Validate school ID (5-digit)
        if not school_id or len(school_id) != 5 or not school_id.isdigit():
            flash('Invalid school ID. Please enter the 5-digit school ID provided by the school.', 'danger')
            return render_template('auth/parent_register.html')
        
        # Verify secret key against parent records
        parent_record = Parent.query.filter_by(secret_key=secret_key).first()
        
        if not parent_record:
            flash('Invalid secret key. Please check the key and try again.', 'danger')
            return render_template('auth/parent_register.html')
        
        # Check if this parent already has a user account
        if parent_record.user_id:
            flash('This secret key has already been used to create an account.', 'danger')
            return render_template('auth/parent_register.html')
        
        # Verify school ID exists
        school = School.query.filter_by(id=school_id).first()
        if not school:
            flash('Invalid school ID. Please check with your school administrator.', 'danger')
            return render_template('auth/parent_register.html')
        
        # Validate form data
        if not all([name, email, phone, address, password]):
            flash('All fields are required.', 'danger')
            return render_template('auth/parent_register.html')
        
        # Email uniqueness check removed - allow duplicate emails
        print("✅ Email validation skipped (allowing duplicates)")
        
        # Phone validation removed - allow any phone format
        print("✅ Phone validation skipped (allowing any format)")
        
        # Password confirmation
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('auth/parent_register.html')
        
        try:
            # Create parent user
            parent_user = User(
                name=name,
                email=email,
                role='parent',
                phone=phone,
                address=address,
                school_id=school_id
            )
            parent_user.set_password(password)
            db.session.add(parent_user)
            db.session.commit()
            
            # Link user to parent record
            parent_record.user_id = parent_user.id
            db.session.commit()
            
            flash('Registration successful! You can now log in to the parent portal.', 'success')
            return redirect(url_for('auth.login'))
            
        except Exception as e:
            current_app.logger.error(f"Error creating parent account: {e}")
            flash('An error occurred. Please try again.', 'danger')
            return render_template('auth/parent_register.html')
    
    return render_template('auth/parent_register.html')


@auth_bp.route('/parent-lookup', methods=['GET'])
def parent_lookup():
    # Lookup parent by 6-digit secret_key for autofill
    secret_key = request.args.get('secret_key', '').strip()
    school_id = request.args.get('school_id', '').strip()

    # Basic validation
    if not secret_key or len(secret_key) != 6 or not secret_key.isdigit():
        return jsonify({'found': False, 'error': 'invalid_secret_key'}), 400
    if not school_id or len(school_id) != 5 or not school_id.isdigit():
        return jsonify({'found': False, 'error': 'invalid_school_id'}), 400

    parent = Parent.query.filter_by(secret_key=secret_key).first()
    if not parent:
        return jsonify({'found': False}), 404

    # If the parent already has a linked user account, mark as unavailable
    if parent.user_id:
        return jsonify({'found': False, 'error': 'already_linked'}), 409

    return jsonify({
        'found': True,
        'name': parent.name or '',
        'email': parent.email or '',
        'phone': parent.phone or '',
        'address': parent.address or ''
    })


@auth_bp.route('/teacher-lookup', methods=['GET'])
def teacher_lookup():
    # Lookup teacher by school_id + secret_key for autofill
    school_id = request.args.get('school_id', '').strip()
    secret_key = request.args.get('secret_key', '').strip()

    # Basic validation
    if not school_id or len(school_id) != 5 or not school_id.isdigit():
        return jsonify({'found': False, 'error': 'invalid_school_id'}), 400
    if not secret_key or len(secret_key) != 5 or not secret_key.isdigit():
        return jsonify({'found': False, 'error': 'invalid_secret_key'}), 400

    teacher = Teacher.query.filter_by(school_id=school_id, secret_key=secret_key).first()
    if not teacher:
        return jsonify({'found': False}), 404

    # If the teacher already has a linked user account, mark as unavailable
    if teacher.user_id:
        return jsonify({'found': False, 'error': 'already_linked'}), 409

    return jsonify({
        'found': True,
        'name': teacher.name or '',
        'email': teacher.email or '',
        'phone': teacher.phone or ''
    })


@auth_bp.route('/teacher-register', methods=['GET', 'POST'])
def teacher_register():
    if request.method == 'POST':
        secret_key = request.form.get('secret_key', '').strip()
        school_id = request.form.get('school_id', '').strip()
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        # Validate secret key and school id
        if not secret_key or len(secret_key) != 5 or not secret_key.isdigit():
            flash('Invalid secret key. Please enter the 5-digit secret key provided by the school.', 'danger')
            return render_template('auth/teacher_register.html')

        if not school_id or len(school_id) != 5 or not school_id.isdigit():
            flash('Invalid school ID. Please enter the 5-digit school ID provided by the school.', 'danger')
            return render_template('auth/teacher_register.html')

        # Find teacher record
        teacher_record = Teacher.query.filter_by(secret_key=secret_key, school_id=school_id).first()
        if not teacher_record:
            flash('Secret key and School ID do not match any teacher record. Please check with your administrator.', 'danger')
            return render_template('auth/teacher_register.html')

        # Ensure this secret key hasn't already been used
        if teacher_record.user_id:
            flash('This secret key has already been used to create an account.', 'danger')
            return render_template('auth/teacher_register.html')

        # Basic form validation
        if not all([name, email, password, confirm_password]):
            flash('Name, email and password are required.', 'danger')
            return render_template('auth/teacher_register.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('auth/teacher_register.html')

        if len(password) < 6:
            flash('Password must be at least 6 characters long.', 'warning')
            return render_template('auth/teacher_register.html')

        try:
            # Create user
            u = User(name=name, email=email, role='teacher', phone=phone)
            u.set_password(password)
            u.school_id = school_id
            db.session.add(u)
            db.session.flush()

            # Link teacher record
            teacher_record.user_id = u.id
            # Ensure teacher record has the up-to-date contact info
            teacher_record.name = teacher_record.name or name
            teacher_record.email = teacher_record.email or email
            teacher_record.phone = teacher_record.phone or phone

            db.session.commit()

            flash('Registration successful! You can now log in as a teacher.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            db.session.rollback()
            current_app.logger.exception('Error creating teacher account')
            flash('An error occurred. Please try again later.', 'danger')
            return render_template('auth/teacher_register.html')

    # GET
    return render_template('auth/teacher_register.html')

@auth_bp.route('/logout')
@login_required
def logout():
    try:
        log_activity('info', f'User logged out: {current_user.email}', user_id=current_user.id)
    except Exception:
        current_app.logger.exception('Failed to write logout activity')
    logout_user()
    return redirect(url_for('auth.login'))

@auth_bp.route('/set-password', methods=['GET', 'POST'])
@login_required
def set_password():
    if current_user.password_hash is not None:
        flash('You already have a password set.', 'info')
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not is_password_strong(password):
            flash('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.', 'warning')
            return redirect(url_for('auth.set_password'))
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return redirect(url_for('auth.set_password'))
        
        try:
            current_user.set_password(password)
            db.session.commit()
            flash('Password set successfully! You can now log in with your email and password.', 'success')
            return redirect(url_for('dashboard.index'))
        except Exception as e:
            current_app.logger.error(f"Error setting password for user {current_user.email}: {e}", exc_info=True)
            flash('An unexpected error occurred while setting your password. Please try again.', 'danger')
            return redirect(url_for('auth.set_password'))

@auth_bp.route('/prompt-email-for-google-user', methods=['GET', 'POST'])
def prompt_email_for_google_user():
    if 'google_userinfo' not in session:
        flash('Google user information not found. Please try logging in with Google again.', 'danger')
        return redirect(url_for('auth.login'))

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not email:
            flash('Email is required.', 'danger')
            return redirect(url_for('auth.prompt_email_for_google_user'))
        
        if not is_password_strong(password):
            flash('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.', 'warning')
            return redirect(url_for('auth.prompt_email_for_google_user'))
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return redirect(url_for('auth.prompt_email_for_google_user'))

        # Email uniqueness check removed - allow duplicate emails
        print("✅ Email validation skipped (allowing duplicates)")
        
        userinfo = session.pop('google_userinfo')
        name = userinfo.get('name') or (email.split('@')[0] if email else 'Google User')
        
        user = User(name=name, email=email, role='parent') # Default role for new Google users
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        # Removed success flash message for clean registration experience
        return redirect(url_for('dashboard.index'))

    return render_template('auth/prompt_email_for_google_user.html')


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    # Enhanced registration with school ID support for admins
    if request.method == 'POST':
        
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        account_type = request.form.get('account_type')
        address = request.form.get('address')
        phone = request.form.get('phone')
        special_key = request.form.get('special_key', '').strip().upper()
        school_id = request.form.get('school_id', '').strip()
        
        # Validate form data - TEMPORARILY RELAXED
        if not all([name, email, password, confirm_password, account_type]):
            flash('Name, email, password and account type are required.', 'danger')
            return render_template('auth/register_minimal.html')
        
        # Password confirmation
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('auth/register_minimal.html')
        
        # Password strength - TEMPORARILY RELAXED
        if len(password) < 6:
            flash('Password must be at least 6 characters long.', 'warning')
            return render_template('auth/register_minimal.html')
        
        # Email uniqueness check removed - allow duplicate emails
        # Phone validation removed - allow any phone format
        
        # Special key validation for parents - TEMPORARILY DISABLED
        # if account_type == 'parent':
        #     valid_keys = ['3PYJ&5']  # Current valid key
        #     if special_key not in valid_keys:
        #         flash('Invalid special key for parent registration. Please contact school administration.', 'danger')
        #         return render_template('auth/register_minimal.html')
        
        # School ID handling
        if account_type == 'admin':
            # Generate unique 5-digit school ID for admin
            import random
            while True:
                school_id = f"{random.randint(10000, 99999)}"
                existing_school = School.query.filter_by(id=school_id).first()
                if not existing_school:
                    break
            
            # Create school record
            school = School(id=school_id, name=f"School {school_id}")
            db.session.add(school)
            db.session.flush()  # Get the school ID without committing
            
        elif account_type == 'teacher':
                # Check if teacher is pre-added by admin (has secret key)
                teacher_secret_key = request.form.get('teacher_secret_key', '').strip()
                school_id = request.form.get('school_id', '').strip()
                
                if teacher_secret_key and school_id:
                    # Pre-added teacher scenario - validate secret key and school ID
                    if len(school_id) != 5 or not school_id.isdigit():
                        flash('School ID must be exactly 5 digits.', 'danger')
                        return render_template('auth/register_minimal.html')
                    
                    if len(teacher_secret_key) != 5 or not teacher_secret_key.isdigit():
                        flash('Secret key must be exactly 5 digits.', 'danger')
                        return render_template('auth/register_minimal.html')
                    
                    # Look up existing teacher record
                    teacher = Teacher.query.filter_by(school_id=school_id, secret_key=teacher_secret_key).first()
                    if not teacher:
                        flash('Invalid School ID or Secret Key. Please check with your administrator.', 'danger')
                        return render_template('auth/register_minimal.html')
                    
                    # Check if teacher already has a user account
                    if teacher.user_id:
                        flash('This teacher already has an account. Please login instead.', 'warning')
                        return render_template('auth/register_minimal.html')
                    
                    # Use existing teacher data
                    school = School.query.filter_by(id=school_id).first()
                    if not school:
                        flash('Invalid School ID. Please check with your school administrator.', 'danger')
                        return render_template('auth/register_minimal.html')
                        
                else:
                    # New teacher registration scenario (if admin allows it)
                    school_id = request.form.get('school_id', '').strip()
                    if not school_id or len(school_id) != 5 or not school_id.isdigit():
                        flash('Teacher registration requires a valid 5-digit School ID from your administrator.', 'danger')
                        return render_template('auth/register_minimal.html')
                    
                    # Check if school exists
                    school = School.query.filter_by(id=school_id).first()
                    if not school:
                        flash('Invalid School ID. Please check with your school administrator.', 'danger')
                        return render_template('auth/register_minimal.html')
                    
                    # Generate unique secret key for the teacher
                    import random
                    while True:
                        teacher_secret_key = f"{random.randint(10000, 99999)}"
                        existing_teacher = Teacher.query.filter_by(secret_key=teacher_secret_key).first()
                        if not existing_teacher:
                            break
        
        # Create user
        u = User(name=name, email=email, role=account_type, address=address, phone=phone)
        
        # Set school_id for admin and teacher
        if account_type in ['admin', 'teacher']:
            u.school_id = school_id
        
        # Handle photo upload
        if 'photo' in request.files:
            photo = request.files['photo']
            if photo and photo.filename:
                # Create uploads directory if it doesn't exist
                upload_dir = os.path.join(current_app.static_folder, 'uploads', 'users')
                os.makedirs(upload_dir, exist_ok=True)

                # Generate unique filename
                filename = secure_filename(f"{uuid.uuid4()}_{photo.filename}")
                photo_path = os.path.join(upload_dir, filename)
                photo.save(photo_path)

                # Store relative path in database
                u.photo = f"uploads/users/{filename}"
        
        try:
            u.set_password(password)
            db.session.add(u)
            
            # Create associated profile based on role
            if account_type == 'parent':
                parent_profile = Parent(
                    user=u,
                    name=name,
                    email=email,
                    address=address
                )
                db.session.add(parent_profile)
                
            elif account_type == 'teacher':
                if 'teacher' in locals() and teacher:
                    # Pre-added teacher - link existing teacher record to user
                    teacher.user_id = u.id
                    # Update teacher info if needed
                    if not teacher.name:
                        teacher.name = name
                    if not teacher.email:
                        teacher.email = email
                    if not teacher.phone:
                        teacher.phone = phone
                    if not teacher.address:
                        teacher.address = address
                    
                    # Copy teacher data to user record
                    if teacher.employee_id and not u.employee_id:
                        u.employee_id = teacher.employee_id
                    
                    # Update teacher record with latest info
                    db.session.add(teacher)
                else:
                    # New teacher - create new teacher record
                    teacher_profile = Teacher(
                        user=u,
                        name=name,
                        email=email,
                        address=address,
                        phone=phone,
                        school_id=school_id,
                        secret_key=teacher_secret_key,
                        employee_id=f"T{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}",
                        date_of_joining=datetime.now().date(),
                        experience_years=0  # Will be calculated based on date_of_joining
                    )
                    db.session.add(teacher_profile)
                
            elif account_type == 'admin':
                pass  # Admin doesn't need additional profile
            
            # Create school record if not already created (for admin)
            if account_type == 'admin' and 'school' not in locals():
                school = School(
                    id=school_id,
                    name=f"School {school_id}",  # Default name, can be updated later
                    admin_name=name,
                    admin_email=email,
                    phone=phone
                )
                db.session.add(school)
                
            db.session.commit()
            
            # Force logout any existing session to ensure clean login page
            if current_user.is_authenticated:
                logout_user()
                # Clear session completely
                from flask import session
                session.clear()
            
            # Show success message with School ID for admin and appropriate message for teacher
            if account_type == 'admin':
                flash(f'Account created successfully! Your School ID is: {school_id}. Please save this ID for teacher registrations.', 'success')
            elif account_type == 'teacher':
                if 'teacher' in locals() and teacher and teacher.user_id:
                    flash(f'Account created successfully! Your teacher profile has been linked to your user account.', 'success')
                else:
                    flash(f'Account created successfully! Your Teacher Secret Key is: {teacher_secret_key}. Please save this key for your records.', 'success')
            else:
                flash('Account created successfully! Please login to continue.', 'success')
            
            return redirect(url_for('auth.login', force_logout='true'))
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating account: {e}", exc_info=True)
            flash(f'An error occurred while creating your account: {str(e)}', 'danger')
            return render_template('auth/register_minimal.html')

    return render_template('auth/register_minimal.html')

@auth_bp.route('/direct-reset-password', methods=['GET', 'POST'])
def direct_reset_password():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        email = request.form.get('email')
        old_password = request.form.get('old_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        # Validate form data
        if not all([email, old_password, new_password, confirm_password]):
            flash('All fields are required.', 'danger')
            return render_template('auth/forgot_password.html')

        # Validate email format
        import re
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            flash('Please enter a valid email address.', 'danger')
            return render_template('auth/forgot_password_direct.html')

        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            flash('No account found with this email address.', 'danger')
            return render_template('auth/forgot_password_direct.html')

        # Verify old password
        if not user.check_password(old_password):
            flash('Current password is incorrect.', 'danger')
            return render_template('auth/forgot_password_direct.html')

        # Validate new password
        if not is_password_strong(new_password):
            flash('New password must be at least 8 characters long and contain uppercase, lowercase, and numbers.', 'warning')
            return render_template('auth/forgot_password_direct.html')

        # Check if new passwords match
        if new_password != confirm_password:
            flash('New passwords do not match.', 'danger')
            return render_template('auth/forgot_password_direct.html')

        # Check if new password is same as old password
        if user.check_password(new_password):
            flash('New password must be different from current password.', 'warning')
            return render_template('auth/forgot_password_direct.html')

        try:
            # Update password
            user.set_password(new_password)
            db.session.commit()

            flash('Password updated successfully! You can now log in with your new password.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            current_app.logger.error(f"Error updating password for user {user.email}: {e}", exc_info=True)
            flash('An unexpected error occurred. Please try again.', 'danger')

    return render_template('auth/forgot_password_direct.html')


@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        email = request.form.get('email')

        # Validate email
        if not email:
            flash('Please enter your email address', 'danger')
            return render_template('auth/forgot_password.html')

        user = User.query.filter_by(email=email).first()

        # Don't reveal if email exists or not for security
        if user:
            # Generate reset token
            import secrets
            reset_token = secrets.token_urlsafe(32)
            user.reset_token = reset_token
            user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour

            try:
                db.session.commit()

                # Send email (for now we'll just show success message, in production integrate with email service)
                reset_url = url_for('auth.reset_password', token=reset_token, _external=True)

                # For demonstration, we'll flash the reset URL. In production, send via email.
                current_app.logger.info(f"Password reset link for {email}: {reset_url}")
                flash('If an account with this email exists, a password reset link has been sent. Please check your email.', 'success')
                flash(f'DEVELOPMENT MODE - Reset URL: {reset_url}', 'info')

            except Exception as e:
                current_app.logger.error(f"Error generating reset token for user {user.email}: {e}", exc_info=True)
                flash('An unexpected error occurred. Please try again.', 'danger')
        else:
            flash('If an account with this email exists, a password reset link has been sent. Please check your email.', 'success')

    return render_template('auth/forgot_password.html')


@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))

    user = User.query.filter_by(reset_token=token).first()

    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        flash('Invalid or expired reset token. Please request a new password reset.', 'danger')
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        new_password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not new_password:
            flash('Please enter your new password', 'danger')
            return render_template('auth/reset_password_professional_premium.html', token=token)

        if not is_password_strong(new_password):
            flash('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.', 'warning')
            return render_template('auth/reset_password_professional_premium.html', token=token)

        if new_password != confirm_password:
            flash('Passwords do not match', 'danger')
            return render_template('auth/reset_password_professional_premium.html', token=token)

        try:
            user.set_password(new_password)
            user.reset_token = None
            user.reset_token_expires = None
            db.session.commit()

            flash('Your password has been reset successfully! You can now log in with your new password.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            current_app.logger.error(f"Error resetting password for user {user.email}: {e}", exc_info=True)
            flash('An unexpected error occurred. Please try again.', 'danger')

    return render_template('auth/reset_password_professional_premium.html', token=token)
