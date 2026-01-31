import sqlite3, os
p = r'C:\Users\lk527\Desktop\SCHOOL MANAGEMENT SYSTEM\instance\site.db'
if not os.path.exists(p):
    raise SystemExit('DB not found: ' + p)
conn = sqlite3.connect(p)
c = conn.cursor()
# Add columns if not present
c.execute("PRAGMA table_info('teacher')")
cols = [r[1] for r in c.fetchall()]
print('teacher columns before:', cols)
if 'school_id' not in cols:
    c.execute("ALTER TABLE teacher ADD COLUMN school_id VARCHAR(5)")
    print('Added school_id')
else:
    print('school_id already exists')
if 'secret_key' not in cols:
    c.execute("ALTER TABLE teacher ADD COLUMN secret_key VARCHAR(5)")
    print('Added secret_key')
else:
    print('secret_key already exists')
# Create unique index for secret_key
c.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='ix_teacher_secret_key'")
if not c.fetchone():
    c.execute("CREATE UNIQUE INDEX ix_teacher_secret_key ON teacher(secret_key)")
    print('Created unique index ix_teacher_secret_key')
else:
    print('Index ix_teacher_secret_key already exists')
# Update alembic_version to new revision
c.execute("SELECT version_num FROM alembic_version")
cur = c.fetchone()
print('alembic_version before:', cur)
if cur and cur[0] != 'eb0ba2d2ba30':
    c.execute("UPDATE alembic_version SET version_num = 'eb0ba2d2ba30'")
    print('Updated alembic_version to eb0ba2d2ba30')
elif not cur:
    c.execute("INSERT INTO alembic_version(version_num) VALUES('eb0ba2d2ba30')")
    print('Inserted alembic_version eb0ba2d2ba30')
else:
    print('alembic_version already at desired revision')
conn.commit()
conn.close()
print('Done')
