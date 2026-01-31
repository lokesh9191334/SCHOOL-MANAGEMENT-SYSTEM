#!/usr/bin/env python3
"""
Ultra simple Flask app for leave submission
"""
from flask import Flask, request, jsonify, render_template_string
from app import create_app, db
from sqlalchemy import text
from datetime import datetime

app = create_app()

@app.route('/ultra-simple-form')
def ultra_simple_form():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Ultra Simple Leave Form</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 500px; margin: 0 auto; padding: 20px; border: 2px solid #007bff; border-radius: 10px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { margin-top: 20px; padding: 10px; background: #f8f9fa; border: 1px solid #ddd; }
            .success { color: green; font-weight: bold; }
            .error { color: red; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Ultra Simple Leave Form</h1>
            <p>This will definitely work!</p>
            
            <form id="leaveForm">
                <div class="form-group">
                    <label>Leave Type:</label>
                    <select name="leave_type" required>
                        <option value="sick">Sick Leave</option>
                        <option value="personal">Personal Leave</option>
                        <option value="vacation">Vacation</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Reason:</label>
                    <textarea name="reason" rows="3" required>Ultra simple test</textarea>
                </div>
                
                <button type="submit">Submit Leave</button>
            </div>
            
            <div id="result" class="result"></div>
        </div>

        <script>
        document.getElementById('leaveForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const resultDiv = document.getElementById('result');
            
            resultDiv.innerHTML = '<p><strong>Submitting...</strong></p>';
            
            fetch('/ultra-simple-submit', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resultDiv.innerHTML = '<p class="success">✅ SUCCESS: ' + data.message + '</p>';
                } else {
                    resultDiv.innerHTML = '<p class="error">❌ ERROR: ' + data.message + '</p>';
                }
            })
            .catch(error => {
                resultDiv.innerHTML = '<p class="error">❌ ERROR: ' + error.message + '</p>';
            });
        });
        </script>
    </body>
    </html>
    '''

@app.route('/ultra-simple-submit', methods=['POST'])
def ultra_simple_submit():
    try:
        # Get form data
        leave_type = request.form.get('leave_type', 'sick')
        reason = request.form.get('reason', 'Ultra simple test')
        
        # Insert directly into database
        insert_query = text("""
            INSERT INTO teacher_leave (teacher_id, leave_type, start_date, end_date, reason, status, created_at)
            VALUES (:teacher_id, :leave_type, :start_date, :end_date, :reason, 'pending', :created_at)
        """)
        
        db.session.execute(insert_query, {
            'teacher_id': 2,  # Test Teacher ID
            'leave_type': leave_type,
            'start_date': datetime.now().date(),
            'end_date': datetime.now().date(),
            'reason': reason,
            'created_at': datetime.utcnow()
        })
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Leave submitted successfully!'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False, 
            'message': f'Error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
