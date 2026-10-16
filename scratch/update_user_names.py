import sqlite3

def update():
    for db_path in ['backend/netlink_dev.db', 'netlink_dev.db']:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()

        c.execute("UPDATE users SET full_name = 'Prerna Verma' WHERE id = 'usr-hr-001' OR role = 'HR'")
        c.execute("UPDATE users SET full_name = 'Abhishek Verma' WHERE id = 'usr-admin-001' OR role = 'SUPER_ADMIN'")
        conn.commit()

        c.execute("SELECT id, email, full_name, role FROM users WHERE role IN ('HR', 'SUPER_ADMIN')")
        users = c.fetchall()
        print(f"Updated Users in {db_path}:", users)
        conn.close()

if __name__ == '__main__':
    update()
