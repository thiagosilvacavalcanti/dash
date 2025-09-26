// Netlify Function ESM
import fetch from "node-fetch";

export async function handler(event) {
  try {
    // Remove o prefixo da function e monta URL real da API
    const upstreamPath = event.path.replace("/.netlify/functions/proxy", "");
    const url = "https://api.beteltecnologia.com" + upstreamPath + (event.rawQuery ? `?${event.rawQuery}` : "");

    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "access-token": process.env.BETEL_ACCESS_TOKEN,
        "secret-access-token": process.env.BETEL_SECRET_TOKEN
      },
      body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: text
    };
  } catch (e) {
    console.error("Proxy error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Proxy error", details: String(e?.message || e) })
    };
  }
}
