import sqlite3

conn = sqlite3.connect('site.db')
cursor = conn.cursor()

# Check all tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = cursor.fetchall()
print('All tables:')
for table in tables:
    print(f'  {table[0]}')

conn.close()