const express = require('express');
const path = require('path');
const bedrock = require('bedrock-protocol');
const { RCON } = require('rcon-client');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مشخصات سرور پاکت‌ماین
const MINECRAFT_HOST = 'sv2.tgmc.ir';
const MINECRAFT_PORT = 27235;

// سیستم کش هوشمند (به‌روزرسانی حداکثر هر ۵ ثانیه برای سبکی و سرعت بالا)
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

// مسیر API وضعیت و تعداد پلیرهای آنلاین
app.get('/api/server-status', async (req, res) => {
  const status = await fetchServerStatus();
  res.json(status);
});

// مسیر خرید رنک و اجرای RCON (متصل به RankSystem)
app.post('/api/buy-rank', async (req, res) => {
    const { gamertag, rank } = req.body;

    // بررسی نام کاربری
    if (!gamertag || typeof gamertag !== 'string' || gamertag.trim() === '') {
        return res.status(400).json({ success: false, message: 'Invalid gamertag.' });
    }

    // رنک‌های مجاز دقیقاً مطابق پلاگین RankSystem شما
    const validRanks = ['ultra', 'Elite', 'Legend'];
    if (!validRanks.includes(rank)) {
        return res.status(400).json({ success: false, message: 'Invalid rank selected.' });
    }

    try {
        // اتصال به RCON با متغیرهای محیطی Render
        const rcon = new RCON({
            host: process.env.RCON_HOST,
            port: parseInt(process.env.RCON_PORT || '19132'),
            password: process.env.RCON_PASSWORD
        });

        await rcon.connect();

        // اجرای دستور روی کنسول سرور ماینکرفت
        const commandResponse = await rcon.send(`ranksystem set "${gamertag.trim()}" ${rank}`);
        
        await rcon.end();

        console.log(`Rank command sent for ${gamertag}: ${rank} -> Response: ${commandResponse}`);
        return res.json({ success: true, message: 'Rank delivered successfully!' });

    } catch (error) {
        console.error('RCON Error:', error);
        return res.status(500).json({ success: false, message: 'Server connection error (RCON failed).' });
    }
});

// اجرای سرور
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
