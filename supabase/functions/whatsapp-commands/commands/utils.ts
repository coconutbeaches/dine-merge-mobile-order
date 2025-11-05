const WHAPI_GATEWAY = "https://gate.whapi.cloud";

type ReactionPayload = {
  emoji: string;
};

export async function reactToMessage(messageId: string, emoji: string): Promise<void> {
  const token = Deno.env.get("WHAPI_TOKEN");

  if (!token) {
    console.warn("WHAPI_TOKEN is not configured; skipping reaction.");
    return;
  }

  try {
    const response = await fetch(`${WHAPI_GATEWAY}/messages/${messageId}/reaction`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ emoji } as ReactionPayload),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("❌ Reaction failed:", details);
      return;
    }

    console.log(`✅ Reacted to message ${messageId} with ${emoji}`);
  } catch (error) {
    console.error("Reaction error:", error);
  }
}
