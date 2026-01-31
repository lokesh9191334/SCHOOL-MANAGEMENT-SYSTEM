import sqlite3

conn = sqlite3.connect('site.db')
cursor = conn.cursor()

# Check all tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = cursor.fetchall()
print('Available tables:')
for table in tables:
    print(f'  {table[0]}')

# Check if activity_log exists and its schema
cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="activity_log"')
if cursor.fetchone():
    cursor.execute('PRAGMA table_info(activity_log)')
    columns = cursor.fetchall()
    print('\nActivity log table columns:')
    for col in columns:
        print(f'  {col[1]} - {col[2]}')

    # Check if we have any data
    cursor.execute('SELECT COUNT(*) FROM activity_log')
    count = cursor.fetchone()[0]
    print(f'\nActivity log records: {count}')

    if count > 0:
        cursor.execute('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 1')
        latest = cursor.fetchone()
        print(f'Latest record: {latest}')
else:
    print('\nActivity log table does not exist')

conn.close()