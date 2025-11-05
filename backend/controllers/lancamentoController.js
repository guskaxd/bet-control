const Lancamento = require("../models/lancamentoModel");
const Conta = require("../models/contaModel");

module.exports = {

  listarPorConta: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const results = await Lancamento.listarPorConta(req.params.id, usuarioId);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao listar lançamentos da conta" });
    }
  },

  listarTodos: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const results = await Lancamento.listarTodos(usuarioId);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao listar todos os lançamentos" });
    }
  },

  cadastrar: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const dados = { ...req.body, usuario_id: usuarioId };
      await Lancamento.cadastrar(dados);
      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao cadastrar lançamento" });
    }
  },

  // --- SUBSTITUA A FUNÇÃO 'totais' POR ESTA ---
  totais: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      // 1. Busca os resultados agrupados por operação (descrição)
      const resultados = await Lancamento.lucroBrutoPorContaEDescricao(usuarioId);

      let totalInvestidoGlobal = 0;
      let totalRetornadoGlobal = 0;
      let lucroLiquidoGlobal = 0;

      // 2. Itera sobre CADA operação
      resultados.forEach(r => {
        const investido = parseFloat(r.totalInvestido);
        const retornado = parseFloat(r.totalRetornado);
        const repasse = parseFloat(r.repasse) || 0;

        totalInvestidoGlobal += investido;
        totalRetornadoGlobal += retornado;

        const lucroBrutoOperacao = retornado - investido;

        // 3. APLICA A COMISSÃO APENAS SE A OPERAÇÃO FOI LUCRATIVA
        const lucroLiquidoOperacao = lucroBrutoOperacao > 0 
          ? lucroBrutoOperacao * (1 - repasse / 100) 
          : lucroBrutoOperacao;
        
        lucroLiquidoGlobal += lucroLiquidoOperacao;
      });

      const lucroBrutoGlobal = totalRetornadoGlobal - totalInvestidoGlobal;

      res.json({
        totalInvestido: totalInvestidoGlobal,
        totalRetornado: totalRetornadoGlobal,
        lucroBruto: lucroBrutoGlobal,
        lucroTotal: lucroLiquidoGlobal // Agora é a soma dos lucros líquidos das operações
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao calcular totais" });
    }
  },

  lucroPorData: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const results = await Lancamento.lucroPorData(usuarioId);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter lucro por data" });
    }
  },

  lucrosPorConta: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const resultados = await Lancamento.lucroBrutoPorContaEDescricao(usuarioId);
      
      const lucroMap = {}; // [conta_id] => lucroLiquidoTotal

      resultados.forEach(r => {
        if (!lucroMap[r.conta_id]) {
          lucroMap[r.conta_id] = 0;
        }

        const investido = parseFloat(r.totalInvestido);
        const retornado = parseFloat(r.totalRetornado);
        const repasse = parseFloat(r.repasse) || 0;
        
        const lucroBrutoOperacao = retornado - investido;
        
        // Aplica comissão por operação
        const lucroLiquidoOperacao = lucroBrutoOperacao > 0 
          ? lucroBrutoOperacao * (1 - repasse / 100) 
          : lucroBrutoOperacao;
        
        lucroMap[r.conta_id] += lucroLiquidoOperacao;
      });

      res.json(lucroMap);

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter lucros por conta" });
    }
  },

  totaisPorDescricao: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const results = await Lancamento.totaisPorDescricao(usuarioId);
      const totais = {};
      results.forEach(r => totais[r.descricao] = r.total);
      res.json(totais);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter totais por descrição" });
    }
  },

  lucroPorDescricao: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const results = await Lancamento.lucroPorDataPorDescricao(usuarioId);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter lucro por descrição" });
    }
  },

  excluir: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const id = req.params.id;
      await Lancamento.excluir(id, usuarioId);
      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao excluir lançamento" });
    }
  },

  totaisPorConta: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const contaId = req.params.id;

      // Usamos a mesma função de modelo, mas vamos filtrar os resultados para esta conta
      const resultados = await Lancamento.lucroBrutoPorContaEDescricao(usuarioId);
      const resultadosConta = resultados.filter(r => r.conta_id == contaId);

      let totalInvestido = 0;
      let totalRetornado = 0;
      let lucroLiquidoTotal = 0;
      let repasseConta = 0;

      if (resultadosConta.length === 0) {
        // Se a conta não tem lançamentos, busca os dados da conta
        const conta = await Conta.buscarPorId(contaId, usuarioId);
        return res.json({ 
          totalInvestido: 0, 
          totalRetornado: 0, 
          lucro: 0, 
          repasse: conta ? conta.repasse : 0 
        });
      }

      repasseConta = parseFloat(resultadosConta[0].repasse) || 0;

      resultadosConta.forEach(r => {
        const investido = parseFloat(r.totalInvestido);
        const retornado = parseFloat(r.totalRetornado);

        totalInvestido += investido;
        totalRetornado += retornado;

        const lucroBrutoOperacao = retornado - investido;
        
        const lucroLiquidoOperacao = lucroBrutoOperacao > 0 
          ? lucroBrutoOperacao * (1 - repasseConta / 100) 
          : lucroBrutoOperacao;
        
        lucroLiquidoTotal += lucroLiquidoOperacao;
      });

      res.json({
        totalInvestido: totalInvestido,
        totalRetornado: totalRetornado,
        lucro: lucroLiquidoTotal, // A chave 'lucro' é usada pelo frontend
        repasse: repasseConta
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter totais da conta" });
    }
  },

  lucrosDetalhadosPorDia: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      // 1. Busca os resultados agrupados por dia, conta E descrição
      const resultados = await Lancamento.lucroBrutoPorDiaContaDescricao(usuarioId);

      const resultadoPorDia = {}; // Objeto para agrupar os resultados finais por dia

      resultados.forEach(r => {
        const dia = r.dia.toISOString().split('T')[0];
        
        if (!resultadoPorDia[dia]) {
          resultadoPorDia[dia] = {
            dia: dia,
            totalInvestido: 0,
            totalRetornado: 0,
            lucroBruto: 0,
            lucroLiquido: 0,
          };
        }

        const investido = parseFloat(r.investido);
        const retornado = parseFloat(r.retornado);
        const repasse = parseFloat(r.repasse) || 0;

        // Soma os totais brutos do dia
        resultadoPorDia[dia].totalInvestido += investido;
        resultadoPorDia[dia].totalRetornado += retornado;

        const lucroBrutoOperacao = retornado - investido;
        
        // Aplica repasse SÓ SE a operação (dia/conta/descrição) foi lucrativa
        const lucroLiquidoOperacao = lucroBrutoOperacao > 0 
            ? lucroBrutoOperacao * (1 - repasse / 100) 
            : lucroBrutoOperacao;
        
        // Soma os lucros líquidos/brutos da operação aos totais do dia
        resultadoPorDia[dia].lucroBruto += lucroBrutoOperacao;
        resultadoPorDia[dia].lucroLiquido += lucroLiquidoOperacao;
      });

      const arrayResultado = Object.values(resultadoPorDia).sort((a, b) => new Date(b.dia) - new Date(a.dia));
      res.json(arrayResultado);

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter lucros detalhados por dia" });
    }
  },

  atualizar: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const id = req.params.id;
      const { data, valor } = req.body;
      await Lancamento.atualizar(id, usuarioId, data, valor);
      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao atualizar lançamento" });
    }
  }

};
