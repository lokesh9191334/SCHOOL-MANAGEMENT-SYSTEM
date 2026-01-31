from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from utils import get_real_ip, log_activity
import json

ip_tracker_bp = Blueprint('ip_tracker', __name__)

@ip_tracker_bp.route('/ip-info')
@login_required
def ip_info():
    """Display current IP tracking information for testing"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get comprehensive IP information
    primary_ip, remote_addr, x_forwarded_for, x_real_ip, x_client_ip, ip_type = get_real_ip()
    
    # Get all possible headers
    all_headers = {
        'CF-Connecting-IP': request.headers.get('CF-Connecting-IP'),
        'X-Real-IP': request.headers.get('X-Real-IP'),
        'X-Original-For': request.headers.get('X-Original-For'),
        'X-Client-IP': request.headers.get('X-Client-IP'),
        'X-Cluster-Client-IP': request.headers.get('X-Cluster-Client-IP'),
        'X-Forwarded': request.headers.get('X-Forwarded'),
        'X-Forwarded-For': request.headers.get('X-Forwarded-For'),
        'Remote-Addr': remote_addr
    }
    
    ip_info = {
        'primary_ip': primary_ip,
        'ip_type': ip_type,
        'remote_addr': remote_addr,
        'all_headers': all_headers,
        'user_agent': request.headers.get('User-Agent'),
        'request_path': request.path,
        'request_method': request.method
    }
    
    return jsonify(ip_info)

@ip_tracker_bp.route('/log-test', methods=['POST'])
@login_required
def log_test_activity():
    """Log a test activity to verify IP tracking"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403
    
    log_activity('info', f'IP tracking test logged by {current_user.name}', current_user.id)
    
    return jsonify({
        'success': True,
        'message': 'Test activity logged successfully',
        'user': current_user.name,
        'timestamp': datetime.utcnow().isoformat()
    })

@ip_tracker_bp.route('/ip-test')
@login_required
def ip_test():
    """Test page to verify IP tracking"""
    if current_user.role != 'admin':
        return "Unauthorized", 403
    
    # Log this access
    log_activity('info', f'IP tracking test accessed by {current_user.name}', current_user.id)
    
    return render_template('ip_tracker/test_simple.html')
