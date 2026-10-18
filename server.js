const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تنظیمات
const SECRET_KEY = "HIVE_SECRET_2026";
let commandQueue = [];

// متغیرهای بررسی آنلاین بودن هوشمند بر اساس ارتباط مستقیم پلاگین
let lastPluginHeartbeat = Date.now(); // در لحظه اول آنلاین فرض شود
let serverPlayers = 0;
let serverMaxPlayers = 20;

// ۱. وضعیت سرور برای سایت
app.get('/api/status', (req, res) => {
  const now = Date.now();
  // اگر در ۶۰ ثانیه گذشته سرور یا پلاگین پاسخ داده باشد، آنلاین نشان داده می‌شود
  const isOnline = (now - lastPluginHeartbeat) < 60000;

  res.json({
    online: isOnline,
    currentPlayers: isOnline ? serverPlayers : 0,
    maxPlayers: serverMaxPlayers
  });
});

// ۲. پردازش خرید رنک
const handleRankPurchase = (req, res) => {
  const gamertag = req.body.gamertag || req.body.username;
  const rank = req.body.rank;

  if (!gamertag || typeof gamertag !== 'string' || gamertag.length > 16) {
    return res.status(400).json({ success: false, message: 'Invalid username.' });
  }

  const allowedRanks = ['Elite', 'ultra', 'Legend'];
  const cleanRank = allowedRanks.find(r => r.toLowerCase() === (rank || '').toLowerCase());

  if (!cleanRank) {
    return res.status(400).json({ success: false, message: 'Invalid rank selected.' });
  }

  const cleanUsername = gamertag.replace(/[^a-zA-Z0-9_]/g, '');
  const command = `ranks setrank "${cleanUsername}" ${cleanRank} 30d`;
  
  commandQueue.push({ id: Date.now(), cmd: command });
  console.log(`[Queue] Added command: ${command}`);

  return res.json({
    success: true,
    message: `درخواست خرید رنک ${cleanRank} برای ${cleanUsername} ثبت شد.`
  });
};

app.post('/api/buy-rank', handleRankPurchase);
app.post('/api/buy', handleRankPurchase);

// ۳. مسیری که سرور ماینکرفت با سایت تماس می‌گیرد
app.get('/api/get-commands', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // هر بار که پلاگین سرور به این آدرس سر می‌زند، یعنی سرور روشن است!
  lastPluginHeartbeat = Date.now();

  // در صورت ارسال تعداد پلیرها از پلاگین، به‌روزرسانی شود
  if (req.query.online) {
    serverPlayers = parseInt(req.query.online) || 0;
  }

  const pending = [...commandQueue];
  commandQueue = [];
  res.json({ commands: pending });
});

// پورت اجرایی روی Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
