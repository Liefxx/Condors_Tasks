const axios = require('axios');

/**
 * This is a minimal test handler.
 * It will log to Vercel and try to send one simple message to Discord.
 */
module.exports = async (req, res) => {
  // 1. Log to Vercel
  console.log('HELLO WORLD FUNCTION WAS CALLED');

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!discordWebhookUrl) {
    console.error('DISCORD_WEBHOOK_URL IS NOT SET');
    res.status(500).json({ error: 'Server config missing URL.' });
    return;
  }

  // 2. Try to send a simple "hello" to Discord
  try {
    const payload = {
      content: "Hello from Vercel! Your test function is running."
    };
    
    await axios.post(discordWebhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // 3. Send success back to Notion
    res.status(200).json({ message: 'Test message sent.' });

  } catch (error) {
    // 4. If it fails, log the error
    console.error('TEST FAILED:', error.message);
    if (error.response) {
      console.error('Discord API Error:', error.response.data);
    }
    res.status(500).json({ error: 'Test failed.' });
  }
};
