const axios = require('axios');

/**
 * This is the core transformation logic.
 * It takes the FULL, complex JSON from Notion (req.body) and turns it into
 * the JSON format Discord expects.
 *
 * --- YOU MUST CUSTOMIZE THIS ---
 *
 * This function is making a GUESS that your database has properties
 * named exactly "Name" and "Status".
 *
 * If your properties are "Task Name" or "Assignee", you MUST change
 * the lines below (e.g., `notionPayload.properties['Task Name']`).
 *
 * Check your Vercel logs to see the *exact* JSON Notion sends.
 *
 * @param {object} notionPayload The incoming JSON body from your Notion Automation.
 * @returns {object} The JSON payload ready to be sent to Discord.
 */
function transformPayload(notionPayload) {
  // --- Example Transformation ---
  // We parse the complex default Notion payload.
  // We use optional chaining (?.) to avoid errors if a property is missing.

  // --- 1. Get the Page Name ---
  // We're GUESSING your "Name" property is called "Name".
  // If it's "Task", change this to: notionPayload.properties?.Task?.title?.[0]?.plain_text;
  const pageName = notionPayload.properties?.Name?.title?.[0]?.plain_text;

  // --- 2. Get the Status ---
  // We're GUESSING your "Status" property is called "Status".
  const status = notionPayload.properties?.Status?.status?.name;
  
  // --- 3. Get the Page URL ---
  // This one is usually reliable.
  const pageUrl = notionPayload.url;

  // Now we build the Discord message
  return {
    content: `Notion Page Updated: **${pageName || 'Unknown Page'}**`,
    embeds: [
      {
        title: pageName || 'Page Update',
        url: pageUrl, // Makes the title a clickable link
        description: `A page was just updated in your Notion database.`,
        fields: [
          {
            name: 'Status',
            value: status || 'N/A', // Shows the status, or "N/A" if not found
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
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    console.error('DISCORD_WEBHOOK_URL is not set.');
    res.status(500).json({ error: 'Server configuration error.' });
    return;
  }

  try {
    // 3. Log the incoming body from Notion (useful for debugging!)
    //    This is CRITICAL. You will check your Vercel logs to see
    //    the exact data Notion is sending.
    console.log('Received payload from Notion:', JSON.stringify(req.body, null, 2));

    // 4. Transform the payload
    //    We pass the *entire* body from Notion to our function.
    const discordPayload = transformPayload(req.body);

    // 5. Send the new payload to Discord
    await axios.post(discordWebhookUrl, discordPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    // 6. Send a success response back to Notion
    res.status(200).json({ message: 'Payload sent to Discord successfully.' });

  } catch (error) {
    console.error('Error processing webhook:', error.message);
    if (error.response) {
      console.error('Discord API Error:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to send payload to Discord.' });
  }
};

