const axios = require('axios');

/**
 * This is the core transformation logic.
 * It builds the message payload for Discord.
 *
 * @param {object} notionPayload The incoming JSON body from your Notion Automation.
 * @returns {object} The message payload (content and embed)
 */
function transformPayload(notionPayload) {
  // --- ADD YOUR 10 USERS HERE ---
  const USER_ID_MAP = {
    // "Full Name from Notion": "Discord User ID String"
    "Brody Moore": "PASTE_BRODY_DISCORD_ID_HERE",
    "User Two Name": "101740777587089408",
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
  const assigneeName = pageData?.properties?.Assignee?.people?.[0]?.name;
  const pageUrl = pageData?.url;

  const discordUserId = USER_ID_MAP[assigneeName]; // Find the ID from the map

  if (!discordUserId) {
    console.warn(`No Discord User ID found for Notion user: ${assigneeName}`);
    return null; // Return null if no user is found
  }

  // Build the message payload
  const messagePayload = {
    content: `Hello ${assigneeName}! A Notion task assigned to you was just updated:`,
    embeds: [
      {
        title: pageName || 'Task Update',
        url: pageUrl, // Makes the title a clickable link
        description: `**Task:** ${pageName || 'Unknown Task'}`,
        fields: [
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
  
  return { discordUserId, messagePayload };
}

/**
 * Helper function to send the DM
 */
async function sendDm(botToken, userId, payload) {
  const discordApi = axios.create({
    baseURL: 'https://discord.com/api/v10',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    // 1. Create a DM channel with the user
    console.log(`Creating DM channel with user ${userId}...`);
    const dmChannelResponse = await discordApi.post('/users/@me/channels', {
      recipient_id: userId
    });
    const channelId = dmChannelResponse.data.id;
    console.log(`DM channel created: ${channelId}`);

    // 2. Send the message to that channel
    await discordApi.post(`/channels/${channelId}/messages`, payload);
    console.log(`Successfully sent DM to user ${userId}`);

  } catch (error) {
    console.error('Failed to send DM:');
    if (error.response) {
      console.error('Discord API Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw new Error('Failed to send DM.'); // Re-throw to be caught by main handler
  }
}

/**
 * This is the main serverless function handler.
 * Vercel will run this code every time your /api/transform URL is called.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error('DISCORD_BOT_TOKEN is not set.');
    res.status(500).json({ error: 'Server configuration error.' });
    return;
  }
  
  console.log('Received payload from Notion...');

  try {
    // 1. Transform the payload
    const transformResult = transformPayload(req.body);

    if (!transformResult) {
      // No user was found in the map, or assignee was blank.
      res.status(200).json({ message: 'Payload received, but no matching user to DM.' });
      return;
    }
    
    const { discordUserId, messagePayload } = transformResult;

    // 2. Send the DM
    await sendDm(botToken, discordUserId, messagePayload);

    // 3. Send a success response back to Notion
    res.status(200).json({ message: 'DM sent successfully.' });

  } catch (error) {
    console.error('Error processing webhook:', error.message);
    // Unlike the webhook, we won't send a debug message back to Discord
    // We will just log it in Vercel.
    res.status(500).json({ error: 'Failed to process webhook.' });
  }
};
