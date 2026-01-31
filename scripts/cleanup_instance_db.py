import sqlite3, os
p = r'C:\Users\lk527\Desktop\SCHOOL MANAGEMENT SYSTEM\instance\site.db'
print('DB path:', p, 'exists?', os.path.exists(p))
if os.path.exists(p):
    conn = sqlite3.connect(p)
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
else:
    print('No DB at', p)
