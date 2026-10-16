import sqlite3

conn = sqlite3.connect('backend/netlink_dev.db')
c = conn.cursor()

c.execute("UPDATE students SET batch_type = 'SHORT_DURATION' WHERE batch_type IN ('6 Months Program', 'SIX_MONTHS', 'short_duration')")
c.execute("UPDATE students SET batch_type = 'TECH_MASTER' WHERE batch_type IN ('Tech Master', 'Full-Time', 'tech_master')")
c.execute("UPDATE batches SET batch_type = 'SHORT_DURATION' WHERE batch_type IN ('SIX_MONTHS', '6 Months Program')")
c.execute("UPDATE batches SET batch_type = 'TECH_MASTER' WHERE batch_type IN ('Tech Master', 'tech_master')")

conn.commit()

print('Updated students batch types:', c.execute('SELECT DISTINCT batch_type FROM students').fetchall())
print('Updated batches batch types:', c.execute('SELECT DISTINCT batch_type FROM batches').fetchall())
conn.close()
