const Conta = require("../models/contaModel");

module.exports = {

  listar: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const results = await Conta.listarPorUsuario(usuarioId);
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao listar contas" });
    }
  },

  cadastrar: async (req, res) => {
    try {
      const usuarioId = req.session.user.id;
      const dados = { ...req.body, usuario_id: usuarioId };
      await Conta.cadastrar(dados);
      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao cadastrar conta" });
    }
  },

  atualizarStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await Conta.atualizarStatus(id, status, req.session.user.id);
      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao atualizar status da conta" });
    }
  },

  atualizarValorInicial: async (req, res) => {
    try {
      const { id } = req.params;
      const { valorDepositado } = req.body;
      const usuarioId = req.session.user.id;
      
      await Conta.atualizarValorInicial(id, valorDepositado, usuarioId);
      
      res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao atualizar o valor inicial da conta." });
    }
  },
  
  verificarLancamentos: async (req, res) => {
    try {
      const { id } = req.params;
      const usuarioId = req.session.user.id;
      const total = await Conta.verificarLancamentos(id, usuarioId);
      res.json({ total });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao verificar lançamentos" });
    }
  },
  
  excluir: async (req, res) => {
    try {
      const id = req.params.id;
      const usuarioId = req.session.user.id;
      const { excluirLancs } = req.query;

      const total = await Conta.verificarLancamentos(id, usuarioId); // já retorna número

      if (total > 0 && excluirLancs === "true") {
        await Conta.excluirLancamentos(id, usuarioId);
      }

      await Conta.excluirConta(id, usuarioId);
      res.json({ sucesso: true });

    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: "Erro ao excluir conta" });
    }
  }

};
