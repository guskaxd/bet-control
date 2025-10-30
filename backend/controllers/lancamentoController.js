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
      const totaisPorConta = await Lancamento.totaisAgrupadosPorConta(usuarioId);

      let totalInvestidoGlobal = 0;
      let totalRetornadoGlobal = 0;
      let lucroLiquidoGlobal = 0;

      totaisPorConta.forEach(conta => {
        const investido = parseFloat(conta.totalInvestido);
        const retornado = parseFloat(conta.totalRetornado);
        const repasse = parseFloat(conta.repasse) || 0;

        totalInvestidoGlobal += investido;
        totalRetornadoGlobal += retornado;

        const lucroBruto = retornado - investido;
        const lucroLiquido = lucroBruto > 0 ? lucroBruto * (1 - repasse / 100) : lucroBruto;
        lucroLiquidoGlobal += lucroLiquido;
      });

      const lucroBrutoGlobal = totalRetornadoGlobal - totalInvestidoGlobal;

      // Esta resposta JSON é a correta, com os 4 valores
      res.json({
        totalInvestido: totalInvestidoGlobal,
        totalRetornado: totalRetornadoGlobal,
        lucroBruto: lucroBrutoGlobal,
        lucroTotal: lucroLiquidoGlobal 
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

      // 1. Busca os totais de investimento, retorno E o repasse de cada conta
      const totaisPorConta = await Lancamento.totaisAgrupadosPorConta(usuarioId);
      
      const lucroMap = {};

      // 2. Itera sobre cada conta para calcular o lucro líquido individualmente
      totaisPorConta.forEach(conta => {
        const investido = parseFloat(conta.totalInvestido);
        const retornado = parseFloat(conta.totalRetornado);
        const repasse = parseFloat(conta.repasse) || 0;
        
        // Calcula o lucro bruto da conta
        const lucroBruto = retornado - investido;
        
        // 3. Aplica a comissão de repasse apenas se o lucro for positivo
        const lucroLiquido = lucroBruto > 0 ? lucroBruto * (1 - repasse / 100) : lucroBruto;
        
        // Adiciona o resultado ao mapa que será enviado
        lucroMap[conta.conta_id] = lucroLiquido;
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

      // Busca os totais de investimento e retorno
      const totais = await Lancamento.totaisPorConta(contaId, usuarioId);
      // Busca os dados da conta para pegar o repasse
      const conta = await Conta.buscarPorId(contaId, usuarioId);

      if (!conta) {
        return res.status(404).json({ erro: "Conta não encontrada." });
      }

      // Converte os valores para número
      const investido = parseFloat(totais.totalInvestido);
      const retornado = parseFloat(totais.totalRetornado);
      const repasse = parseFloat(conta.repasse) || 0;

      // Calcula o lucro bruto
      const lucroBruto = retornado - investido;

      // Aplica o repasse APENAS se o lucro for positivo
      const lucroLiquido = lucroBruto > 0 ? lucroBruto * (1 - repasse / 100) : lucroBruto;

      // Retorna o objeto com o lucro já calculado corretamente
      res.json({
        totalInvestido: investido,
        totalRetornado: retornado,
        lucro: lucroLiquido, // A chave 'lucro' agora contém o valor líquido
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao obter totais da conta" });
    }
  },

  lucrosDetalhadosPorDia: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      // 1. Busca os lucros agrupados por dia e por conta
      const lucrosPorConta = await Lancamento.lucroBrutoPorDiaEConta(usuarioId);

      const resultadoPorDia = {};

      // 2. Processa cada registro para calcular o lucro líquido
      lucrosPorConta.forEach(r => {
        const dia = r.dia.toISOString().split('T')[0];
        
        // Inicializa o dia se for a primeira vez que o vemos
        if (!resultadoPorDia[dia]) {
          resultadoPorDia[dia] = {
            dia: dia,
            totalInvestido: 0,
            totalRetornado: 0,
            lucroBruto: 0,
            lucroLiquido: 0,
          };
        }

        // Calcula os lucros para este registro específico (de uma conta em um dia)
        const lucroBrutoConta = r.retornado - r.investido;
        const lucroLiquidoConta = lucroBrutoConta > 0 
            ? lucroBrutoConta * (1 - r.repasse / 100) 
            : lucroBrutoConta;
        
        // 3. Soma os valores aos totais do dia
        resultadoPorDia[dia].totalInvestido += r.investido;
        resultadoPorDia[dia].totalRetornado += r.retornado;
        resultadoPorDia[dia].lucroBruto += lucroBrutoConta;
        resultadoPorDia[dia].lucroLiquido += lucroLiquidoConta;
      });

      // 4. Converte o objeto em um array e envia como resposta
      const arrayResultado = Object.values(resultadoPorDia);
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
