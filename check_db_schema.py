import sqlite3
import os

# Get the database path from the app configuration
from app import create_app
app = create_app()
db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check the student table schema
print("Student table schema:")
cursor.execute("PRAGMA table_info(student)")
columns = cursor.fetchall()
for column in columns:
    print(f"Column: {column[1]}, Type: {column[2]}, Nullable: {column[3]}, Default: {column[4]}")

# Check if photo field exists
photo_column = any(col[1] == 'photo' for col in columns)
print(f"\nPhoto column exists: {photo_column}")

# Get a sample student record
print("\nSample student record:")
cursor.execute("SELECT id, name, photo FROM student LIMIT 1")
student = cursor.fetchone()
if student:
    print(f"ID: {student[0]}, Name: {student[1]}, Photo: {student[2]}")

conn.close()
