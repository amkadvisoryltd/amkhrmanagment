const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT, -- admin, accounts, user (as requested)
    designation TEXT,
    supervisor_name TEXT
  );

  CREATE TABLE IF NOT EXISTS conveyance_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT DEFAULT 'submitted', -- submitted, verified, approved, rejected, remarks
    remarks TEXT,
    daily_allowance REAL DEFAULT 0,
    total_taka REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conveyance_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER,
    date TEXT,
    particular TEXT,
    work_ref TEXT,
    district TEXT,
    taka REAL,
    FOREIGN KEY(bill_id) REFERENCES conveyance_bills(id)
  );
`);

const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (!count.c) {
  // Seed default admin
  db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run(
    'admin', 'admin123', 'System Admin', 'admin'
  );
}

function createUser(userData) {
  const { username, password, name, role, designation, supervisor_name } = userData;
  return db.prepare(`
    INSERT INTO users (username, password, name, role, designation, supervisor_name) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, password, name, role, designation, supervisor_name);
}

function createBill(userId, allowance, items) {
  const totalTaka = items.reduce((sum, item) => sum + (parseFloat(item.taka) || 0), 0);
  
  const insertBill = db.prepare(`
    INSERT INTO conveyance_bills (user_id, daily_allowance, total_taka, status) VALUES (?, ?, ?, 'submitted')
  `);
  const insertItem = db.prepare(`
    INSERT INTO conveyance_items (bill_id, date, particular, work_ref, district, taka) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((uId, allow, bItems, total) => {
    const info = insertBill.run(uId, allow, total);
    const billId = info.lastInsertRowid;
    for (const item of bItems) {
      insertItem.run(billId, item.date, item.particular, item.work_ref, item.district, item.taka);
    }
    return billId;
  });

  return transaction(userId, allowance, items, totalTaka);
}

function getBills(role, userId = null) {
  let query = `
    SELECT b.*, u.name as user_name, u.designation, u.supervisor_name 
    FROM conveyance_bills b 
    JOIN users u ON b.user_id = u.id
  `;
  
  if (role === 'user') {
    return db.prepare(query + " WHERE b.user_id = ?").all(userId);
  } else if (role === 'accounts') {
    return db.prepare(query + " WHERE b.status = 'submitted'").all();
  }
  return db.prepare(query).all();
}

function updateBillStatus(billId, status, remarks = '') {
  return db.prepare("UPDATE conveyance_bills SET status = ?, remarks = ? WHERE id = ?")
    .run(status, remarks, billId);
}

function getBillDetails(billId) {
  const bill = db.prepare("SELECT b.*, u.name, u.designation, u.supervisor_name FROM conveyance_bills b JOIN users u ON b.user_id = u.id WHERE b.id = ?").get(billId);
  const items = db.prepare("SELECT * FROM conveyance_items WHERE bill_id = ?").all(billId);
  return { ...bill, items };
}

module.exports = { createUser, createBill, getBills, updateBillStatus, getBillDetails };
