import sqlite3
import os

# Get the database path from the app configuration
from app import create_app
app = create_app()
db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')

# Check if the database file exists
print(f"Database file exists: {os.path.exists(db_path)}")
print(f"Database path: {db_path}")

# Connect to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all table names
print("\nAll tables in the database:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    print(f"- {table[0]}")

# If student table exists, check its schema
if any(table[0] == 'student' for table in tables):
    print("\nStudent table schema:")
    cursor.execute("PRAGMA table_info(student)")
    columns = cursor.fetchall()
    for column in columns:
        print(f"Column: {column[1]}, Type: {column[2]}, Nullable: {column[3]}, Default: {column[4]}")
elif any(table[0] == 'students' for table in tables):
    print("\nStudents table schema:")
    cursor.execute("PRAGMA table_info(students)")
    columns = cursor.fetchall()
    for column in columns:
        print(f"Column: {column[1]}, Type: {column[2]}, Nullable: {column[3]}, Default: {column[4]}")

conn.close()
