import { useEffect, useState } from "react";

// ====== Helpers ======
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions/proxy'
  : '/.netlify/functions/proxy';

function toNumber(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const toBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

function currentMonthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const first = `${y}-${m}-01`;
  const last = `${y}-${m}-${String(new Date(y, d.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  return { first, last };
}

// ====== Core de soma por tipo ======
async function fetchTotalsForType({ first, last, lojaId, tipo }) {
  let pagina = 1;
  let totalTipo = 0;
  const porVendedor = new Map();
  let nomeLoja = "";

  while (true) {
    const url = `${API_BASE}/vendas?data_inicio=${first}&data_fim=${last}&pagina=${pagina}&loja_id=${lojaId}&tipo=${tipo}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    const json = await res.json();

    const data = Array.isArray(json?.data) ? json.data : [];
    for (const r of data) {
      if (!nomeLoja && r?.nome_loja) nomeLoja = r.nome_loja;

      // valor: prioridade -> valor_total > valor_produtos > soma(pagamentos)
      let valor = 0;
      if (r?.valor_total) {
        valor = toNumber(r.valor_total);
      } else if (r?.valor_produtos) {
        valor = toNumber(r.valor_produtos);
      } else if (Array.isArray(r?.pagamentos) && r.pagamentos.length) {
        valor = r.pagamentos.reduce((acc, x) => acc + toNumber(x?.pagamento?.valor), 0);
      }

      totalTipo += valor;

      const vendedor = (r?.nome_vendedor || "Sem vendedor").trim();
      porVendedor.set(vendedor, (porVendedor.get(vendedor) || 0) + valor);
    }

    const totalPaginas = json?.meta?.total_paginas ?? 1;
    if (pagina >= totalPaginas) break;
    pagina += 1;
  }

  return { totalTipo, porVendedor, nomeLoja };
}

async function getLojaTotals(lojaId, tipos = ["produto", "vendas_balcao"]) {
  const { first, last } = currentMonthRange();

  const results = await Promise.all(
    tipos.map((tipo) => fetchTotalsForType({ first, last, lojaId, tipo }))
  );

  let nomeLoja = results.find((r) => r.nomeLoja)?.nomeLoja || "";
  const totalPorTipo = {};
  const porVendedor = new Map();

  results.forEach((r, idx) => {
    const tipo = tipos[idx];
    totalPorTipo[tipo] = r.totalTipo;

    // merge por vendedor
    r.porVendedor.forEach((val, vend) => {
      porVendedor.set(vend, (porVendedor.get(vend) || 0) + val);
    });
  });

  const totalCombinado = Object.values(totalPorTipo).reduce((a, b) => a + b, 0);

  return { nomeLoja, totalPorTipo, totalCombinado, porVendedor };
}

// ====== Componente ======
export default function App() {
  const [loading, setLoading] = useState(false);
  const [lojaA, setLojaA] = useState(null);
  const [lojaB, setLojaB] = useState(null);

  // TROQUE PELOS SEUS IDs DE LOJA
  const lojaIdA = 338180; // Matriz (exemplo)
  const lojaIdB = 428885; // Loja 2 (exemplo)

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [a, b] = await Promise.all([getLojaTotals(lojaIdA), getLojaTotals(lojaIdB)]);
        setLojaA(a);
        setLojaB(b);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { first, last } = currentMonthRange();

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginBottom: 4 }}>Vendas do mês</h2>
      <div style={{ color: "#666", marginBottom: 16 }}>
        Período: <b>{first}</b> a <b>{last}</b>
      </div>

      {loading && <p>Carregando…</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {[lojaA, lojaB].map((loja, idx) => (
          <div key={idx} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{loja?.nomeLoja || (idx === 0 ? "Loja A" : "Loja B")}</h3>

            {loja && (
              <>
                <h4>Totais</h4>
                <ul>
                  <li>
                    Produto: <b>{toBRL(loja.totalPorTipo?.produto || 0)}</b>
                  </li>
                  <li>
                    Vendas de balcão: <b>{toBRL(loja.totalPorTipo?.vendas_balcao || 0)}</b>
                  </li>
                  <li>
                    Total combinado: <b>{toBRL(loja.totalCombinado || 0)}</b>
                  </li>
                </ul>

                <h4>Por funcionário</h4>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                        Funcionário
                      </th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>
                        Total vendido
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(loja.porVendedor.entries()).map(([vend, val]) => (
                      <tr key={vend}>
                        <td style={{ padding: 8 }}>{vend}</td>
                        <td style={{ padding: 8, textAlign: "right" }}>{toBRL(val)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
