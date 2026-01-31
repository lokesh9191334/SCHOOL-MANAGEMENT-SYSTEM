import sqlite3

conn = sqlite3.connect('site.db')
cursor = conn.cursor()

# Check all tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = cursor.fetchall()
print('Available tables:')
for table in tables:
    print(f'  {table[0]}')

# Check user table schema if it exists
cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="user"')
if cursor.fetchone():
    cursor.execute('PRAGMA table_info(user)')
    columns = cursor.fetchall()
    print('\nUser table columns:')
    for col in columns:
        print(f'  {col[1]} - {col[2]}')

conn.close()