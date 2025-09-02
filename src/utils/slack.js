import { WebClient } from "@slack/web-api";

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendSlackMessage(slackId, message) {
  try {
    await slackClient.chat.postMessage({
      channel: slackId,
      text: message,
    });
    console.log("Message sent!");
  } catch (err) {
    console.error("Error sending Slack message", err);
  }
}