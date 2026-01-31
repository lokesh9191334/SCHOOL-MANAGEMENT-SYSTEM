import sqlite3

# Connect to the database directly
conn = sqlite3.connect('site.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables in database:")
for table in tables:
    print(f"- {table[0]}")

# Check student table if it exists
if any(table[0] == 'student' for table in tables):
    print("\nStudent table columns:")
    cursor.execute("PRAGMA table_info(student)")
    columns = cursor.fetchall()
    for column in columns:
        print(f"  {column[1]} (Type: {column[2]})")
    
    print("\nSample student data:")
    cursor.execute("SELECT id, name, first_name, last_name, photo, student_aadhaar_photo FROM student LIMIT 5")
    students = cursor.fetchall()
    for student in students:
        print(f"  ID: {student[0]}, Name: {student[1]}, Photo: {student[4]}, Aadhaar Photo: {student[5]}")

conn.close()
