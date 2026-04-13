const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// SSE Clients for Live Updates
let sseClients = [];

function broadcastUpdate() {
    sseClients.forEach(c => {
        try {
            c.res.write('event: update\n');
            c.res.write(`data: ${new Date().toISOString()}\n\n`);
        } catch (e) {
            // Ignore errors for disconnected clients
        }
    });
}

// Initialize local database (creates data.db and seeds sample data)
const fs = require('fs');
const dbFile = path.join(__dirname, 'local-backend', 'db.json');

function getHRData() {
    if (!fs.existsSync(dbFile)) {
        const initial = { 
            users: [{id:'admin_1',username:'amkadvisory',password:'amk123',name:'AMK Admin',role:'admin',status:'active'}], 
            attendance: [], leaves: [], announcements: [], policies: [], late_logins: [], holidays: [], config: {} 
        };
        saveHRData(initial);
        return initial;
    }
    return JSON.parse(fs.readFileSync(dbFile, 'utf8') || '{}');
}

function saveHRData(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
}

// Serve static files from workspace root (index.html is at project root)
app.use(express.static(path.join(__dirname)));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SSE Endpoint
app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);
    req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
    });
});

// HR Sync: Get All Data
app.get('/api/data', (req, res) => {
    const data = getHRData();
    res.json({
        users: data.users || [],
        attendance: data.attendance || [],
        leaves: data.leaves || [],
        announcements: data.announcements || [],
        policies: data.policies || [],
        requests: data.late_logins || [],
        holidays: data.holidays || [],
        config: data.config || {}
    });
});

// HR Sync: Push Data
app.post('/api/data', (req, res) => {
    const body = req.body || {};
    const data = getHRData();
    data.users = body.users || data.users;
    data.attendance = body.attendance || data.attendance;
    data.leaves = body.leaves || data.leaves;
    data.announcements = body.announcements || data.announcements;
    data.policies = body.policies || data.policies;
    data.late_logins = body.requests || data.late_logins;
    data.holidays = body.holidays || data.holidays;
    data.config = body.config || data.config || {};
    saveHRData(data);
    broadcastUpdate();
    res.json({ success: true });
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
