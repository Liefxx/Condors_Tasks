// We'll use 'axios' to send the data to Discord.
// Make sure to add it to your package.json!
const axios = require('axios');

/**
 * This is the core transformation logic.
 * It takes the JSON from Notion (req.body) and turns it into
 * the JSON format Discord expects.
 *
 * YOU WILL NEED TO CUSTOMIZE THIS FUNCTION
 * based on the "Payload" you configure in your Notion Automation.
 *
 * @param {object} notionPayload The incoming JSON body from your Notion Automation.
 * @returns {object} The JSON payload ready to be sent to Discord.
 */
function transformPayload(notionPayload) {
  // --- Example Transformation ---
  // Let's assume your Notion Automation sends a payload like this:
  // {
  //   "pageName": "Deploy the app",
  //   "status": "Done",
  //   "pageUrl": "https://www.notion.so/..."
  // }
  //
  // We will transform it into a Discord Embed:

  const { pageName, status, pageUrl } = notionPayload;

  // You can customize this Discord payload however you like.
  // See the Discord webhook guide for all the options:
  // https://birdie0.github.io/discord-webhooks-guide/discord_webhook.html
  return {
    // You can set a simple text message here
    content: `Notion Page Updated: **${pageName || 'Unknown Page'}**`,
    embeds: [
      {
        title: pageName || 'Page Update',
        url: pageUrl, // Makes the title a clickable link
        description: `The page status was just updated.`,
        fields: [
          {
            name: 'New Status',
            value: status || 'N/A',
            inline: true,
          },
          {
            name: 'Page URL',
            value: pageUrl ? `[Click to view](${pageUrl})` : 'No URL provided',
            inline: true,
          },
        ],
        color: 5814783, // This is a hex code for a nice blue
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * This is the main serverless function handler.
 * Vercel will run this code every time your /api/transform URL is called.
 */
module.exports = async (req, res) => {
  // 1. Check if this is a POST request (which Notion webhooks are)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // 2. Get the Discord Webhook URL from environment variables
  //    We do this so your secret URL isn't saved in your code.
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    console.error('DISCORD_WEBHOOK_URL is not set.');
    res.status(500).json({ error: 'Server configuration error.' });
    return;
  }

  try {
    // 3. Log the incoming body from Notion (useful for debugging!)
    //    You can check your Vercel logs to see the exact data Notion is sending.
    console.log('Received payload from Notion:', JSON.stringify(req.body, null, 2));

    // 4. Transform the payload
    const discordPayload = transformPayload(req.body);

    // 5. Send the new payload to Discord
    await axios.post(discordWebhookUrl, discordPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // 6. Send a success response back to Notion
    res.status(200).json({ message: 'Payload sent to Discord successfully.' });

  } catch (error) {
    console.error('Error processing webhook:', error.message);
    // Log error details if available
    if (error.response) {
      console.error('Discord API Error:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to send payload to Discord.' });
  }
};
