import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api"; // proxy no Netlify

function Loja({ lojaId, titulo }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const first = "2025-09-01"; // datas fixas ou calculadas
      const last = "2025-09-30";
      try {
        const url = `${API_BASE}/vendas?data_inicio=${first}&data_fim=${last}&pagina=1&loja_id=${lojaId}&tipo=vendas_balcao`;
        const res = await fetch(url);
        const json = await res.json();
        setDados(json);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      }
    }
    fetchData();
  }, [lojaId]);

  if (!dados) return <p>Carregando {titulo}...</p>;

  return (
    <div className="loja">
      <h2>{titulo}</h2>
      <p><b>Produto:</b> R$ {dados.totalProduto || 0}</p>
      <p><b>Vendas de balcão:</b> R$ {dados.totalBalcao || 0}</p>
      <p><b>Total combinado:</b> R$ {dados.total || 0}</p>
      <h3>Por funcionário</h3>
      <table>
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Total vendido</th>
          </tr>
        </thead>
        <tbody>
          {dados.funcionarios?.map((f, i) => (
            <tr key={i}>
              <td>{f.nome}</td>
              <td>R$ {f.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ display: "flex", gap: "2rem" }}>
      <Loja lojaId="338180" titulo="Matriz" />
      <Loja lojaId="338181" titulo="Filial" />
    </div>
  );
}
