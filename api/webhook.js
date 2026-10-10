const { bot } = require('../core');
const linksHandler = require('./links');

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

  const url = req.url || '';
  const accept = req.headers.accept || '';

  // If visiting /links, or if browser navigation, serve the rich Link Hub dashboard
  if (url.includes('/links') || accept.includes('text/html')) {
    return linksHandler(req, res);
  }

  // GET request: friendly health check in JSON
  return res.status(200).json({
    status: 'online',
    message: 'Telegram Bypass Bot Webhook is running on Vercel!',
    time: new Date().toISOString()
  });
};
