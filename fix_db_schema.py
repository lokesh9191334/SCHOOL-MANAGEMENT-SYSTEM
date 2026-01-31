import os
import sqlite3

# Path to the database
db_path = os.path.join('instance', 'school.db')

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if health_problem column exists
    cursor.execute("PRAGMA table_info(student)")
    columns = [col[1] for col in cursor.fetchall()]

    if 'health_problem' not in columns:
        print("Adding missing columns to student table...")
        # Add missing columns
        cursor.execute("ALTER TABLE student ADD COLUMN health_problem BOOLEAN DEFAULT 0")
        cursor.execute("ALTER TABLE student ADD COLUMN health_problem_description TEXT")

        # Add other potentially missing columns if any
        # Check for other columns that might be missing

        conn.commit()
        print("Database schema updated successfully!")
    else:
        print("Columns already exist.")

    conn.close()
else:
    print("Database file not found. Please run db_init.py first.")
