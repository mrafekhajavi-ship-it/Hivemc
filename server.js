const express = require('express');
const path = require('path');
const bedrock = require('bedrock-protocol');

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

// اجرای سرور
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Hivemc Server running on port ${PORT}`);
});
