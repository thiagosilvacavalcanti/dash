import fetch from "node-fetch";

export async function handler(event) {
  try {
    const url = "https://api.beteltecnologia.com" + event.path.replace("/.netlify/functions/proxy", "");
    
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "access-token": process.env.BETEL_ACCESS_TOKEN,
        "secret-access-token": process.env.BETEL_SECRET_TOKEN,
      },
      body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      body: text,
    };
  } catch (error) {
    console.error("Proxy error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Proxy error", details: error.message }),
    };
  }
}
