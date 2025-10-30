const Admin = require("../models/adminModel");

module.exports = {
  // Função para carregar os dados e renderizar a página do painel
  exibirPainel: async (req, res) => {
    try {
      const usuarios = await Admin.listarUsuarios();
      res.render("pages/admin", { usuarios }); // Vamos criar essa view no próximo passo
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao carregar o painel de administração.");
    }
  },

  // Função para lidar com o formulário de atualização da assinatura
  atualizarAssinatura: async (req, res) => {
    try {
      const { usuarioId } = req.params;
      const { novaData } = req.body;
      await Admin.atualizarAssinatura(usuarioId, novaData);
      res.redirect("/admin/painel"); // Redireciona de volta para o painel após a atualização
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao atualizar a assinatura.");
    }
  },
  // --- NOVA FUNÇÃO PARA ALTERAR O TIPO DO USUÁRIO ---
  definirTipo: async (req, res) => {
    try {
      const { usuarioId } = req.params;
      const { tipo } = req.body; // Receberá 'vitalicio' ou 'cliente'

      // Adiciona uma segurança para não alterar admins
      if (tipo === 'admin') {
        return res.status(400).send("Não é permitido alterar para o tipo admin.");
      }

      await Admin.definirTipoUsuario(usuarioId, tipo);
      res.redirect("/admin/painel");
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao alterar o tipo do usuário.");
    }
  },
  // A nova função está DENTRO do bloco
  excluirUsuario: async (req, res) => {
    try {
      const { usuarioId } = req.params;
      await Admin.excluirUsuario(usuarioId);
      res.redirect("/admin/painel");
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao excluir o usuário.");
    }
  }
};
