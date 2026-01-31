from flask import Blueprint, flash, redirect, render_template, url_for
from flask_login import login_required

from models import Salary

# Create the Blueprint
salaries_bp = Blueprint('salaries', __name__, template_folder='../templates')

@salaries_bp.route('/')
@login_required
def list_salaries():
    """List all salary records (view only)."""
    try:
        salaries = Salary.query.all()
        return render_template('salaries/index.html', salaries=salaries)
    except Exception as e:
        print(f"Error in list_salaries: {str(e)}")
        flash('An error occurred while loading salary records', 'danger')
        return render_template('salaries/index.html', salaries=[])

@salaries_bp.route('/view/<int:salary_id>')
@login_required
def view_salary(salary_id):
    """View a single salary record."""
    try:
        salary = Salary.query.get_or_404(salary_id)
        # Salary is linked to teacher via relationship
        teacher = salary.teacher
        return render_template('salaries/view.html', salary=salary, teacher=teacher)
    except Exception as e:
        print(f"Error in view_salary: {str(e)}")
        flash('An error occurred while loading the salary record', 'danger')
        return redirect(url_for('salaries.list_salaries'))