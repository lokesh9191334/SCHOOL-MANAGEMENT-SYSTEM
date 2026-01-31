from flask import Blueprint, redirect, render_template, request, url_for

from models import Classroom, db

classrooms_bp = Blueprint('classrooms', __name__, template_folder='../templates')


@classrooms_bp.route('/', methods=['GET'])
def list_classrooms():
    items = Classroom.query.all()
    return render_template('classrooms/index.html', classrooms=items)


@classrooms_bp.route('/add', methods=['GET', 'POST'])
def add_classroom():
    if request.method == 'POST':
        name = request.form.get('name')
        grade = request.form.get('grade')
        capacity = request.form.get('capacity')
        c = Classroom(name=name, grade=grade, capacity=int(capacity) if capacity else None)
        db.session.add(c)
        db.session.commit()
        return redirect(url_for('classrooms.list_classrooms'))
    return render_template('classrooms/form.html')
