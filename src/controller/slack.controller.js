import axios from "axios";

/**
 * Get all Slack users from a workspace
 */
export const getSlackUsers = async (accessToken) => {
  try {
    const response = await axios.get("https://slack.com/api/users.list", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    // Return only real users (filter out bots and deactivated accounts)
    return response.data.members.filter(
      (member) => !member.is_bot && member.id !== "USLACKBOT" && !member.deleted && member.profile.email==="faizan@wintactix.com"
    );
  } catch (err) {
    console.error("Error fetching Slack users:", err.message);
    return [];
  }
};

/**
 * Send a message to a Slack user via bot
 */
export const sendSlackMessage = async (accessToken, userId, text) => {
  try {
    const response = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: userId, // DM the user
        text,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data;
  } catch (err) {
    console.error(`Error sending message to ${userId}:`, err.message);
  }
};

export const broadcastMessageToWorkspace = async (accessToken, message) => {
  const users = await getSlackUsers(accessToken);

  for (const user of users) {
    await sendSlackMessage(accessToken, user.id, message);
  }

  console.log(`✅ Message sent to ${users.length} users`);
};
