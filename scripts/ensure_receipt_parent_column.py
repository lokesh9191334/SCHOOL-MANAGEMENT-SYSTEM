"""Safe helper to ensure `parent_name` column exists on `receipt` table.

Usage:
  python scripts/ensure_receipt_parent_column.py

This script checks `instance/school.db` and adds the column only if it doesn't exist.
"""
import pathlib
import sqlite3
import sys

DB_PATH = pathlib.Path('instance') / 'school.db'

if not DB_PATH.exists():
    print(f"Database not found: {DB_PATH.resolve()}")
    sys.exit(1)

try:
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Check if `receipt` table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='receipt'")
    if not cur.fetchone():
        print("Table `receipt` does not exist in the database. No changes made.")
        conn.close()
        sys.exit(1)

    # Get columns
    cur.execute("PRAGMA table_info('receipt')")
    cols = [row[1] for row in cur.fetchall()]

    if 'parent_name' in cols:
        print("Column `parent_name` already exists on `receipt`.")
    else:
        print("Adding column `parent_name` to `receipt` table...")
        cur.execute("ALTER TABLE receipt ADD COLUMN parent_name VARCHAR(200);")
        conn.commit()
        print("Column added successfully.")

    conn.close()
    sys.exit(0)

except sqlite3.OperationalError as e:
    print("SQLite OperationalError:", e)
    sys.exit(2)
except Exception as e:
    print("Unexpected error:", e)
    sys.exit(3)
