const db = require("../database");

module.exports = {
  // Função para listar todos os usuários
  listarUsuarios: async () => {
    const [rows] = await db.query(
      "SELECT id, email, tipo_usuario, assinatura_expira_em FROM usuarios ORDER BY id ASC"
    );
    return rows;
  },

  // Função para atualizar a data de assinatura de um usuário específico
  atualizarAssinatura: async (usuarioId, novaData) => {
    await db.query(
      "UPDATE usuarios SET assinatura_expira_em = ? WHERE id = ?",
      [novaData, usuarioId]
    );
  },

  // --- NOVA FUNÇÃO PARA ALTERAR O TIPO DO USUÁRIO ---
  definirTipoUsuario: async (usuarioId, novoTipo) => {
    await db.query(
      "UPDATE usuarios SET tipo_usuario = ? WHERE id = ?",
      [novoTipo, usuarioId]
    );
  },

  // --- NOVA FUNÇÃO PARA EXCLUIR UM USUÁRIO ---
  excluirUsuario: async (usuarioId) => {
    // Primeiro, apaga os lançamentos associados às contas do usuário
    await db.query("DELETE FROM lancamentos WHERE usuario_id = ?", [usuarioId]);
    // Depois, apaga as contas do usuário
    await db.query("DELETE FROM contas WHERE usuario_id = ?", [usuarioId]);
    // Por fim, apaga o próprio usuário
    await db.query("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
  },
};