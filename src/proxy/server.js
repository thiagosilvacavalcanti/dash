import express from "express";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "5mb" }));

// em produção, trocaremos origin para o domínio do front
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

app.use("/api", async (req, res) => {
  try {
    const upstreamUrl =
      "https://api.beteltecnologia.com" + req.originalUrl.replace(/^\/api/, "");
    const body =
      req.method === "GET" || req.method === "HEAD" ? undefined : JSON.stringify(req.body ?? {});

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "access-token": process.env.BETEL_ACCESS_TOKEN,
        "secret-access-token": process.env.BETEL_SECRET_TOKEN,
      },
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(500).json({ error: String(e) });
  }
});

app.get("/", (_req, res) => res.send("OK"));
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ Proxy rodando")
);
