const { bot } = require('../core');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const update = req.body;
      if (update) {
        await bot.handleUpdate(update);
      }
      return res.status(200).send('OK');
    } catch (err) {
      console.error('Error handling Telegram webhook update:', err);
      // Return 200 so Telegram does not continuously retry failed updates in a loop
      return res.status(200).send('Handled with error');
    }
  }

  // GET request: friendly health check in browser
  return res.status(200).json({
    status: 'online',
    message: 'Telegram Bypass Bot Webhook is running on Vercel!',
    time: new Date().toISOString()
  });
};
