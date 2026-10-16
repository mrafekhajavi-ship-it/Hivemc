const express = require('express');
const path = require('path');
const bedrock = require('bedrock-protocol');
const { Rcon } = require('rcon-client');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مشخصات سرور پاکت‌ماین
const MINECRAFT_HOST = 'sv2.tgmc.ir';
const MINECRAFT_PORT = 27235;

// سیستم کش هوشمند وضعیت سرور
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
      maxPlayers: res.playersMax || 0,
      motd: res.motd ? res.motd.clean : ''
    };
    lastPingTime = now;
  } catch (err) {
    cachedStatus = {
      online: false,
      currentPlayers: 0,
      maxPlayers: 0,
      error: 'Server unreachable'
    };
  }
  return cachedStatus;
}

app.get('/api/server-status', async (req, res) => {
  const status = await fetchServerStatus();
  res.json(status);
});

// مسیر خرید رنک بدون هیچ‌گونه شرط اضافی و خطای دستوری

// در فایل server.js، بخش مربوط به درخواست خرید رنک:
app.post('/api/buy-rank', async (req, res) => {
  const { gamertag, rank } = req.body;

  // اعتبارسنجی نام کاربری و نام رنک‌های مجاز
  if (!gamertag || typeof gamertag !== 'string' || gamertag.length > 16) {
    return res.status(400).json({ success: false, message: 'Invalid username.' });
  }

  // نام رنک‌های مجاز مطابق دکمه‌های سایت
  const allowedRanks = ['Elite', 'ultra', 'Legend'];
  const cleanRank = allowedRanks.find(r => r.toLowerCase() === (rank || '').toLowerCase());
  
  if (!cleanRank) {
    return res.status(400).json({ success: false, message: 'Invalid rank selected.' });
  }

  // پاکسازی نام کاربری برای جلوگیری از کاراکترهای اضافی
  const cleanUsername = gamertag.replace(/[^a-zA-Z0-9_]/g, '');

  try {
    const rcon = new Rcon({
      host: process.env.RCON_HOST || 'sv2.tgmc.ir',
      port: parseInt(process.env.RCON_PORT || '27235'),
      password: process.env.RCON_PASSWORD
    });

    await rcon.connect();

    // ارسال دستور دقیق طبق تست شما با مدت ۳۰ روز
    const command = `ranks setrank "${cleanUsername}" ${cleanRank} 30d`;
    const rconResponse = await rcon.send(command);
    
    await rcon.end();

    return res.json({ 
      success: true, 
      message: `Rank ${cleanRank} successfully applied to ${cleanUsername} for 30 days!` 
    });

  } catch (error) {
    console.error('RCON Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to connect to server console. Make sure player is online!' 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
