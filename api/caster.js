const axios = require('axios');

/**
 * USER MAPPING
 * You can copy the same list from your other file.
 */
const USER_ID_MAP = {
    "Brody Moore": "101740777587089408",
    "User Two Name": "PASTE_USER_TWO_ID_HERE",
    // ... paste your full list here
};

function transformPayload(notionPayload) {
  const pageData = notionPayload.data;
  if (!pageData) return null;

  // --- GET PROPERTIES ---
  // Based on your screenshot: Name, Caster, Date, Game
  
  // 1. Name
  const broadcastName = pageData.properties?.Name?.title?.[0]?.plain_text || "Untitled Broadcast";

  // 2. Caster (The person to DM)
  // We take the first person listed in the 'Caster' property
  const casterName = pageData.properties?.Caster?.people?.[0]?.name;

  // 3. Date
  const dateStart = pageData.properties?.Date?.date?.start;
  // Format the date nicely if it exists
  const formattedDate = dateStart ? new Date(dateStart).toDateString() : "No Date Set";

  // 4. Game (Assuming it's a Select or Relation)
  // We try to get the name/title safely
  const gameName = pageData.properties?.Game?.select?.name 
                || pageData.properties?.Game?.relation?.[0]?.id // If relation, we might only get ID without extra API calls
                || "Unknown Game";

  const pageUrl = pageData.url;

  // --- FIND DISCORD USER ---
  const discordUserId = USER_ID_MAP[casterName];

  if (!discordUserId) {
    console.warn(`No Discord User ID found for Caster: ${casterName}`);
    return null;
  }

  // --- BUILD MESSAGE ---
  const messagePayload = {
    content: `Hi ${casterName}, you have been assigned to a broadcast!`,
    embeds: [
      {
        title: "🎙️ Casting Assignment",
        url: pageUrl,
        color: 10181046, // A purple/pink color for casters
        fields: [
          { name: "Broadcast Name", value: broadcastName, inline: false },
          { name: "Game", value: gameName, inline: true },
          { name: "Date", value: formattedDate, inline: true },
          { name: "Notes", value: `[Click to view details in Notion](${pageUrl})`, inline: false }
        ],
        footer: { text: "Good luck with the cast!" }
      }
    ]
  };
  
  return { discordUserId, messagePayload };
}

// --- HELPER: SEND DM (Same as before) ---
async function sendDm(botToken, userId, payload) {
  const discordApi = axios.create({
    baseURL: 'https://discord.com/api/v10',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    const dmChannelResponse = await discordApi.post('/users/@me/channels', { recipient_id: userId });
    await discordApi.post(`/channels/${dmChannelResponse.data.id}/messages`, payload);
    console.log(`DM sent to ${userId}`);
  } catch (error) {
    console.error('Failed to send DM:', error.response?.data || error.message);
    throw new Error('Failed to send DM.'); 
  }
}

// --- MAIN HANDLER ---
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: 'Server config error.' });

  try {
    const result = transformPayload(req.body);
    if (!result) return res.status(200).json({ message: 'No matching user found to DM.' });

    await sendDm(botToken, result.discordUserId, result.messagePayload);
    res.status(200).json({ message: 'Caster notified!' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process webhook.' });
  }
};
