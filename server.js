const express = require('express');
const path = require('path');
const bedrock = require('bedrock-protocol');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مشخصات سرور پاکت‌ماین برای نمایش وضعیت آنلاین در سایت
const MINECRAFT_HOST = 'sv2.tgmc.ir';
const MINECRAFT_PORT = 27235;

// سیستم کش وضعیت سرور (برای سرعت و جلوگیری از کندی)
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
      timeout: 3000
    });

    cachedStatus = {
      online: true,
      currentPlayers: res.playersOnline || 0,
      maxPlayers: res.maxPlayers || 20
    };
    lastPingTime = now;
  } catch (err) {
    cachedStatus = {
      online: false,
      currentPlayers: 0,
      maxPlayers: 0
    };
    lastPingTime = now;
  }

  return cachedStatus;
}

// ۱. مسیر نمایش وضعیت آنلاین بودن سرور به سایت
app.get('/api/status', async (req, res) => {
  const status = await fetchServerStatus();
  res.json(status);
});

// صف دستورات برای پلاگین سرور
let commandQueue = [];
const SECRET_KEY = "HIVE_SECRET_2026";

// ۲. مسیر خرید رنک در سایت
app.post('/api/buy', (req, res) => {
  try {
    const { username, rank } = req.body;
    if (!username || !rank) {
      return res.status(400).json({ success: false, message: 'لطفاً نام کاربری و رنک را به درستی وارد کنید.' });
    }

    // اضافه کردن دستور به صف
    const cmd = `ranks setrank "${username}" ${rank} 30d`;
    commandQueue.push({ id: Date.now(), cmd });

    return res.json({ 
      success: true, 
      message: 'درخواست خرید ثبت شد و طی چند ثانیه در سرور اعمال می‌شود.' 
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'خطای داخلی سرور' });
  }
});

// ۳. مسیری که پلاگین پاکت‌ماین صدا می‌زند
app.get('/api/get-commands', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const pending = [...commandQueue];
  commandQueue = []; // بعد از تحویل به پلاگین صف را خالی کن
  res.json({ commands: pending });
});

// پورت سرور در رندر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
