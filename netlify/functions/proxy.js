// netlify/functions/proxy.js

export async function handler(event) {
  try {
    // remove prefixos possíveis do path
    const cleanedPath =
      (event.path || "")
        .replace(/^\/\.netlify\/functions\/proxy/, "")
        .replace(/^\/api/, "") || "/";

    // remonta a query string (Netlify fornece em rawQuery)
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";

    const url = `https://api.beteltecnologia.com${cleanedPath}${qs}`;

    const res = await fetch(url, {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "access-token": process.env.BETEL_ACCESS_TOKEN,
        "secret-access-token": process.env.BETEL_SECRET_TOKEN,
      },
      body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      headers: {
        // repassa o content-type do upstream quando possível
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
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
