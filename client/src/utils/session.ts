export async function createGuestSession() {
  try {
    const existingToken = localStorage.getItem("SESSION_TOKEN");
    if (existingToken) {
      // يوجد جلسة حالية محفوظة
      return existingToken;
    }

    const response = await fetch("/api/guest-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: localStorage.getItem("DEVICE_ID") || crypto.randomUUID(),
      }),
    });

    if (!response.ok) {
      console.error("Failed to create guest session:", response.statusText);
      return null;
    }

    const { sessionToken, deviceId } = await response.json();

    localStorage.setItem("SESSION_TOKEN", sessionToken);
    localStorage.setItem("DEVICE_ID", deviceId);

    return sessionToken;
  } catch (err) {
    console.error("Guest session creation error:", err);
    return null;
  }
}
