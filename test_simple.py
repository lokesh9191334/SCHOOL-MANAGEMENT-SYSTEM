from flask import Flask

app = Flask(__name__)

@app.route('/test')
def test():
    return "TEST PAGE IS WORKING!"

@app.route('/leave-status')
def leave_status():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Simple Leave Status</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .leave-item { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 5px; }
            .status { padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
            .approved { background: green; }
            .pending { background: orange; }
            .rejected { background: red; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Leave Status</h1>
                <p>Your leave applications</p>
            </div>
            
            <div class="leave-item">
                <h3>Sick Leave</h3>
                <p><span class="status approved">✅ Approved</span></p>
                <p><strong>Duration:</strong> 2 days</p>
                <p><strong>Period:</strong> 30 Jan 2026 to 31 Jan 2026</p>
                <p><strong>Applied On:</strong> 29 Jan 2026 21:10</p>
                <p><strong>Reason:</strong> Medical appointment</p>
            </div>
            
            <div class="leave-item">
                <h3>Sick Leave</h3>
                <p><span class="status approved">✅ Approved</span></p>
                <p><strong>Duration:</strong> 2 days</p>
                <p><strong>Period:</strong> 25 Jan 2026 to 26 Jan 2026</p>
                <p><strong>Applied On:</strong> 25 Jan 2026 10:15</p>
                <p><strong>Reason:</strong> Doctor consultation</p>
            </div>
            
            <div class="leave-item">
                <h3>Sick Leave</h3>
                <p><span class="status pending">⏰ Pending</span></p>
                <p><strong>Duration:</strong> 2 days</p>
                <p><strong>Period:</strong> 05 Feb 2026 to 06 Feb 2026</p>
                <p><strong>Applied On:</strong> 01 Feb 2026 09:00</p>
                <p><strong>Reason:</strong> Follow-up appointment</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

if __name__ == '__main__':
    app.run(debug=True, port=5003)
