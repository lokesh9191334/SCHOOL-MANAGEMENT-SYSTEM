from flask import Flask, render_template_string
from app import create_app
from sqlalchemy import text
from models import db

app = create_app()

@app.route('/simple-status')
def simple_status():
    """Simple standalone test for leave status"""
    try:
        # Direct database query without any authentication
        teachers = db.session.execute(text("SELECT id, name FROM teacher")).fetchall()
        print(f"Found teachers: {teachers}")
        
        if not teachers:
            return "No teachers found in database"
        
        # Get first teacher
        teacher_id = str(teachers[0][0])
        teacher_name = teachers[0][1]
        
        # Get leaves for first teacher
        leaves = db.session.execute(text("""
            SELECT id, leave_type, status FROM teacher_leave WHERE teacher_id = :teacher_id
        """), {"teacher_id": teacher_id}).fetchall()
        
        print(f"Leaves for teacher {teacher_id}: {leaves}")
        
        # Create simple HTML
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><title>Simple Status Test</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Simple Status Test</h1>
            <h2>Teachers in Database:</h2>
            <ul>
        """
        
        for teacher in teachers:
            html += f"<li>Teacher ID: {teacher[0]}, Name: {teacher[1]}</li>"
        
        html += f"</ul>"
        
        if teachers:
            teacher_id = str(teachers[0][0])
            html += f"<h2>Leaves for Teacher {teachers[0][1]} (ID: {teacher_id}):</h2>"
            html += f"<p>Total leaves: {len(leaves)}</p>"
            
            if leaves:
                html += "<ul>"
                for leave in leaves:
                    html += f"<li>Leave ID: {leave[0]}, Type: {leave[1]}, Status: {leave[2]}</li>"
                html += "</ul>"
            else:
                html += "<p>No leaves found for this teacher.</p>"
        else:
            html += "<p>No teachers found.</p>"
        
        html += """
            <h2>Test Complete</h2>
            <p>If you see this page, the database connection is working.</p>
        </body>
        </html>
        """
        
        return html
        
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == '__main__':
    app.run(debug=True, port=5002)
