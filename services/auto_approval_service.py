from app import db, create_app
from models import TeacherLeave, AutoLeaveApproval, LeaveApprovalLog, User
from datetime import datetime, timedelta
from utils import log_activity
import threading
import time

class AutoApprovalService:
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start_auto_approval_monitor(self):
        """Start the automatic approval monitoring service"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_pending_leaves, daemon=True)
            self.thread.start()
            print("✅ Auto-approval monitoring service started")
    
    def stop_auto_approval_monitor(self):
        """Stop the automatic approval monitoring service"""
        self.running = False
        if self.thread:
            self.thread.join()
            print("✅ Auto-approval monitoring stopped")
    
    def _monitor_pending_leaves(self):
        """Monitor pending leaves and auto-approve when time limit is reached"""
        while self.running:
            try:
                # Use application context for database operations
                app = create_app()
                with app.app_context():
                    # Get auto-approval configuration
                    config = AutoLeaveApproval.query.first()
                    if not config:
                        config = AutoLeaveApproval()
                        db.session.add(config)
                        db.session.commit()
                    
                    if config.auto_approval_enabled:
                        # Get pending leaves that need auto-approval
                        pending_leaves = self._get_pending_leaves_for_auto_approval(config)
                        
                        for leave in pending_leaves:
                            self._auto_approve_leave(leave, config)
                
                # Check every minute
                time.sleep(60)
                
            except Exception as e:
                print(f"⚠️ Error in auto-approval monitoring: {e}")
                # Continue running despite errors
                time.sleep(60)
    
    def _get_pending_leaves_for_auto_approval(self, config):
        """Get pending leaves that are eligible for auto-approval"""
        # Get leave types that apply to auto-approval
        applicable_leave_types = [t.strip() for t in config.apply_to_leave_types.split(',')]
        
        # Calculate cutoff time
        cutoff_time = datetime.utcnow() - timedelta(minutes=config.approval_time_minutes)
        
        # Query pending leaves
        pending_leaves = TeacherLeave.query.filter(
            TeacherLeave.status == 'pending',
            TeacherLeave.leave_type.in_(applicable_leave_types),
            TeacherLeave.created_at <= cutoff_time
        ).all()
        
        return pending_leaves
    
    def _auto_approve_leave(self, leave, config):
        """Auto-approve a leave application"""
        try:
            # Update leave status
            leave.status = 'approved'
            leave.approved_by_id = None  # System approval
            leave.approved_at = datetime.utcnow()
            
            # Create approval log
            approval_log = LeaveApprovalLog(
                leave_id=leave.id,
                approval_type='auto',
                approved_by_id=None,
                submitted_at=leave.created_at,
                auto_approval_time=datetime.utcnow(),
                actual_approval_time=datetime.utcnow(),
                status='auto_approved',
                notes=f'Auto-approved after {config.approval_time_minutes} minutes'
            )
            db.session.add(approval_log)
            
            db.session.commit()
            
            # Send notifications
            if config.notify_teacher_on_auto_approval:
                self._send_teacher_notification(leave, 'auto_approved')
            
            if config.notify_admin_before_auto_approval:
                self._send_admin_notification(leave, 'auto_approved')
            
            # Create automatic substitutions
            from routes.teacher_substitution import create_automatic_substitutions
            create_automatic_substitutions(leave)
            
            # Log activity
            log_activity('info', f'Leave auto-approved for {leave.teacher.name}', user_id=None)
            
            print(f"Auto-approved leave for {leave.teacher.name}")
            
        except Exception as e:
            db.session.rollback()
            print(f"Error auto-approving leave {leave.id}: {e}")
    
    def _send_teacher_notification(self, leave, status):
        """Send notification to teacher about leave status"""
        try:
            # TODO: Integrate with your notification system
            message = f"Your leave application has been {status.replace('_', ' ')} automatically."
            print(f"Notification to {leave.teacher.name}: {message}")
        except Exception as e:
            print(f"Error sending teacher notification: {e}")
    
    def _send_admin_notification(self, leave, status):
        """Send notification to admin about leave status"""
        try:
            # TODO: Integrate with your notification system
            message = f"Leave for {leave.teacher.name} has been {status.replace('_', ' ')} automatically."
            print(f"Admin notification: {message}")
        except Exception as e:
            print(f"Error sending admin notification: {e}")
    
    def update_config(self, enabled=None, minutes=None, leave_types=None, 
                     notify_admin=None, notify_teacher=None, admin_id=None):
        """Update auto-approval configuration"""
        try:
            config = AutoLeaveApproval.query.first()
            if not config:
                config = AutoLeaveApproval()
                db.session.add(config)
            
            if enabled is not None:
                config.auto_approval_enabled = enabled
            if minutes is not None:
                config.approval_time_minutes = minutes
            if leave_types is not None:
                config.apply_to_leave_types = ','.join(leave_types)
            if notify_admin is not None:
                config.notify_admin_before_auto_approval = notify_admin
            if notify_teacher is not None:
                config.notify_teacher_on_auto_approval = notify_teacher
            
            config.last_updated = datetime.utcnow()
            if admin_id:
                config.updated_by_id = admin_id
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error updating config: {e}")
            return False
    
    def get_config(self):
        """Get current auto-approval configuration"""
        config = AutoLeaveApproval.query.first()
        if not config:
            config = AutoLeaveApproval()
            db.session.add(config)
            db.session.commit()
        return config
    
    def check_pending_approval_time(self, leave_id):
        """Check how much time is left before auto-approval"""
        config = self.get_config()
        if not config.auto_approval_enabled:
            return None
        
        leave = TeacherLeave.query.get(leave_id)
        if not leave or leave.status != 'pending':
            return None
        
        # Check if leave type is applicable
        applicable_leave_types = [t.strip() for t in config.apply_to_leave_types.split(',')]
        if leave.leave_type not in applicable_leave_types:
            return None
        
        # Calculate time remaining
        cutoff_time = leave.created_at + timedelta(minutes=config.approval_time_minutes)
        time_remaining = cutoff_time - datetime.utcnow()
        
        if time_remaining.total_seconds() <= 0:
            return {'status': 'overdue', 'minutes': 0}
        else:
            return {
                'status': 'pending',
                'minutes': int(time_remaining.total_seconds() / 60),
                'cutoff_time': cutoff_time
            }

# Global instance
auto_approval_service = AutoApprovalService()
