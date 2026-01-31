import ipaddress
from flask import request, current_app
from flask_login import current_user
from models import db, ActivityLog, User

def get_ip_type(ip_str):
    """Determine if IP is public, private, or local"""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private:
            return 'private'
        elif ip.is_loopback:
            return 'local'
        else:
            return 'public'
    except:
        return 'unknown'

def get_real_ip():
    """Get the most accurate real IP address from various headers"""
    if not request:
        return None, None, None, None, None, None

    # Get all possible IP sources in order of reliability
    remote_addr = request.remote_addr
    x_forwarded_for = request.headers.get('X-Forwarded-For')
    x_real_ip = request.headers.get('X-Real-IP')
    x_client_ip = request.headers.get('X-Client-IP')
    x_forwarded = request.headers.get('X-Forwarded')
    x_cluster_client_ip = request.headers.get('X-Cluster-Client-IP')
    cf_connecting_ip = request.headers.get('CF-Connecting-IP')  # Cloudflare
    x_original_for = request.headers.get('X-Original-For')
    
    # Determine the primary IP address (most trustworthy)
    primary_ip = None
    ip_source = None
    ip_type = None

    # Priority order for real IP detection
    ip_candidates = [
        (cf_connecting_ip, 'CF-Connecting-IP'),
        (x_real_ip, 'X-Real-IP'),
        (x_original_for, 'X-Original-For'),
        (x_client_ip, 'X-Client-IP'),
        (x_cluster_client_ip, 'X-Cluster-Client-IP'),
        (x_forwarded, 'X-Forwarded'),
        (x_forwarded_for, 'X-Forwarded-For'),
        (remote_addr, 'Remote-Addr')
    ]
    
    for ip_candidate, source in ip_candidates:
        if ip_candidate:
            if source == 'X-Forwarded-For':
                # X-Forwarded-For can contain multiple IPs, take the first (client) one
                ip_list = [ip.strip() for ip in ip_candidate.split(',')]
                candidate_ip = ip_list[0] if ip_list else None
            else:
                candidate_ip = ip_candidate.strip()
            
            # Validate IP format
            if candidate_ip and is_valid_ip(candidate_ip):
                # Skip private/local IPs unless it's the only option
                candidate_type = get_ip_type(candidate_ip)
                if candidate_type in ['public', 'private']:
                    primary_ip = candidate_ip
                    ip_source = source
                    ip_type = candidate_type
                    break
                elif candidate_type == 'local' and not primary_ip:
                    # Only use local IP if no other option found
                    primary_ip = candidate_ip
                    ip_source = source
                    ip_type = candidate_type

    # If still no valid IP, use remote_addr as fallback
    if not primary_ip and remote_addr:
        primary_ip = remote_addr
        ip_source = 'Remote-Addr-Fallback'
        ip_type = get_ip_type(remote_addr)

    return primary_ip, remote_addr, x_forwarded_for, x_real_ip, x_client_ip, ip_type

def is_valid_ip(ip_str):
    """Validate if string is a valid IP address"""
    try:
        ipaddress.ip_address(ip_str)
        return True
    except:
        return False

def log_activity(category, message, user_id=None):
    from datetime import datetime
    import json
    
    try:
        if user_id is None and hasattr(current_user, 'is_authenticated') and current_user.is_authenticated:
            user_id = current_user.id

        # Get comprehensive IP information
        primary_ip, remote_addr, x_forwarded_for, x_real_ip, x_client_ip, ip_type = get_real_ip()
        
        # Get additional headers for debugging
        cf_connecting_ip = request.headers.get('CF-Connecting-IP') if request else None
        x_original_for = request.headers.get('X-Original-For') if request else None
        x_forwarded = request.headers.get('X-Forwarded') if request else None
        x_cluster_client_ip = request.headers.get('X-Cluster-Client-IP') if request else None

        user_agent = request.headers.get('User-Agent') if request else None

        # Create additional data JSON for comprehensive tracking
        additional_data = {
            'all_headers': {
                'CF-Connecting-IP': cf_connecting_ip,
                'X-Real-IP': x_real_ip,
                'X-Original-For': x_original_for,
                'X-Client-IP': x_client_ip,
                'X-Cluster-Client-IP': x_cluster_client_ip,
                'X-Forwarded': x_forwarded,
                'X-Forwarded-For': x_forwarded_for,
                'Remote-Addr': remote_addr
            },
            'selected_primary_ip': primary_ip,
            'ip_source': ip_type,
            'request_path': request.path if request else None,
            'request_method': request.method if request else None,
            'timestamp_utc': datetime.utcnow().isoformat()
        }

        # Create log entry
        log_entry = ActivityLog(
            category=category,
            message=message,
            user_id=user_id,
            ip_address=primary_ip,
            remote_addr=remote_addr,
            x_forwarded_for=x_forwarded_for,
            x_real_ip=x_real_ip,
            x_client_ip=x_client_ip,
            ip_type=ip_type,
            user_agent=user_agent,
            additional_data=json.dumps(additional_data, default=str),
            timestamp=datetime.utcnow()
        )

        db.session.add(log_entry)
        db.session.commit()

        # Force flush to ensure data is written
        db.session.flush()

        if current_app:
            current_app.logger.info(f"Activity logged: {category} - {message} - IP: {primary_ip} ({ip_type}) - User: {user_id}")
            
            # Debug logging for IP tracking
            if current_app.debug:
                current_app.logger.debug(f"IP Tracking Debug - Primary: {primary_ip}, Type: {ip_type}, Headers: {additional_data['all_headers']}")

    except Exception as e:
        if current_app:
            current_app.logger.error(f"Error logging activity: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass