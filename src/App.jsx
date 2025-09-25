import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");;

function monthRange(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const fmt = (x) => x.toISOString().slice(0, 10);
  return { first: fmt(first), last: fmt(last) };
}

function toNumber(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const toBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

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
      if (!nomeLoja && r?.nome_loja) nomeLoja = r.nome_loja; // captura a primeira vez
      const vendedor = (r?.nome_vendedor || "Sem vendedor").trim();
      const valor = toNumber(r?.valor_total ?? r?.valor_produtos ?? r?.valor ?? 0);

      totalTipo += valor;
      porVendedor.set(vendedor, (porVendedor.get(vendedor) || 0) + valor);
    }

    const totalPaginas = json?.meta?.total_paginas ?? 1;
    if (pagina >= totalPaginas) break;
    pagina += 1;
  }

  return { totalTipo, porVendedor, nomeLoja };
}

export default function TotaisVendasMes() {
  const [{ first, last }] = useState(() => monthRange());
  const lojaId = 338180;

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [totalProduto, setTotalProduto] = useState(0);
  const [totalBalcao, setTotalBalcao] = useState(0);
  const [porVendedorComb, setPorVendedorComb] = useState([]);
  const [nomeLoja, setNomeLoja] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro("");
      try {
        const [produto, balcao] = await Promise.all([
          fetchTotalsForType({ first, last, lojaId, tipo: "produto" }),
          fetchTotalsForType({ first, last, lojaId, tipo: "vendas_balcao" }),
        ]);

        setTotalProduto(produto.totalTipo);
        setTotalBalcao(balcao.totalTipo);

        // se não achou no produto, pega do balcão
        setNomeLoja(produto.nomeLoja || balcao.nomeLoja || "");

        const m = new Map(produto.porVendedor);
        for (const [vend, val] of balcao.porVendedor.entries()) {
          m.set(vend, (m.get(vend) || 0) + val);
        }
        const arr = [...m.entries()]
          .map(([vendedor, total]) => ({ vendedor, total }))
          .sort((a, b) => b.total - a.total);
        setPorVendedorComb(arr);
      } catch (e) {
        console.error(e);
        setErro(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [first, last, lojaId]);

  const totalGeral = useMemo(() => totalProduto + totalBalcao, [totalProduto, totalBalcao]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2>Vendas do mês</h2>
      {nomeLoja && (
        <h4 style={{ marginTop: -8, marginBottom: 16, color: "#666" }}>{nomeLoja}</h4>
      )}
      <p>
        Período: <b>{first}</b> a <b>{last}</b>
      </p>
      {loading && <p>Calculando…</p>}
      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      <h3>Totais</h3>
      <ul>
        <li>Produto: <b>{toBRL(totalProduto)}</b></li>
        <li>Vendas de balcão: <b>{toBRL(totalBalcao)}</b></li>
        <li>Total combinado: <b>{toBRL(totalGeral)}</b></li>
      </ul>

      <h3 style={{ marginTop: 16 }}>Por funcionário</h3>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 720 }}>
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
          {porVendedorComb.map((r) => (
            <tr key={r.vendedor}>
              <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>{r.vendedor}</td>
              <td style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #f0f0f0" }}>
                {toBRL(r.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
