const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize local database (creates data.db and seeds sample data)
const db = require('./db');

// Serve static files from workspace root (index.html is at project root)
app.use(express.static(path.join(__dirname)));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Example API endpoint
app.post('/api/echo', (req, res) => {
  res.json({ received: req.body });
});

// Admin: Create Credentials
app.post('/api/admin/users', (req, res) => {
  try {
    const info = db.createUser(req.body);
    res.json({ success: true, userId: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// User: Submit Conveyance Bill
app.post('/api/conveyance', (req, res) => {
  try {
    const { userId, dailyAllowance, items } = req.body;
    const billId = db.createBill(userId, dailyAllowance, items);
    res.json({ success: true, billId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Bills (Filtered by Role)
app.get('/api/conveyance', (req, res) => {
  const { role, userId } = req.query;
  res.json(db.getBills(role, userId));
});

// Update Bill Status (Accounts Verify / Admin Approve-Reject)
app.patch('/api/conveyance/:id/status', (req, res) => {
  const { status, remarks } = req.body;
  db.updateBillStatus(req.params.id, status, remarks);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
