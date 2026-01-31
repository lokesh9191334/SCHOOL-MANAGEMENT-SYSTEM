# School Management System - Development Guide

## Quick Start Guide for Future Updates

### 1. **Starting the Development Server**

```powershell
# Navigate to project directory
cd "C:\Users\lk527\Desktop\SCHOOL MANAGEMENT SYSTEM"

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start Flask development server
python app.py
```

**Server URL:** `http://127.0.0.1:5000`

---

## 2. **Making UI/Template Changes**

### Add/Edit HTML Pages

1. **Location:** `templates/` folder
2. **Steps:**
   - Edit the `.html` file
   - Save the file
   - Refresh browser (no server restart needed)
   - Changes appear immediately

**Example:** To update the Help page, edit `templates/help.html`

### Common Template Folders:
- `templates/subjects/` - Subject pages
- `templates/fees/` - Fee/Receipt pages
- `templates/students/` - Student pages
- `templates/dashboard/` - Dashboard pages

---

## 3. **Adding/Modifying Routes**

### Steps to Add a New Route:

1. **Locate the route file** in `routes/` folder
   - `routes/students.py` - Student routes
   - `routes/fees.py` - Fee routes
   - `routes/subjects.py` - Subject routes
   - etc.

2. **Add the route function:**
   ```python
   @students_bp.route('/new-feature')
   @login_required
   def new_feature():
       # Your code here
       return render_template('students/new_feature.html', data=data)
   ```

3. **Create corresponding template** in `templates/students/new_feature.html`

4. **Restart server** (Ctrl+C, then `python app.py`)

---

## 4. **Updating Database Models**

### Steps to Add a New Column/Model:

1. **Edit `models.py`**
   ```python
   class Student(db.Model):
       # existing columns...
       new_column = db.Column(db.String(100), nullable=True)
   ```

2. **Add column to existing SQLite database:**
   ```powershell
   # Run this Python command
   python -c "
   import sqlite3
   conn = sqlite3.connect('instance/school.db')
   cursor = conn.cursor()
   cursor.execute('ALTER TABLE student ADD COLUMN new_column VARCHAR(100)')
   conn.commit()
   conn.close()
   print('Column added!')
   "
   ```

3. **Or reinitialize database** (LOSES ALL DATA):
   ```powershell
   # Delete old database
   Remove-Item instance/school.db
   
   # Reinitialize
   python db_init.py
   ```

---

## 5. **Updating Styles & Colors**

### Sidebar/Navbar Colors:

1. **Edit `templates/base.html`**
2. **Find the `:root` CSS variables** (around line 12-28)
3. **Update colors:**
   ```css
   :root {
     --primary-color: #3b7dd4;      /* Main blue */
     --secondary-color: #4a9bff;    /* Light blue */
     /* ... other colors ... */
   }
   ```
4. **Or edit specific component styling:**
   - `.sidebar` - Sidebar colors
   - `.navbar` - Navbar colors
   - `.card` - Card styling
   - etc.

5. **Save and refresh browser**

---

## 6. **Adding New Features to Forms**

### Example: Add a field to Subject form

1. **Update model** in `models.py`:
   ```python
   class Subject(db.Model):
       # existing fields...
       new_field = db.Column(db.String(200), nullable=True)
   ```

2. **Update route** in `routes/subjects.py`:
   ```python
   @subjects_bp.route('/add', methods=['GET', 'POST'])
   def add_subject():
       if request.method == 'POST':
           new_field = request.form.get('new_field')
           subject = Subject(name=name, new_field=new_field)
           db.session.add(subject)
           db.session.commit()
   ```

3. **Update template** in `templates/subjects/form.html`:
   ```html
   <div class="form-group">
       <label for="new_field">New Field:</label>
       <input type="text" class="form-control" id="new_field" name="new_field">
   </div>
   ```

4. **Add database column** (see section 4)

---

## 7. **Email Configuration**

### Update contact email across the site:

1. **Help Page:** `templates/help.html`
   - Search for `schoolmanagementsystem091@gmail.com`
   - Replace with new email

2. **Terms & Conditions:** `templates/terms_and_conditions.html`
   - Search for `schoolmanagementsystem091@gmail.com`
   - Replace with new email

3. **Dashboard Routes:** `routes/dashboard.py`
   - Update any hardcoded email references

---

## 8. **Common Updates Checklist**

### ✅ To Update:
- [ ] **Sidebar Links** → Edit `templates/base.html` (nav section)
- [ ] **Page Colors/Theme** → Edit CSS in `templates/base.html` (`:root` styles)
- [ ] **Help Content** → Edit `templates/help.html`
- [ ] **Terms & Conditions** → Edit `templates/terms_and_conditions.html`
- [ ] **Student Form** → Edit `templates/students/form.html` + `routes/students.py`
- [ ] **Fee Receipt** → Edit `templates/fees/receipt_view.html` + `routes/fees.py`
- [ ] **Subject Stream** → Already implemented in `models.py` and `templates/subjects/form.html`

---

## 9. **Testing Your Changes**

### Quick Test Checklist:

1. **Start server:** `python app.py`
2. **Open browser:** `http://127.0.0.1:5000`
3. **Test the feature:**
   - Add/edit/delete records
   - Check if data saves properly
   - Verify no errors in console
4. **Check other pages:** Make sure you didn't break anything else

---

## 10. **Important File Structure**

```
SCHOOL MANAGEMENT SYSTEM/
├── app.py                      # Main Flask app
├── models.py                   # Database models
├── db_init.py                  # Database initialization
├── requirements.txt            # Python dependencies
├── instance/
│   └── school.db              # SQLite database
├── routes/                     # Route files
│   ├── students.py
│   ├── fees.py
│   ├── subjects.py
│   ├── dashboard.py
│   └── ... (other routes)
├── templates/                  # HTML templates
│   ├── base.html              # Base/layout template
│   ├── help.html              # Help page
│   ├── terms_and_conditions.html
│   ├── subjects/              # Subject pages
│   ├── fees/                  # Fee pages
│   └── ... (other templates)
├── scripts/
│   └── ensure_receipt_parent_column.py  # Database helper
└── .venv/                     # Virtual environment
```

---

## 11. **Troubleshooting Common Issues**

### **Issue:** Page not found (404 error)
- **Solution:** Check route name in template `url_for()` matches actual route function name

### **Issue:** Template not found
- **Solution:** Verify template file exists and path is correct in `render_template()`

### **Issue:** Column not found in database
- **Solution:** Run the ALTER TABLE command or reinitialize database with `python db_init.py`

### **Issue:** Import errors
- **Solution:** Check all required models are imported at top of route file
  ```python
  from models import Student, Teacher, Subject, db
  ```

### **Issue:** Server crashes on startup
- **Solution:** 
  1. Stop server (Ctrl+C)
  2. Check error message
  3. Fix the issue
  4. Restart: `python app.py`

---

## 12. **Useful Commands**

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Deactivate virtual environment
deactivate

# Install new package
pip install package_name

# List installed packages
pip list

# Export requirements
pip freeze > requirements.txt

# Run database initialization
python db_init.py

# Check database column
python -c "
import sqlite3
conn = sqlite3.connect('instance/school.db')
cursor = conn.cursor()
cursor.execute('PRAGMA table_info(student)')
for row in cursor.fetchall():
    print(row)
conn.close()
"
```

---

## 13. **Latest Updates (Current Session)**

✅ **What was done:**
- Added `parent_name` column to Receipt model
- Created `terms_and_conditions.html` page
- Added `help` and `terms_and_conditions` routes
- Updated sidebar with professional blue gradient theme
- Enhanced fees analytics with missing variables
- Removed "Premium SMS" header from sidebar
- Fixed `Attendance` import in subjects routes

✅ **Email configured:** `schoolmanagementsystem091@gmail.com`

---

## 14. **Next Steps for Future Development**

### High Priority:
1. Add email functionality for notifications
2. Implement actual SMS reminders
3. Add user authentication improvements
4. Create backup/restore functionality

### Medium Priority:
1. Add more analytics charts
2. Implement bulk import for all modules
3. Add export to PDF functionality
4. Create API endpoints

### Nice to Have:
1. Mobile app
2. Live chat support
3. AI-powered insights
4. Integration with payment gateways

---

## 15. **Getting Help**

### When you need to update something:

1. **Identify what you want to change:**
   - UI/styling → Edit template HTML
   - Functionality → Edit route/model
   - Database → Update model + add column

2. **Know the flow:**
   - User clicks link → Route function runs → Returns template with data

3. **Test after changes:**
   - Refresh browser
   - Check for errors
   - Verify functionality works

4. **If stuck:**
   - Check error message in browser/console
   - Verify file paths are correct
   - Check imports are complete
   - Restart server if nothing works

---

**Good Luck with your School Management System! 🎓**

For any specific updates, refer to the section number above.
