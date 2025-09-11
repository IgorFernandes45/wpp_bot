const wppconnect = require('@wppconnect-team/wppconnect');
const {
  buscarCategorias,
  buscarProdutosPorCategoria,
  buscarProdutosPorNome,
  buscarEnderecos,
  registrarVenda
} = require('./database');

const NUM_ADMIN = '5561993427314@c.us';
const sessoes = {};

wppconnect.create({ session: 'bot-avancado' })
  .then(client => start(client))
  .catch(err => console.error(err));

function start(client) {
  client.onMessage(async message => {
    const from = message.from;
    const texto = message.body?.trim();
    if (!texto) return;

    if (!sessoes[from]) {
      sessoes[from] = {
        etapa: 'inicio',
        pedido: [],
        total: 0,
        taxaEntrega: 0,
        enderecoBairro: null,
        enderecoCompleto: null,
        pagamento: null,
        taxaCartaoAplicada: 0,
        trocoPara: null,
        buscaProdutos: [],
        produtoSelecionado: null
      };
    }

    const session = sessoes[from];

    try {
      switch (session.etapa) {

        // MENU INICIAL
        case 'inicio':
          await client.sendText(from, "Olá! 😄\n1 - Pedir entrega\n2 - Consultar preço");
          session.etapa = 'menu';
          break;

        case 'menu':
          if (texto === '1') {
            await client.sendText(from, '📦 Ótimo! Qual produto você deseja? Digite o nome ou parte do nome:');
            session.etapa = 'buscarProduto';
          } else if (texto === '2') {
            await client.sendText(from, '📦 Qual produto você deseja consultar? Digite o nome ou parte do nome:');
            session.etapa = 'buscarProdutoConsulta';
          } else {
            await client.sendText(from, '❌ Opção inválida. Digite 1 ou 2.');
          }
          break;

        // BUSCAR PRODUTO
        case 'buscarProduto': {
          let produtos = await buscarProdutosPorNome(texto);

          // Se não achou nada, verifica se é o nome de uma categoria
          const categorias = await buscarCategorias();
          const categoriaDigitada = categorias.find(c => c.toLowerCase() === texto.toLowerCase());
          if (categoriaDigitada) {
            produtos = await buscarProdutosPorCategoria(categoriaDigitada);
          }

          if (!produtos.length) {
            await client.sendText(from, '❌ Nenhum produto encontrado. Digite outro nome ou categoria:');
            break;
          }

          session.buscaProdutos = produtos;
          let lista = '🔍 Encontrei os seguintes produtos:\n';
          produtos.forEach((p, i) => lista += `${i+1} - ${p.produto} (R$ ${p.preco.toFixed(2)})\n`);
          lista += '\nDigite o número do produto que deseja ou 0 se não achou:';
          session.etapa = 'selecionarProduto';
          await client.sendText(from, lista);
          break;
        }

        case 'selecionarProduto': {
          const idx = parseInt(texto) - 1;
          if (texto === '0') {
            session.etapa = 'buscarProduto';
            await client.sendText(from, 'Digite o nome ou parte do nome do produto novamente:');
            break;
          }
          if (isNaN(idx) || !session.buscaProdutos[idx]) {
            await client.sendText(from, '❌ Número inválido. Digite novamente:');
            break;
          }

          session.produtoSelecionado = session.buscaProdutos[idx];
          await client.sendText(from, `Digite a quantidade de ${session.produtoSelecionado.produto}:`);
          session.etapa = 'quantidade';
          break;
        }

        case 'quantidade': {
          const qtd = parseInt(texto);
          if (isNaN(qtd) || qtd <= 0) {
            await client.sendText(from, '❌ Quantidade inválida. Digite novamente:');
            break;
          }

          const p = session.produtoSelecionado;
          const item = {
            produto: p.produto,
            quantidade: qtd,
            preco_unitario: p.preco,
            subtotal: p.preco * qtd,
            taxa_credito: p.taxa_credito,
            taxa_debito: p.taxa_debito
          };
          session.pedido.push(item);
          session.total += item.subtotal;

          // Pergunta se deseja adicionar outro produto
          await client.sendText(from, '✅ Produto adicionado! Deseja adicionar outro produto? (s/n)');
          session.etapa = 'adicionarOutro';
          break;
        }

        case 'adicionarOutro':
          if (texto.toLowerCase() === 's') {
            await client.sendText(from, 'Digite o nome ou parte do nome do próximo produto:');
            session.etapa = 'buscarProduto';
          } else {
            const enderecos = await buscarEnderecos();
            session.enderecos = enderecos;
            let listaEnd = '📍 Escolha o bairro:\n';
            enderecos.forEach((e,i) => {
              listaEnd += `${i+1} - ${e.nome} (Taxa: R$ ${Number(e.taxa).toFixed(2)})\n`;
            });
            listaEnd += '\nDigite o número do bairro:';
            session.etapa = 'endereco';
            await client.sendText(from, listaEnd);
          }
          break;

        // ENDEREÇO
        case 'endereco': {
          const idxEnd = parseInt(texto) - 1;
          if (isNaN(idxEnd) || !session.enderecos[idxEnd]) {
            await client.sendText(from, '❌ Endereço inválido.');
            break;
          }
          session.enderecoBairro = session.enderecos[idxEnd].nome;
          session.taxaEntrega = Number(session.enderecos[idxEnd].taxa);

          await client.sendText(from, `📍 Endereço: ${session.enderecoBairro}\nDigite o endereço completo (rua, número, complemento):`);
          session.etapa = 'enderecoCompleto';
          break;
        }

        case 'enderecoCompleto': {
          session.enderecoCompleto = texto;
          let resumo = '🧾 Resumo do pedido:\n';
          session.pedido.forEach(it => resumo += `• ${it.quantidade}x ${it.produto} - R$ ${it.subtotal.toFixed(2)}\n`);
          resumo += `\n🚚 Taxa de entrega: R$ ${session.taxaEntrega.toFixed(2)}\n`;
          resumo += 'Formas de pagamento:\n1 - Dinheiro\n2 - Débito\n3 - Crédito\n4 - Pix';
          session.etapa = 'pagamento';
          await client.sendText(from, resumo);
          break;
        }

        // PAGAMENTO
        case 'pagamento': {
          let forma;
          switch (texto) {
            case '1': forma = 'dinheiro'; break;
            case '2': forma = 'debito'; break;
            case '3': forma = 'credito'; break;
            case '4': forma = 'pix'; break;
            default:
              await client.sendText(from, '❌ Opção inválida. Digite 1, 2, 3 ou 4.');
              break;
          }
          if (!forma) break;

          session.pagamento = forma;

          const taxaCartao =
            forma === 'debito'
              ? session.pedido.reduce((acc, it) => acc + (it.taxa_debito * it.quantidade), 0)
              : forma === 'credito'
                ? session.pedido.reduce((acc, it) => acc + (it.taxa_credito * it.quantidade), 0)
                : 0;

          session.taxaCartaoAplicada = taxaCartao;
          const totalFinal = session.total + session.taxaEntrega + taxaCartao;

          for (const itemPedido of session.pedido) {
            await registrarVenda(itemPedido, `${session.enderecoCompleto} - (${session.enderecoBairro})`, session.pagamento, session.taxaEntrega, totalFinal);
          }

          let resumoAdmin = `📦 Novo Pedido!\n`;
          session.pedido.forEach(i => resumoAdmin += `• ${i.produto} x${i.quantidade} = R$ ${i.subtotal.toFixed(2)}\n`);
          resumoAdmin += `📍 Endereço: ${session.enderecoCompleto} - (${session.enderecoBairro})\n`;
          resumoAdmin += `🚚 Entrega: R$ ${session.taxaEntrega.toFixed(2)}\n`;
          if (taxaCartao > 0) resumoAdmin += `💳 Taxa cartão: R$ ${taxaCartao.toFixed(2)}\n`;
          resumoAdmin += `💰 Total: R$ ${totalFinal.toFixed(2)}\n`;
          resumoAdmin += `🕒 ${new Date().toLocaleString()}`;
          await client.sendText(NUM_ADMIN, resumoAdmin);

          let textoCliente = `✅ Pedido confirmado!\n💰 Total: R$ ${totalFinal.toFixed(2)}\n🚚 Entrega: R$ ${session.taxaEntrega.toFixed(2)}`;
          if (taxaCartao > 0) textoCliente += `\n💳 Inclui taxa do cartão: R$ ${taxaCartao.toFixed(2)}`;
          await client.sendText(from, textoCliente);

          delete sessoes[from];
          break;
        }

        default:
          delete sessoes[from];
          await client.sendText(from, 'Vamos começar de novo. Digite qualquer mensagem.');
      }

    } catch (err) {
      console.error('Erro no fluxo:', err);
      delete sessoes[from];
      await client.sendText(from, '⚠️ Ocorreu um erro. Vamos começar de novo. Envie qualquer mensagem.');
    }
  });
}
