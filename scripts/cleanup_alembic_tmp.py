import sqlite3
import os

db_path = os.path.join(r'C:\Users\lk527\Desktop\SCHOOL MANAGEMENT SYSTEM', 'site.db')
print('DB path:', db_path, 'exists?', os.path.exists(db_path))
if not os.path.exists(db_path):
    print('No DB file found; nothing to do.')
else:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in c.fetchall()]
    print('tables:', tables)
    tmp = [t for t in tables if t.startswith('_alembic_tmp')]
    print('tmp tables:', tmp)
    for t in tmp:
        print('dropping', t)
        c.execute(f"DROP TABLE IF EXISTS {t}")
    conn.commit()
    conn.close()
    print('Cleanup complete.')
