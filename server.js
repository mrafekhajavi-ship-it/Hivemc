// یک آرایه برای نگهداری صف دستورات
let commandQueue = [];

// یک رمز محرمانه بین سایت و پلاگین شما (برای امنیت)
const SECRET_KEY = "HIVE_SECRET_2026";

// مسیر خرید در سایت: وقتی کاربر دکمه خرید را می‌زند
app.post('/api/buy', (req, res) => {
  const { username, rank } = req.body;
  if (!username || !rank) {
    return res.status(400).json({ success: false, message: 'Invalid data' });
  }

  // دستور پاکت‌ماین را آماده می‌کنیم و در صف می‌گذاریم
  const cmd = `ranks setrank "${username}" ${rank} 30d`;
  commandQueue.push({ id: Date.now(), cmd });

  return res.json({ success: true, message: 'درخواست با موفقیت ثبت شد و به زودی روی سرور اعمال می‌شود.' });
});

// این آدرس را فقط پلاگین ماینکرفت فراخوانی می‌کند
app.get('/api/get-commands', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // ارسال دستورات به پلاگین و خالی کردن صف
  const pending = [...commandQueue];
  commandQueue = [];
  res.json({ commands: pending });
});
