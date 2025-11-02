const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  embeds?: Array<Record<string, unknown>>;
};

export async function sendDiscordNotification(payload: DiscordWebhookPayload) {
  if (!webhookUrl) {
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("Discord webhook failed:", response.status, message);
    }
  } catch (error) {
    console.error("Discord webhook error:", error);
  }
}
