import sqlite3

conn = sqlite3.connect('backend/netlink_dev.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
tables = [row[0] for row in c.fetchall()]
print(f"Total Tables in SQLite: {len(tables)}")
for t in sorted(tables):
    c.execute(f'SELECT count(*) FROM "{t}"')
    count = c.fetchone()[0]
    if count > 0:
        print(f"  {t}: {count} rows")
    else:
        print(f"  {t}: 0 rows")
conn.close()
