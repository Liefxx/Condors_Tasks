const axios = require('axios');

/**
 * This is the core transformation logic.
 * It takes the FULL, complex JSON from Notion (req.body) and turns it into
 * the JSON format Discord expects.
 *
 * @param {object} notionPayload The incoming JSON body from your Notion Automation.
 * @returns {object} The JSON payload ready to be sent to Discord.
 */
function transformPayload(notionPayload) {
  // --- ADD YOUR 10 USERS HERE ---
  // 1. Find Discord User IDs (Enable Developer Mode in Discord, right-click user, "Copy User ID")
  const USER_ID_MAP = {
    // "Full Name from Notion": "Discord User ID String"
    "Brody Moore": "101740777587089408",
    "User Two Name": "PASTE_USER_TWO_ID_HERE",
    "User Three Name": "PASTE_USER_THREE_ID_HERE",
    "User Four Name": "PASTE_USER_FOUR_ID_HERE",
    "User Five Name": "PASTE_USER_FIVE_ID_HERE",
    "User Six Name": "PASTE_USER_SIX_ID_HERE",
    "User Seven Name": "PASTE_USER_SEVEN_ID_HERE",
    "User Eight Name": "PASTE_USER_EIGHT_ID_HERE",
    "User Nine Name": "PASTE_USER_NINE_ID_HERE",
    "User Ten Name": "PASTE_USER_TEN_ID_HERE"
  };
  // --------------------------

  const pageData = notionPayload.data; 
  const pageName = pageData?.properties?.Task?.title?.[0]?.plain_text;
  const assignee = pageData?.properties?.Assignee?.people?.[0]?.name;
  const pageUrl = pageData?.url;

  const discordUserId = USER_ID_MAP[assignee]; // Find the ID from the map
  const userTag = discordUserId ? `<@${discordUserId}>` : ''; // Create the <@...> tag

  return {
    content: `Notion Task Updated: **${pageName || 'Unknown Task'}** ${userTag}`, // Add the tag to the content
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
    // This is new: It tells Discord "Yes, I really mean to ping this user"
    allowed_mentions: {
      users: (discordUserId ? [discordUserId] : []) // Only allow pinging the specific user
    }
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

    res.status(500).json({ error: 'Failed to send payload to Discord.' });
  }
};
