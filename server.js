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
      port: parseInt(process.env.RCON_PORT || '19132'),
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
