// netlify/functions/proxy.js
exports.handler = async (event) => {
  // remove o prefixo /api/ da rota para montar o destino
  const downstreamPath = event.path.replace(/^\/api\//, "");
  const qs = event.rawQuery ? `?${event.rawQuery}` : "";
  const url = `https://api.beteltecnologia.com/${downstreamPath}${qs}`;

  try {
    const res = await fetch(url, {
      method: event.httpMethod,
      headers: {
        "Content-Type": "application/json",
        "access-token": process.env.BETEL_ACCESS_TOKEN,
        "secret-access-token": process.env.BETEL_SECRET_TOKEN,
      },
      body:
        event.httpMethod === "GET" || event.httpMethod === "HEAD"
          ? undefined
          : event.body,
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
