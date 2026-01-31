"""Script: safely add parent_name column to receipt table if it doesn't exist.
Run from project root: python scripts/add_receipt_parent_column.py
"""
import pathlib
import sqlite3

DB_PATH = pathlib.Path('instance') / 'school.db'
if not DB_PATH.exists():
    print(f"DB not found at {DB_PATH}. Aborting.")
    raise SystemExit(1)

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# Check if column exists
cur.execute("PRAGMA table_info('receipt')")
cols = [row[1] for row in cur.fetchall()]
if 'parent_name' in cols:
    print('Column parent_name already exists on receipt table. No action taken.')
    conn.close()
    raise SystemExit(0)

# Add column
try:
    cur.execute("ALTER TABLE receipt ADD COLUMN parent_name VARCHAR(200);")
    conn.commit()
    print('Column parent_name added to receipt table successfully.')
except Exception as e:
    print('Error while adding column:', e)
    raise
finally:
    conn.close()
