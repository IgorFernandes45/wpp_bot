import mysql from 'mysql2/promise';

// =====================
// CONEXÃO COM O BANCO
// =====================
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  decimalNumbers: true
});

// =====================
// PRODUTOS
// =====================
export async function buscarProdutos() {
  const [rows] = await pool.query(
    `SELECT codigo, produto, preco, tx_credito, tx_debito, categoria FROM produtos ORDER BY codigo`
  );
  return rows;
}

export async function buscarProduto(codigo) {
  const [rows] = await pool.query(
    "SELECT codigo, produto, preco, tx_credito, tx_debito, categoria FROM produtos WHERE codigo = ?",
    [codigo]
  );
  return rows[0] || null;
}

export async function criarProduto(p) {
  const { produto, preco, tx_credito, tx_debito, categoria } = p;
  const [res] = await pool.query(
    `INSERT INTO produtos (produto, preco, tx_credito, tx_debito, categoria)
     VALUES (?, ?, ?, ?, ?)`,
    [produto, preco, tx_credito, tx_debito, categoria]
  );
  return res.insertId;
}

export async function atualizarProduto(codigo, p) {
  const { produto, preco, tx_credito, tx_debito, categoria } = p;
  await pool.query(
    `UPDATE produtos SET produto=?, preco=?, tx_credito=?, tx_debito=?, categoria=? WHERE codigo=?`,
    [produto, preco, tx_credito, tx_debito, categoria, codigo]
  );
}

export async function deletarProduto(codigo) {
  await pool.query("DELETE FROM produtos WHERE codigo=?", [codigo]);
}

// =====================
// VENDAS
// =====================
export async function buscarVendas() {
  const [rows] = await pool.query(
    `SELECT id, produto, quantidade, preco_unitario, subtotal, data_hora, endereco, pagamento, taxa_entrega, valor_total
     FROM vendas ORDER BY data_hora DESC`
  );
  return rows;
}