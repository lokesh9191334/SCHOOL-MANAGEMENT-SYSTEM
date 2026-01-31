import os
import sqlite3

db_path = 'instance/school.db'

def add_column():
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(teacher)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'qualification_document' not in columns:
            print("Adding qualification_document column...")
            cursor.execute("ALTER TABLE teacher ADD COLUMN qualification_document VARCHAR(255)")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column qualification_document already exists.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
