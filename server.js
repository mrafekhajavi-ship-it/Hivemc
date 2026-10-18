const express = require('express');
const path = require('path');
const bedrock = require('bedrock-protocol');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تنظیمات سرور ماینکرفت
const MINECRAFT_HOST = 'sv2.tgmc.ir';
const MINECRAFT_PORT = 27235;

// کلید امنیتی ارتباط بین پلاگین پاکت‌ماین و سایت
const SECRET_KEY = "HIVE_SECRET_2026";

// صف نگهداری دستورات
let commandQueue = [];

// کش وضعیت آنلاین سرور
let cachedStatus = { online: false, currentPlayers: 0, maxPlayers: 0 };
let lastPingTime = 0;

async function fetchServerStatus() {
  const now = Date.now();
  if (now - lastPingTime < 5000) {
    return cachedStatus;
  }

  try {
    const res = await bedrock.ping({
      host: MINECRAFT_HOST,
      port: MINECRAFT_PORT,
      timeout: 5000
    });

    cachedStatus = {
      online: true,
      currentPlayers: parseInt(res.playersOnline) || 0,
      maxPlayers: parseInt(res.maxPlayers) || 20
    };
    lastPingTime = now;
  } catch (err) {
    console.error('Bedrock Ping Error:', err.message);
    cachedStatus = { online: false, currentPlayers: 0, maxPlayers: 0 };
    lastPingTime = now;
  }

  return cachedStatus;
}

// ۱. دریافت وضعیت سرور برای نمایش در فرانت‌اند
app.get('/api/status', async (req, res) => {
  const status = await fetchServerStatus();
  res.json(status);
});

// ۲. پردازش خرید رنک از سایت (هم برای buy و هم buy-rank)
const handleRankPurchase = (req, res) => {
  const gamertag = req.body.gamertag || req.body.username;
  const rank = req.body.rank;

  // اعتبارسنجی نام کاربری
  if (!gamertag || typeof gamertag !== 'string' || gamertag.length > 16) {
    return res.status(400).json({ success: false, message: 'Invalid username.' });
  }

  // اعتبارسنجی رنک‌های مجاز
  const allowedRanks = ['Elite', 'ultra', 'Legend'];
  const cleanRank = allowedRanks.find(r => r.toLowerCase() === (rank || '').toLowerCase());

  if (!cleanRank) {
    return res.status(400).json({ success: false, message: 'Invalid rank selected.' });
  }

  // پاکسازی کاراکترهای اضافه
  const cleanUsername = gamertag.replace(/[^a-zA-Z0-9_]/g, '');

  // ساخت دستور دقیق کنسول و اضافه به صف
  const command = `ranks setrank "${cleanUsername}" ${cleanRank} 30d`;
  commandQueue.push({ id: Date.now(), cmd: command });

  console.log(`[Queue] Added command: ${command}`);

  return res.json({
    success: true,
    message: `درخواست خرید رنک ${cleanRank} برای ${cleanUsername} ثبت شد و به زودی اعمال می‌شود.`
  });
};

app.post('/api/buy-rank', handleRankPurchase);
app.post('/api/buy', handleRankPurchase);

// ۳. مسیری که پلاگین پاکت‌ماین دستورات را تحویل می‌گیرد
app.get('/api/get-commands', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const pending = [...commandQueue];
  commandQueue = []; // بعد از تحویل به سرور، صف خالی می‌شود
  res.json({ commands: pending });
});

// پورت سرور در Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
