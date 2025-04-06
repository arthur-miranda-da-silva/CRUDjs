const fs = require('fs');
const path = require('path');
const readline = require('readline');
const USUARIOS = {
    admin: { username: 'admin', password: 'admin123', role: 'admin' },
    operador: { username: 'operador', password: 'operador123', role: 'operador' }
  };
  
  let usuarioLogado = null;

class LocadoraJogos {
  constructor() {
    this.databaseFile = path.join(__dirname, 'jogos-database.json');
    this.jogos = this.carregarDados();
    this.currentId = this.jogos.length > 0 
      ? Math.max(...this.jogos.map(jogo => jogo.id)) + 1 
      : 1;
    this.locacoes = this.carregarLocacoes() || [];
  }

  carregarLocacoes() {
    try {
      if (fs.existsSync(this.databaseFile.replace('.json', '_locacoes.json'))) {
        const data = fs.readFileSync(this.databaseFile.replace('.json', '_locacoes.json'), 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar locações:', error);
      return [];
    }
  }

  salvarLocacoes() {
    try {
      fs.writeFileSync(
        this.databaseFile.replace('.json', '_locacoes.json'),
        JSON.stringify(this.locacoes, null, 2)
      );
    } catch (error) {
      console.error('Erro ao salvar locações:', error);
    }
  }

  gerarCodigoLocacao() {
    return 'LOC-' + Date.now().toString(36) + '-' + 
      Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  registrarLocacao(jogoId, cliente) {
    const jogo = this.obterJogoPorId(jogoId);
    if (!jogo || !jogo.disponivel) return null;

    const locacao = {
      codigo: this.gerarCodigoLocacao(),
      jogoId,
      titulo: jogo.titulo,
      cliente,
      dataLocacao: new Date().toISOString(),
      devolvido: false
    };

    // Marca o jogo como indisponível
    this.atualizarJogo(jogoId, { disponivel: false });
    
    this.locacoes.push(locacao);
    this.salvarLocacoes();
    return locacao;
  }

  devolverJogo(codigoLocacao) {
    const locacao = this.locacoes.find(l => l.codigo === codigoLocacao);
    if (!locacao || locacao.devolvido) return false;

    locacao.dataDevolucao = new Date().toISOString();
    locacao.devolvido = true;
    this.atualizarJogo(locacao.jogoId, { disponivel: true });
    this.salvarLocacoes();
    return true;
  }

  obterLocacoes() {
    return [...this.locacoes];
  } 

  carregarDados() {
    try {
      if (fs.existsSync(this.databaseFile)) {
        const data = fs.readFileSync(this.databaseFile, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return [];
    }
  }

  salvarDados() {
    try {
      fs.writeFileSync(this.databaseFile, JSON.stringify(this.jogos, null, 2));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  adicionarJogo(jogo) {
    if (!jogo.titulo || !jogo.categoria) {
      return false;
    }

    const novoJogo = {
      id: this.currentId++,
      titulo: jogo.titulo,
      categoria: jogo.categoria,
      anoLancamento: jogo.anoLancamento || null,
      developer: jogo.developer || 'Desconhecido',
      distribuidora: jogo.distribuidora || 'Desconhecida',
      classificacaoEtaria: jogo.classificacaoEtaria || 'Livre',
      nota: jogo.nota || 0,
      disponivel: true,
      dataCadastro: new Date().toISOString()
    };

    this.jogos.push(novoJogo);
    this.salvarDados();
    return true;
  }

  obterTodosJogos() {
    return [...this.jogos];
  }

  obterJogoPorId(id) {
    return this.jogos.find(jogo => jogo.id === id) || null;
  }

  atualizarJogo(id, dadosAtualizados) {
    const index = this.jogos.findIndex(jogo => jogo.id === id);
    
    if (index === -1) return false;

    this.jogos[index] = {
      ...this.jogos[index],
      ...dadosAtualizados,
      id: this.jogos[index].id,
      dataCadastro: this.jogos[index].dataCadastro
    };

    this.salvarDados();
    return true;
  }

  removerJogo(id) {
    const index = this.jogos.findIndex(jogo => jogo.id === id);
    if (index === -1) return false;

    this.jogos.splice(index, 1);
    this.salvarDados();
    return true;
  }

  buscarPorTitulo(termo) {
    if (!termo || termo.trim() === '') return [];
    
    return this.jogos.filter(jogo => 
      jogo.titulo.toLowerCase().includes(termo.toLowerCase().trim())
    );
  }

  filtrarPorCategoria(categoria) {
    return this.jogos.filter(jogo => 
      jogo.categoria.toLowerCase() === categoria.toLowerCase()
    );
  }

}

// Configuração da interface CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const locadora = new LocadoraJogos();

// Função auxiliar para obter input do usuário
function perguntar(questao, obrigatorio = false, validacao = null, ocultar = false) {
    return new Promise((resolve) => {
      const ask = () => {
        rl.question(questao, { hideEchoBack: ocultar }, (resposta) => {
          const valor = resposta.trim();
          
          if (obrigatorio && !valor) {
            console.log('Este campo é obrigatório!');
            return ask();
          }
          
          if (validacao && !validacao(valor)) {
            console.log('Valor inválido!');
            return ask();
          }
          
          resolve(valor);
        });
      };
      
      ask();
    });
  }

// Menu principal
function mostrarMenu() {
    console.log('\n=== LOCADORA DE JOGOS ===');
    console.log(`Usuário: ${usuarioLogado.username} (${usuarioLogado.role})`);
    console.log('\nMENU PRINCIPAL');
    console.log('1. Listar Todos os Jogos');
    console.log('2. Buscar por Título');
    
    if (usuarioLogado.role === 'admin') {
      console.log('3. Adicionar Jogo');
      console.log('4. Atualizar Jogo');
      console.log('5. Remover Jogo');
    }
    
    console.log('6. Registrar Locação');
    console.log('7. Registrar Devolução');
    console.log('8. Listar Locações Ativas');
    console.log('9. Trocar Usuário');
    console.log('0. Sair');
  
    const opcoesOperador = ['1', '2', '6', '7', '8', '9', '0'];
    const opcoesAdmin = [...opcoesOperador, '3', '4', '5'];
    
    const opcoesPermitidas = usuarioLogado.role === 'admin' ? opcoesAdmin : opcoesOperador;
    
    perguntar('Escolha uma opção: ', true, opcao => opcoesPermitidas.includes(opcao))
      .then(opcao => {
        switch(opcao) {
          case '1': listarJogos(); break;
          case '2': buscarPorTitulo(); break;
          case '3': if (usuarioLogado.role === 'admin') adicionarJogo(); break;
          case '4': if (usuarioLogado.role === 'admin') atualizarJogo(); break;
          case '5': if (usuarioLogado.role === 'admin') removerJogo(); break;
          case '6': registrarLocacao(); break;
          case '7': devolverJogo(); break;
          case '8': listarLocacoes(); break;
          case '9': trocarUsuario(); break;
          case '0': rl.close(); break;
        }
      });
  }

async function iniciarAplicacao() {
    console.log('=== SISTEMA DE LOCADORA DE JOGOS ===');
    
    let loggedIn = false;
    while (!loggedIn) {
      loggedIn = await fazerLogin();
    }
    
    mostrarMenu();
  }
  // Função para trocar de usuário
async function trocarUsuario() {
    usuarioLogado = null;
    console.log('\n=== TROCAR USUÁRIO ===');
    await fazerLogin();
    mostrarMenu();
  }

async function fazerLogin() {
    console.log('\n=== LOGIN ===');
    
    const username = await perguntar('Usuário: ', true);
    const password = await perguntar('Senha: ', true, null, true); // true para esconder senha
  
    const usuario = Object.values(USUARIOS).find(
      u => u.username === username && u.password === password
    );
  
    if (usuario) {
      usuarioLogado = usuario;
      console.log(`\n✅ Login bem-sucedido como ${usuario.role}`);
      return true;
    } else {
      console.log('\n❌ Usuário ou senha incorretos');
      return false;
    }
  }
  async function registrarLocacao() {
    console.log('\n=== REGISTRAR LOCAÇÃO ===');
    
    try {
      // Lista apenas jogos disponíveis
      const jogosDisponiveis = locadora.obterTodosJogos()
        .filter(j => j.disponivel)
        .map(j => ({
          ID: j.id,
          Título: j.titulo,
          Categoria: j.categoria,
          Classificação: j.classificacaoEtaria
        }));
  
      if (jogosDisponiveis.length === 0) {
        console.log('\n❌ Nenhum jogo disponível para locação!');
        return mostrarMenu();
      }
  
      console.log('\nJogos disponíveis para locação:');
      console.table(jogosDisponiveis, ['ID', 'Título', 'Categoria', 'Classificação']);
  
      const jogoId = parseInt(await perguntar('\nID do jogo a ser alugado: ', true, val => !isNaN(val)));
      const nomeCliente = await perguntar('Nome completo do cliente: ', true);
      const identidadeCliente = await perguntar('Documento de identidade (CPF/RG): ', true);
  
      const cliente = {
        nome: nomeCliente,
        documento: identidadeCliente,
        contato: await perguntar('Telefone para contato (opcional): ')
      };
  
      const locacao = locadora.registrarLocacao(jogoId, cliente);
      if (locacao) {
        console.log('\n✅ LOCAÇÃO REGISTRADA COM SUCESSO!');
        console.log(`Código da Locação: ${locacao.codigo}`);
        console.log(`Jogo: ${locacao.titulo}`);
        console.log(`Cliente: ${cliente.nome}`);
        console.log(`Data: ${new Date(locacao.dataLocacao).toLocaleString()}`);
      } else {
        console.log('\n❌ Erro ao registrar locação. Jogo indisponível ou não encontrado.');
      }
    } catch (error) {
      console.log('\n❌ Ocorreu um erro:', error.message);
    }
    
    mostrarMenu();
  }
  
  async function devolverJogo() {
    console.log('\n=== DEVOLUÇÃO DE JOGO ===');
    
    try {
      const codigo = await perguntar('Código da locação: ', true);
      
      if (locadora.devolverJogo(codigo)) {
        const locacao = locadora.obterLocacoes().find(l => l.codigo === codigo);
        console.log('\n✅ JOGO DEVOLVIDO COM SUCESSO!');
        console.log(`Jogo: ${locacao.titulo}`);
        console.log(`Cliente: ${locacao.cliente.nome}`);
        console.log(`Data de Devolução: ${new Date().toLocaleString()}`);
      } else {
        console.log('\n❌ Locação não encontrada ou já devolvida.');
      }
    } catch (error) {
      console.log('\n❌ Ocorreu um erro:', error.message);
    }
    
    mostrarMenu();
  }
  function listarLocacoes() {
    console.log('\n=== LOCAÇÕES ATIVAS ===');
    const locacoesAtivas = locadora.obterLocacoes().filter(l => !l.devolvido);
    
    if (locacoesAtivas.length === 0) {
      console.log('Nenhuma locação ativa no momento.');
    } else {
      console.table(locacoesAtivas.map(l => ({
        Código: l.codigo,
        Jogo: l.titulo,
        Cliente: l.cliente.nome,
        Documento: l.cliente.documento,
        'Data Locação': new Date(l.dataLocacao).toLocaleDateString()
      })));
    }
    
    mostrarMenu();
  }
async function devolverJogo() {
    if (usuarioLogado.role !== 'admin') {
      console.log('\n❌ Apenas administradores podem registrar devoluções!');
      return mostrarMenu();
    }
  
    console.log('\n=== DEVOLUÇÃO DE JOGO ===');
    
    try {
      const codigo = await perguntar('Código da locação: ', true);
      
      if (locadora.devolverJogo(codigo)) {
        const locacao = locadora.obterLocacoes().find(l => l.codigo === codigo);
        console.log('\n✅ JOGO DEVOLVIDO COM SUCESSO!');
        console.log(`Jogo: ${locacao.titulo}`);
        console.log(`Cliente: ${locacao.cliente.nome}`);
        console.log(`Data de Devolução: ${new Date().toLocaleString()}`);
      } else {
        console.log('\n❌ Locação não encontrada ou já devolvida.');
      }
    } catch (error) {
      console.log('\n❌ Ocorreu um erro:', error.message);
    }
    
    mostrarMenu();
  }
// Função para adicionar jogo
async function adicionarJogo() {
    console.log('\n=== ADICIONAR JOGO ===');
    
    // Lista de classificações etárias permitidas
    const classificacoesPermitidas = ['Livre', '10 anos', '12 anos', '14 anos', '16 anos', '18 anos'];
    
    try {
      const jogo = {
        titulo: await perguntar('Título: ', true),
        categoria: await perguntar('Categoria: ', true),
        anoLancamento: await perguntar('Ano de Lançamento: ', true, 
          val => /^\d{4}$/.test(val)),
        developer: await perguntar('Developer: ', true),
        distribuidora: await perguntar('Distribuidora (opcional): '),
        classificacaoEtaria: await perguntar(
          `Classificação Etária (${classificacoesPermitidas.join(', ')}): `, 
          true,
          val => classificacoesPermitidas.includes(val)
        ),
        nota: await perguntar('Nota (0-10, opcional): ', false, 
          val => !val || (Number(val) >= 0 && Number(val) <= 10))
      };
  
      // Converter valores numéricos
      jogo.anoLancamento = parseInt(jogo.anoLancamento);
      if (jogo.nota) jogo.nota = parseFloat(jogo.nota);
  
      if (locadora.adicionarJogo(jogo)) {
        console.log('\n✅ Jogo adicionado com sucesso!');
      } else {
        console.log('\n❌ Erro ao adicionar jogo.');
      }
    } catch (error) {
      console.log('\n❌ Ocorreu um erro:', error.message);
    }
    
    mostrarMenu();
  }

// Função para listar jogos
function listarJogos() {
    console.log('\n=== JOGOS DISPONÍVEIS ===');
    const jogos = locadora.obterTodosJogos();
    
    if (jogos.length === 0) {
      console.log('Nenhum jogo cadastrado.');
    } else {
      // Criar um array vazio para armazenar os dados formatados
      const dadosFormatados = [];
      
      // Preencher o array com loop for
      for (let i = 0; i < jogos.length; i++) {
        const jogo = jogos[i];
        dadosFormatados.push({
          ID: jogo.id,
          Título: jogo.titulo,
          Categoria: jogo.categoria,
          Classificação: jogo.classificacaoEtaria,
          Disponível: jogo.disponivel ? 'Sim' : 'Não'
        });
      }
      
      // Exibir tabela especificando as colunas desejadas
      console.table(dadosFormatados, ['ID', 'Título', 'Categoria', 'Classificação', 'Disponível']);
    }
    
    mostrarMenu();
  }

// Função para buscar por título
async function buscarPorTitulo() {
  console.log('\n=== BUSCAR JOGO ===');
  
  try {
    const termo = await perguntar('Digite o termo de busca: ', true);
    const resultados = locadora.buscarPorTitulo(termo);
    
    console.log('\n=== RESULTADOS ===');
    if (resultados.length === 0) {
      console.log('Nenhum jogo encontrado.');
    } else {
      resultados.forEach(jogo => {
        console.log(`\nID: ${jogo.id}`);
        console.log(`Título: ${jogo.titulo}`);
        console.log(`Categoria: ${jogo.categoria}`);
        console.log(`Ano: ${jogo.anoLancamento || 'N/A'}`);
        console.log(`Nota: ${jogo.nota}`);
        console.log(`Disponível: ${jogo.disponivel ? 'Sim' : 'Não'}`);
        console.log('-'.repeat(40));
      });
    }
  } catch (error) {
    console.log('\n❌ Ocorreu um erro:', error.message);
  }
  
  mostrarMenu();
}

// Função para atualizar jogo
async function atualizarJogo() {
    console.log('\n=== ATUALIZAR JOGO ===');
    const classificacoesPermitidas = ['Livre', '10 anos', '12 anos', '14 anos', '16 anos', '18 anos'];
  
    try {
      const id = await perguntar('Digite o ID do jogo: ', true, val => !isNaN(val));
      const jogo = locadora.obterJogoPorId(parseInt(id));
      
      if (!jogo) {
        console.log('\n❌ Jogo não encontrado!');
        return mostrarMenu();
      }
  
      console.log('\nDeixe em branco para manter o valor atual:');
      
      const atualizacoes = {
        titulo: (await perguntar(`Título [${jogo.titulo}]: `)) || jogo.titulo,
        categoria: (await perguntar(`Categoria [${jogo.categoria}]: `)) || jogo.categoria,
        anoLancamento: (await perguntar(
          `Ano de Lançamento [${jogo.anoLancamento || 'N/A'}]: `, 
          false,
          val => !val || /^\d{4}$/.test(val)
        )) || jogo.anoLancamento,
        developer: (await perguntar(`Developer [${jogo.developer}]: `)) || jogo.developer,
        distribuidora: (await perguntar(`Distribuidora [${jogo.distribuidora || 'N/A'}]: `)) || jogo.distribuidora,
        classificacaoEtaria: (await perguntar(
          `Classificação Etária [${jogo.classificacaoEtaria}] (${classificacoesPermitidas.join(', ')}): `,
          false,
          val => !val || classificacoesPermitidas.includes(val)
        )) || jogo.classificacaoEtaria,
        nota: (await perguntar(
          `Nota [${jogo.nota}] (0-10): `,
          false,
          val => !val || (Number(val) >= 0 && Number(val) <= 10)
        )) || jogo.nota
      };
  
      // Converter valores numéricos
      if (atualizacoes.anoLancamento && typeof atualizacoes.anoLancamento === 'string') {
        atualizacoes.anoLancamento = parseInt(atualizacoes.anoLancamento);
      }
      if (atualizacoes.nota && typeof atualizacoes.nota === 'string') {
        atualizacoes.nota = parseFloat(atualizacoes.nota);
      }
  
      if (locadora.atualizarJogo(jogo.id, atualizacoes)) {
        console.log('\n✅ Jogo atualizado com sucesso!');
      } else {
        console.log('\n❌ Erro ao atualizar jogo.');
      }
    } catch (error) {
      console.log('\n❌ Ocorreu um erro:', error.message);
    }
    
    mostrarMenu();
  }

// Função para remover jogo
async function removerJogo() {
  console.log('\n=== REMOVER JOGO ===');
  
  try {
    const id = await perguntar('Digite o ID do jogo: ', true, val => !isNaN(val));
    const jogo = locadora.obterJogoPorId(parseInt(id));
    
    if (!jogo) {
      console.log('\n❌ Jogo não encontrado!');
      return mostrarMenu();
    }
    
    console.log(`\nTem certeza que deseja remover "${jogo.titulo}" (ID: ${jogo.id})?`);
    const confirmacao = await perguntar('s/n');
    
    if (confirmacao.toLowerCase() === 's') {
      if (locadora.removerJogo(jogo.id)) {
        console.log('\n✅ Jogo removido com sucesso!');
      } else {
        console.log('\n❌ Erro ao remover jogo.');
      }
    } else {
      console.log('\nOperação cancelada.');
    }
  } catch (error) {
    console.log('\n❌ Ocorreu um erro:', error.message);
  }
  
  mostrarMenu();
}
iniciarAplicacao();

rl.on('close', () => {
  console.log('\nSistema encerrado. Até mais!');
  process.exit(0);
});