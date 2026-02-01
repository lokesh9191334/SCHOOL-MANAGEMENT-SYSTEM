from models import db, TimeTable, TimeTableEntry, TeacherTimeTable, TeacherTimeTableEntry, TeacherSubstitution, TeacherLeave, Teacher, Subject, Classroom
from datetime import datetime, date, time, timedelta
from sqlalchemy import and_, or_
import logging

logger = logging.getLogger(__name__)

class TimetableService:
    def __init__(self):
        pass
    
    def create_teacher_timetable_from_main(self, main_timetable_id):
        """Create individual teacher timetables from main timetable"""
        try:
            main_timetable = TimeTable.query.get(main_timetable_id)
            if not main_timetable:
                return False, "Main timetable not found"
            
            # Get all entries from main timetable
            entries = TimeTableEntry.query.filter_by(timetable_id=main_timetable_id).all()
            
            # Group entries by teacher
            teacher_entries = {}
            for entry in entries:
                if entry.teacher_id not in teacher_entries:
                    teacher_entries[entry.teacher_id] = []
                teacher_entries[entry.teacher_id].append(entry)
            
            # Create individual teacher timetables
            for teacher_id, entries_list in teacher_entries.items():
                # Create or get teacher timetable
                teacher_tt = TeacherTimeTable.query.filter_by(
                    teacher_id=teacher_id,
                    academic_year=main_timetable.academic_year,
                    semester=main_timetable.semester
                ).first()
                
                if not teacher_tt:
                    teacher_tt = TeacherTimeTable(
                        teacher_id=teacher_id,
                        academic_year=main_timetable.academic_year,
                        semester=main_timetable.semester
                    )
                    db.session.add(teacher_tt)
                    db.session.flush()  # Get the ID
                
                # Delete existing entries for this teacher timetable
                TeacherTimeTableEntry.query.filter_by(teacher_timetable_id=teacher_tt.id).delete()
                
                # Add entries for this teacher
                for entry in entries_list:
                    teacher_entry = TeacherTimeTableEntry(
                        teacher_timetable_id=teacher_tt.id,
                        day_of_week=entry.day_of_week,
                        period_number=entry.period_number,
                        start_time=entry.start_time,
                        end_time=entry.end_time,
                        subject_id=entry.subject_id,
                        classroom_id=entry.classroom_id,
                        room_number=entry.room_number,
                        is_lab_period=entry.is_lab_period,
                        is_break_period=entry.is_break_period,
                        notes=entry.notes
                    )
                    db.session.add(teacher_entry)
            
            db.session.commit()
            return True, "Teacher timetables created successfully"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating teacher timetables: {e}")
            return False, str(e)
    
    def get_teacher_schedule_for_date(self, teacher_id, target_date):
        """Get teacher's schedule for a specific date"""
        try:
            day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
            
            # Get teacher's timetable entries for this day
            entries = TeacherTimeTableEntry.query.join(TeacherTimeTable)\
                                               .filter(TeacherTimeTable.teacher_id == teacher_id,
                                                      TeacherTimeTable.is_active == True,
                                                      TeacherTimeTableEntry.is_active == True,
                                                      TeacherTimeTableEntry.day_of_week == day_of_week)\
                                               .order_by(TeacherTimeTableEntry.period_number)\
                                               .all()
            return entries
            
        except Exception as e:
            logger.error(f"Error getting teacher schedule: {e}")
            return []
    
    def find_available_substitute_teacher(self, original_teacher_id, target_date, period_number, subject_id):
        """Find available substitute teacher for a specific period"""
        try:
            day_of_week = target_date.weekday()
            
            # Get original teacher's schedule for this period
            original_schedule = TeacherTimeTableEntry.query.join(TeacherTimeTable)\
                                                          .filter(TeacherTimeTable.teacher_id == original_teacher_id,
                                                                 TeacherTimeTable.is_active == True,
                                                                 TeacherTimeTableEntry.is_active == True,
                                                                 TeacherTimeTableEntry.day_of_week == day_of_week,
                                                                 TeacherTimeTableEntry.period_number == period_number)\
                                                          .first()
            
            if not original_schedule:
                return None, "Original schedule not found"
            
            # Get all teachers who can teach this subject
            subject = Subject.query.get(subject_id)
            if not subject:
                return None, "Subject not found"
            
            qualified_teachers = Teacher.query.filter(
                Teacher.subjects.contains(subject)
            ).filter(Teacher.id != original_teacher_id).all()
            
            # Find teachers who are free during this period
            available_teachers = []
            for teacher in qualified_teachers:
                # Check if teacher has any schedule during this time
                teacher_schedule = TeacherTimeTableEntry.query.join(TeacherTimeTable)\
                                                            .filter(TeacherTimeTable.teacher_id == teacher.id,
                                                                   TeacherTimeTable.is_active == True,
                                                                   TeacherTimeTableEntry.is_active == True,
                                                                   TeacherTimeTableEntry.day_of_week == day_of_week,
                                                                   TeacherTimeTableEntry.period_number == period_number)\
                                                            .first()
                
                # Check if teacher has existing substitution for this period
                existing_substitution = TeacherSubstitution.query.filter(
                    TeacherSubstitution.date == target_date,
                    TeacherSubstitution.substitute_teacher_id == teacher.id,
                    TeacherSubstitution.period_number == period_number,
                    TeacherSubstitution.status.in_(['accepted', 'pending'])
                ).first()
                
                # Check if teacher is on leave
                teacher_on_leave = TeacherLeave.query.filter(
                    TeacherLeave.teacher_id == teacher.id,
                    TeacherLeave.status == 'approved',
                    TeacherLeave.start_date <= target_date,
                    TeacherLeave.end_date >= target_date
                ).first()
                
                if not teacher_schedule and not existing_substitution and not teacher_on_leave:
                    available_teachers.append(teacher)
            
            # Return the first available teacher (you can implement priority logic here)
            if available_teachers:
                return available_teachers[0], None
            else:
                return None, "No available substitute teachers found"
                
        except Exception as e:
            logger.error(f"Error finding substitute teacher: {e}")
            return None, str(e)
    
    def create_automatic_substitution(self, teacher_id, target_date, period_number, reason="Automatic substitution"):
        """Create automatic substitution for absent teacher"""
        try:
            # Get teacher's schedule for this period
            teacher_schedule = self.get_teacher_schedule_for_date(teacher_id, target_date)
            target_period = None
            
            for schedule in teacher_schedule:
                if schedule.period_number == period_number:
                    target_period = schedule
                    break
            
            if not target_period:
                return False, "No schedule found for this period"
            
            # Find available substitute teacher
            substitute_teacher, error = self.find_available_substitute_teacher(
                teacher_id, target_date, period_number, target_period.subject_id
            )
            
            if not substitute_teacher:
                return False, f"No substitute available: {error}"
            
            # Create substitution
            substitution = TeacherSubstitution(
                original_teacher_id=teacher_id,
                substitute_teacher_id=substitute_teacher.id,
                subject_id=target_period.subject_id,
                classroom_id=target_period.classroom_id,
                date=target_date,
                start_time=target_period.start_time,
                end_time=target_period.end_time,
                period_number=period_number,
                reason=reason,
                absence_reason="Automatic",
                status="pending",  # Pending acceptance by substitute teacher
                created_by_id=None  # System created
            )
            
            db.session.add(substitution)
            db.session.commit()
            
            # Update timetable entry to reflect substitution
            self.update_timetable_with_substitution(substitution)
            
            # Send notification to substitute teacher (implement notification system)
            self.send_substitution_notification(substitution)
            
            return True, f"Substitution created with {substitute_teacher.name}"
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating automatic substitution: {e}")
            return False, str(e)
    
    def update_timetable_with_substitution(self, substitution):
        """Update timetable entry to reflect substitution"""
        try:
            # Find the original timetable entry
            day_of_week = substitution.date.weekday()
            
            original_entry = TimeTableEntry.query.filter(
                TimeTableEntry.day_of_week == day_of_week,
                TimeTableEntry.period_number == substitution.period_number,
                TimeTableEntry.teacher_id == substitution.original_teacher_id
            ).first()
            
            if original_entry:
                # Create a temporary substitution entry or mark as substituted
                # You could create a separate table for temporary substitutions
                # For now, we'll log the substitution
                logger.info(f"Timetable updated: {substitution.original_teacher.name} replaced by {substitution.substitute_teacher.name} on {substitution.date}")
            
        except Exception as e:
            logger.error(f"Error updating timetable with substitution: {e}")
    
    def send_substitution_notification(self, substitution):
        """Send notification to substitute teacher"""
        try:
            # TODO: Implement notification system
            # This could send email, SMS, or in-app notification
            message = f"You have been assigned as substitute teacher for {substitution.subject.name} on {substitution.date.strftime('%d-%m-%Y')} at {substitution.start_time.strftime('%H:%M')}"
            logger.info(f"Notification sent to {substitution.substitute_teacher.name}: {message}")
            
        except Exception as e:
            logger.error(f"Error sending substitution notification: {e}")
    
    def handle_teacher_absence(self, teacher_id, start_date, end_date):
        """Handle multi-day teacher absence by creating substitutions for all affected periods"""
        try:
            current_date = start_date
            created_substitutions = []
            errors = []
            
            while current_date <= end_date:
                # Skip weekends if configured
                if current_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                    current_date += timedelta(days=1)
                    continue
                
                # Get teacher's schedule for this day
                daily_schedule = self.get_teacher_schedule_for_date(teacher_id, current_date)
                
                # Create substitution for each period
                for period in daily_schedule:
                    if not period.is_break_period:  # Skip break periods
                        success, message = self.create_automatic_substitution(
                            teacher_id, current_date, period.period_number, 
                            f"Automatic substitution for absence from {start_date} to {end_date}"
                        )
                        
                        if success:
                            created_substitutions.append(f"{current_date.strftime('%d-%m-%Y')} - Period {period.period_number}")
                        else:
                            errors.append(f"{current_date.strftime('%d-%m-%Y')} - Period {period.period_number}: {message}")
                
                current_date += timedelta(days=1)
            
            return {
                'success': len(created_substitutions) > 0,
                'created_substitutions': created_substitutions,
                'errors': errors,
                'total_periods': len(created_substitutions) + len(errors)
            }
            
        except Exception as e:
            logger.error(f"Error handling teacher absence: {e}")
            return {
                'success': False,
                'error': str(e),
                'created_substitutions': [],
                'errors': [str(e)]
            }
    
    def check_next_day_substitutions(self):
        """Check and create substitutions for next day's teacher absences"""
        try:
            tomorrow = date.today() + timedelta(days=1)
            
            # Get all approved leaves for tomorrow
            leaves_tomorrow = TeacherLeave.query.filter(
                TeacherLeave.status == 'approved',
                TeacherLeave.start_date <= tomorrow,
                TeacherLeave.end_date >= tomorrow
            ).all()
            
            results = []
            for leave in leaves_tomorrow:
                result = self.handle_teacher_absence(leave.teacher_id, tomorrow, tomorrow)
                results.append({
                    'teacher': leave.teacher.name,
                    'result': result
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error checking next day substitutions: {e}")
            return []
    
    def get_teacher_workload(self, teacher_id, academic_year):
        """Get teacher's workload statistics"""
        try:
            teacher_tt = TeacherTimeTable.query.filter_by(
                teacher_id=teacher_id,
                academic_year=academic_year,
                is_active=True
            ).first()
            
            if not teacher_tt:
                return None
            
            entries = TeacherTimeTableEntry.query.filter_by(teacher_timetable_id=teacher_tt.id, is_active=True).all()
            
            # Calculate workload
            total_periods = len(entries)
            teaching_periods = len([e for e in entries if not e.is_break_period])
            lab_periods = len([e for e in entries if e.is_lab_period])
            break_periods = len([e for e in entries if e.is_break_period])
            
            # Calculate weekly hours
            total_minutes = 0
            for entry in entries:
                if entry.start_time and entry.end_time:
                    start = datetime.combine(date.today(), entry.start_time)
                    end = datetime.combine(date.today(), entry.end_time)
                    total_minutes += (end - start).total_seconds() / 60
            
            weekly_hours = total_minutes / 60
            
            return {
                'total_periods': total_periods,
                'teaching_periods': teaching_periods,
                'lab_periods': lab_periods,
                'break_periods': break_periods,
                'weekly_hours': weekly_hours,
                'daily_average': weekly_hours / 5  # Assuming 5 working days
            }
            
        except Exception as e:
            logger.error(f"Error calculating teacher workload: {e}")
            return None

# Global instance
timetable_service = TimetableService()
