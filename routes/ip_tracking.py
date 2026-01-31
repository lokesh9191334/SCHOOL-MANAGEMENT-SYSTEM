from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from models import db, ActivityLog, User
from utils import log_activity, get_real_ip
from datetime import datetime
import json

# Create blueprint
ip_tracking_bp = Blueprint('ip_tracking', __name__)

@ip_tracking_bp.route('/api/log-ip-info', methods=['POST'])
@login_required
def log_ip_info():
    """Log detailed IP information from client"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get server-side IP information for comparison
        server_ip_info = get_real_ip()
        primary_ip, remote_addr, x_forwarded_for, x_real_ip, x_client_ip, ip_type = server_ip_info
        
        # Create enhanced activity log entry
        log_entry = ActivityLog(
            category='ip_tracking',
            message=f'IP Information Logged - Client: {data.get("ip", "Unknown")}, Server: {primary_ip}',
            user_id=current_user.id,
            ip_address=primary_ip,
            remote_addr=remote_addr,
            x_forwarded_for=x_forwarded_for,
            x_real_ip=x_real_ip,
            x_client_ip=x_client_ip,
            ip_type=ip_type,
            user_agent=request.headers.get('User-Agent'),
            timestamp=datetime.utcnow(),
            # Store additional IP data as JSON in message field
            additional_data=json.dumps({
                'client_ip': data.get('ip'),
                'country': data.get('country'),
                'city': data.get('city'),
                'region': data.get('region'),
                'latitude': data.get('latitude'),
                'longitude': data.get('longitude'),
                'isp': data.get('isp'),
                'timezone': data.get('timezone'),
                'is_vpn': data.get('isVPN', False),
                'is_proxy': data.get('isProxy', False),
                'threat_level': data.get('threatLevel', 'unknown'),
                'screen_resolution': data.get('screenResolution'),
                'client_timezone': data.get('timezone'),
                'user_agent': data.get('userAgent')
            })
        )
        
        db.session.add(log_entry)
        db.session.commit()
        
        # Check for suspicious activity
        if data.get('threatLevel') in ['high', 'critical']:
            log_activity(
                category='security_alert',
                message=f'Suspicious IP detected - Threat Level: {data.get("threatLevel")} - IP: {data.get("ip")} - Location: {data.get("city")}, {data.get("country")}',
                user_id=current_user.id
            )
        
        return jsonify({'success': True, 'message': 'IP information logged successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error logging IP info: {e}")
        return jsonify({'error': 'Failed to log IP information'}), 500

@ip_tracking_bp.route('/api/log-activity', methods=['POST'])
@login_required
def log_client_activity():
    """Log client-side activity"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        activity_type = data.get('activity_type')
        activity_data = data.get('data', {})
        
        # Get IP information
        server_ip_info = get_real_ip()
        primary_ip, remote_addr, x_forwarded_for, x_real_ip, x_client_ip, ip_type = server_ip_info
        
        # Create activity log entry
        log_entry = ActivityLog(
            category=activity_type,
            message=f'Client Activity: {activity_type}',
            user_id=current_user.id,
            ip_address=primary_ip,
            remote_addr=remote_addr,
            x_forwarded_for=x_forwarded_for,
            x_real_ip=x_real_ip,
            x_client_ip=x_client_ip,
            ip_type=ip_type,
            user_agent=request.headers.get('User-Agent'),
            timestamp=datetime.utcnow(),
            additional_data=json.dumps(activity_data)
        )
        
        db.session.add(log_entry)
        db.session.commit()
        
        # Special handling for sensitive activities
        if activity_type == 'login_failure':
            log_activity(
                category='security_alert',
                message=f'Login failure detected - IP: {primary_ip} - Error: {activity_data.get("errorMessage", "Unknown error")}',
                user_id=current_user.id if current_user.is_authenticated else None
            )
        
        return jsonify({'success': True, 'message': 'Activity logged successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error logging client activity: {e}")
        return jsonify({'error': 'Failed to log activity'}), 500

@ip_tracking_bp.route('/api/log-location', methods=['POST'])
@login_required
def log_location():
    """Log user location information"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get IP information
        server_ip_info = get_real_ip()
        primary_ip, remote_addr, x_forwarded_for, x_real_ip, x_client_ip, ip_type = server_ip_info
        
        # Create location log entry
        log_entry = ActivityLog(
            category='location_tracking',
            message=f'Location logged - Lat: {data.get("latitude")}, Lng: {data.get("longitude")}',
            user_id=current_user.id,
            ip_address=primary_ip,
            remote_addr=remote_addr,
            x_forwarded_for=x_forwarded_for,
            x_real_ip=x_real_ip,
            x_client_ip=x_client_ip,
            ip_type=ip_type,
            user_agent=request.headers.get('User-Agent'),
            timestamp=datetime.utcnow(),
            additional_data=json.dumps({
                'latitude': data.get('latitude'),
                'longitude': data.get('longitude'),
                'accuracy': data.get('accuracy'),
                'timestamp': data.get('timestamp')
            })
        )
        
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Location logged successfully'})
        
    except Exception as e:
        current_app.logger.error(f"Error logging location: {e}")
        return jsonify({'error': 'Failed to log location'}), 500

@ip_tracking_bp.route('/api/ip-activity-report')
@login_required
def get_ip_activity_report():
    """Get comprehensive IP activity report for admin"""
    try:
        if current_user.role != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Get recent IP activities
        recent_activities = ActivityLog.query.filter(
            ActivityLog.category.in_(['ip_tracking', 'security_alert', 'login_failure'])
        ).order_by(ActivityLog.timestamp.desc()).limit(100).all()
        
        # Group activities by IP address
        ip_activities = {}
        for activity in recent_activities:
            ip = activity.ip_address
            if ip not in ip_activities:
                ip_activities[ip] = {
                    'ip': ip,
                    'ip_type': activity.ip_type,
                    'activities': [],
                    'user_ids': set(),
                    'first_seen': activity.timestamp,
                    'last_seen': activity.timestamp,
                    'threat_levels': []
                }
            
            ip_activities[ip]['activities'].append({
                'timestamp': activity.timestamp.isoformat(),
                'category': activity.category,
                'message': activity.message,
                'user_id': activity.user_id,
                'user_agent': activity.user_agent
            })
            
            if activity.user_id:
                ip_activities[ip]['user_ids'].add(activity.user_id)
            
            if activity.timestamp < ip_activities[ip]['first_seen']:
                ip_activities[ip]['first_seen'] = activity.timestamp
            
            if activity.timestamp > ip_activities[ip]['last_seen']:
                ip_activities[ip]['last_seen'] = activity.timestamp
            
            # Extract threat level from additional data if available
            if activity.additional_data:
                try:
                    additional_data = json.loads(activity.additional_data)
                    if 'threat_level' in additional_data:
                        ip_activities[ip]['threat_levels'].append(additional_data['threat_level'])
                except:
                    pass
        
        # Convert sets to lists and prepare final report
        report = []
        for ip, data in ip_activities.items():
            # Get user information
            user_info = []
            for user_id in data['user_ids']:
                user = User.query.get(user_id)
                if user:
                    user_info.append({
                        'id': user.id,
                        'name': user.name,
                        'email': user.email,
                        'role': user.role
                    })
            
            # Determine overall threat level
            threat_level = 'low'
            if 'critical' in data['threat_levels']:
                threat_level = 'critical'
            elif 'high' in data['threat_levels']:
                threat_level = 'high'
            elif 'medium' in data['threat_levels']:
                threat_level = 'medium'
            
            report.append({
                'ip': ip,
                'ip_type': data['ip_type'],
                'activities_count': len(data['activities']),
                'users': user_info,
                'first_seen': data['first_seen'].isoformat(),
                'last_seen': data['last_seen'].isoformat(),
                'threat_level': threat_level,
                'recent_activities': data['activities'][:10]  # Last 10 activities
            })
        
        # Sort by threat level and last activity
        report.sort(key=lambda x: (
            {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}[x['threat_level']],
            x['last_seen']
        ), reverse=True)
        
        return jsonify({
            'success': True,
            'report': report,
            'total_ips': len(report)
        })
        
    except Exception as e:
        current_app.logger.error(f"Error generating IP activity report: {e}")
        return jsonify({'error': 'Failed to generate report'}), 500

@ip_tracking_bp.route('/api/suspicious-activities')
@login_required
def get_suspicious_activities():
    """Get list of suspicious activities"""
    try:
        if current_user.role != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Get suspicious activities
        suspicious_activities = ActivityLog.query.filter(
            ActivityLog.category.in_(['security_alert', 'login_failure'])
        ).order_by(ActivityLog.timestamp.desc()).limit(50).all()
        
        activities = []
        for activity in suspicious_activities:
            user_info = None
            if activity.user_id:
                user = User.query.get(activity.user_id)
                if user:
                    user_info = {
                        'id': user.id,
                        'name': user.name,
                        'email': user.email,
                        'role': user.role
                    }
            
            activities.append({
                'id': activity.id,
                'timestamp': activity.timestamp.isoformat(),
                'category': activity.category,
                'message': activity.message,
                'ip_address': activity.ip_address,
                'ip_type': activity.ip_type,
                'user_agent': activity.user_agent,
                'user': user_info,
                'additional_data': activity.additional_data
            })
        
        return jsonify({
            'success': True,
            'activities': activities,
            'total_count': len(activities)
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting suspicious activities: {e}")
        return jsonify({'error': 'Failed to get activities'}), 500
