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
app.post('/api/buy-rank', async (req, res) => {
    let { username, rank } = req.body;

    if (!username || !rank) {
        return res.status(400).json({ success: false, message: 'نام کاربری یا رنک وارد نشده است.' });
    }

    const cleanUsername = username.trim();
    const cleanRank = rank.trim();

    console.log(`درخواست خرید -> کاربر: ${cleanUsername} | رنک: ${cleanRank}`);

    try {
        const rcon = await Rcon.connect({
            host: process.env.RCON_HOST || 'sv2.tgmc.ir',
            port: parseInt(process.env.RCON_PORT || '19132', 10),
            password: process.env.RCON_PASSWORD || 'commandkir94111504l',
            timeout: 5000
        });

        const response = await rcon.send(`setrank "${cleanUsername}" ${cleanRank}`);
        await rcon.end();

        console.log(`پاسخ RCON: ${response}`);
        return res.json({ success: true, message: `رنک ${cleanRank} با موفقیت روی اکانت ${cleanUsername} اعمال شد!` });

    } catch (err) {
        console.error('خطای RCON:', err);
        return res.status(500).json({ success: false, message: 'خطای ارتباط با سرور (RCON ناموفق بود).' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
