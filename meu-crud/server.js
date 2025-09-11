import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buscarProdutos,
  buscarProduto,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  buscarVendas
} from './database.js';

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ROTAS PRODUTOS (CRUD)
app.get('/api/produtos', async (req, res) => {
  const produtos = await buscarProdutos();
  res.json(produtos);
});

app.get('/api/produtos/:codigo', async (req, res) => {
  const produto = await buscarProduto(req.params.codigo);
  res.json(produto);
});

app.post('/api/produtos', async (req, res) => {
  const id = await criarProduto(req.body);
  res.json({ codigo: id });
});

app.put('/api/produtos/:codigo', async (req, res) => {
  await atualizarProduto(req.params.codigo, req.body);
  res.json({ success: true });
});

app.delete('/api/produtos/:codigo', async (req, res) => {
  await deletarProduto(req.params.codigo);
  res.json({ success: true });
});

// ROTA VENDAS
app.get('/api/vendas', async (req, res) => {
  try {
    const vendas = await buscarVendas();
    res.json(vendas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
