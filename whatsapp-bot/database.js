const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  decimalNumbers: true
});

// BUSCAR TODAS AS CATEGORIAS
async function buscarCategorias() {
  const [rows] = await pool.query(
    "SELECT DISTINCT categoria FROM produtos ORDER BY categoria"
  );
  return rows.map(r => r.categoria);
}

// BUSCAR PRODUTOS POR CATEGORIA
async function buscarProdutosPorCategoria(categoria) {
  const [rows] = await pool.query(
    "SELECT codigo, produto, preco, taxa_credito, taxa_debito FROM produtos WHERE categoria = ?",
    [categoria]
  );
  return rows.map(r => ({
    codigo: r.codigo,
    produto: r.produto,
    preco: Number(r.preco),
    taxa_credito: Number(r.taxa_credito || 0),
    taxa_debito: Number(r.taxa_debito || 0)
  }));
}

// BUSCAR PRODUTOS POR NOME (LIKE)
async function buscarProdutosPorNome(termo) {
  const [rows] = await pool.query(
    `SELECT codigo, produto, preco, taxa_credito, taxa_debito 
     FROM produtos 
     WHERE produto LIKE ? 
     ORDER BY produto`,
    [`%${termo}%`]
  );
  return rows.map(r => ({
    codigo: r.codigo,
    produto: r.produto,
    preco: Number(r.preco),
    taxa_credito: Number(r.taxa_credito || 0),
    taxa_debito: Number(r.taxa_debito || 0)
  }));
}

// BUSCAR ENDEREÇOS
async function buscarEnderecos() {
  const [rows] = await pool.query("SELECT nome, taxa FROM enderecos ORDER BY nome");
  return rows.map(r => ({ nome: r.nome, taxa: Number(r.taxa) }));
}

// REGISTRAR VENDA
async function registrarVenda(item, endereco, pagamento, taxaEntrega, valorTotal) {
  const data = new Date();
  await pool.query(
    `INSERT INTO vendas 
      (produto, quantidade, preco_unitario, subtotal, endereco, pagamento, taxa_entrega, valor_total, data_hora) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.produto,
      item.quantidade,
      item.preco_unitario,
      item.subtotal,
      endereco,
      pagamento,
      taxaEntrega || 0,
      valorTotal || (item.subtotal + (taxaEntrega || 0)),
      data
    ]
  );
}

module.exports = {
  buscarCategorias,
  buscarProdutosPorCategoria,
  buscarProdutosPorNome,
  buscarEnderecos,
  registrarVenda
};
