const form = document.getElementById('formProduto');
const produtosBody = document.getElementById('produtosBody');

document.getElementById('btnVendas').addEventListener('click', () => {
  window.location.href = 'vendas.html';
});
async function carregarProdutos() {
  const res = await fetch('/api/produtos');
  const produtos = await res.json();
  produtosBody.innerHTML = '';
  produtos.forEach(p => {
    produtosBody.innerHTML += `
      <tr>
        <td>${p.codigo}</td>
        <td>${p.produto}</td>
        <td>${p.preco}</td>
        <td>${p.tx_credito}</td>
        <td>${p.tx_debito}</td>
        <td>${p.categoria}</td>
        <td>
          <button onclick="editar(${p.codigo})">Editar</button>
          <button onclick="deletar(${p.codigo})">Deletar</button>
        </td>
      </tr>
    `;
  });
}

async function editar(codigo) {
  const res = await fetch(`/api/produtos/${codigo}`);
  const p = await res.json();
  document.getElementById('produtoCodigo').value = p.codigo;
  document.getElementById('produto').value = p.produto;
  document.getElementById('preco').value = p.preco;
  document.getElementById('tx_credito').value = p.tx_credito;
  document.getElementById('tx_debito').value = p.tx_debito;
  document.getElementById('categoria').value = p.categoria;
}

async function deletar(codigo) {
  if(confirm('Deseja deletar este produto?')) {
    await fetch(`/api/produtos/${codigo}`, { method: 'DELETE' });
    carregarProdutos();
  }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  const codigo = document.getElementById('produtoCodigo').value;
  const data = {
    produto: document.getElementById('produto').value,
    preco: parseFloat(document.getElementById('preco').value),
    tx_credito: parseFloat(document.getElementById('tx_credito').value),
    tx_debito: parseFloat(document.getElementById('tx_debito').value),
    categoria: document.getElementById('categoria').value
  };
  if(codigo) {
    await fetch(`/api/produtos/${codigo}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
  } else {
    await fetch('/api/produtos', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
  }
  form.reset();
  carregarProdutos();
});

document.getElementById('cancelar').addEventListener('click', () => form.reset());

carregarProdutos();