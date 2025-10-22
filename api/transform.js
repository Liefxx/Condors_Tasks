const axios = require('axios');

/**
 * This is the core transformation logic.
 * It takes the FULL, complex JSON from Notion (req.body) and turns it into
 * the JSON format Discord expects.
 *
 * This is a GUESS based on your properties: "Task" and "Assignee".
 *
 * @param {object} notionPayload The incoming JSON body from your Notion Automation.
 * @returns {object} The JSON payload ready to be sent to Discord.
 */
function transformPayload(notionPayload) {
  // --- Example Transformation ---

  // --- 1. Get the Page Name (Guessing "Task") ---
  const pageName = notionPayload.properties?.Task?.title?.[0]?.plain_text;

  // --- 2. Get the Assignee (Guessing "Assignee") ---
  const assignee = notionPayload.properties?.Assignee?.people?.[0]?.name;
  
  // --- 3. Get the Page URL ---
  const pageUrl = notionPayload.url;

  // Now we build the Discord message
  return {
    content: `Notion Task Updated: **${pageName || 'Unknown Task'}**`,
    embeds: [
      {
        title: pageName || 'Task Update',
        url: pageUrl, // Makes the title a clickable link
        description: `A task was just updated in your Notion database.`,
        fields: [
          {
            name: 'Assignee',
            value: assignee || 'N/A', // Shows the assignee, or "N/A"
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
 * Vercel will run this code every time your /api/handler URL is called.
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
    // This is the log that should be appearing in Vercel
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
    if (error.response) {
      console.error('Discord API Error:', error.response.data);
    }

    // --- DEBUGGING CODE ---
    // If the above fails, this code will send a debug message *to* Discord
    try {
      const debugPayload = {
        content: "⚠️ **DEBUG: Notion Webhook Failed**",
        embeds: [
          {
            title: "Error Message",
            description: error.message || "An unknown error occurred.",
            color: 16711680, // Red
            fields: [
              {
                name: "Discord API Error (if any)",
                // **THIS IS THE FIXED LINE**
                value: (error.response ? JSON.stringify(error.response.data) : "N/A")
              },
              {
                name: "Full Notion Payload (First 1000 chars)",
                value: "```json\n" + JSON.stringify(req.body, null, 2).substring(0, 1000) + "\n```"
              }
            ]
          }
        ]
      };
      await axios.post(discordWebhookUrl, debugPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (debugError) {
      console.error("Failed to send debug message:", debugError.message);
    }
    // --- END DEBUGGING CODE ---

    // Finally, send the error response back to Notion
    res.status(500).json({ error: 'Failed to send payload to Discord.' });
  }
};
