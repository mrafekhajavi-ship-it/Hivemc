const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// صف نگهداری دستورات برای سرور ماینکرفت
let commandQueue = [];
const SECRET_KEY = "HIVE_SECRET_2026";

// مسیر ثبت خرید از سایت
app.post('/api/buy', (req, res) => {
  const { username, rank } = req.body;
  if (!username || !rank) {
    return res.status(400).json({ success: false, message: 'Invalid data' });
  }

  const cmd = `ranks setrank "${username}" ${rank} 30d`;
  commandQueue.push({ id: Date.now(), cmd });

  return res.json({ success: true, message: 'درخواست با موفقیت ثبت شد.' });
});

// مسیر دریافت دستورات توسط پلاگین ماینکرفت
app.get('/api/get-commands', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const pending = [...commandQueue];
  commandQueue = []; // خالی کردن صف پس از دریافت توسط سرور
  res.json({ commands: pending });
});

// پورت سرور در رندر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
