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
    let { username, rank } = req.body;

    if (!username || !rank) {
        return res.status(400).json({ success: false, message: 'Invalid username or rank selected.' });
    }

    const cleanUsername = username.replace(/[^a-zA-Z0-9_ ]/g, '').trim();
    const cleanRank = rank.trim(); // هر رنکی که از سایت بیاید را بدون محدودیت قبول می‌کند

    try {
        const rcon = await Rcon.connect({
            host: process.env.RCON_HOST || 'sv2.tgmc.ir',
            port: parseInt(process.env.RCON_PORT || '19132', 10),
            password: process.env.RCON_PASSWORD || '######################',
            timeout: 5000
        });

        // اجرای دستور تنظیم رنک در RankSystem
        const response = await rcon.send(`setrank "${cleanUsername}" ${cleanRank}`);
        await rcon.end();

        console.log(`RCON Response: ${response}`);
        return res.json({ success: true, message: `Rank ${cleanRank} was successfully applied to ${cleanUsername}!` });

    } catch (err) {
        console.error('RCON Error:', err);
        return res.status(500).json({ success: false, message: 'Server connection error (RCON failed).' });
    }
});



// اجرای سرور
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
