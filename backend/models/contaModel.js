const db = require("../database");

module.exports = {
  listarPorUsuario: async (usuario_id) => {
    const [rows] = await db.query("SELECT * FROM contas WHERE usuario_id = ?", [usuario_id]);
    return rows;
  },

  cadastrar: async (dados) => {
    const { nome, email, casa, status, valorDepositado, repasse, usuario_id } = dados;
    const [result] = await db.query(
      "INSERT INTO contas (nome, email, casa, status, valorDepositado, repasse, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nome, email, casa, status, valorDepositado, repasse, usuario_id]
    );
    return result.insertId;
  },

  atualizarStatus: async (id, status, usuario_id) => {
    await db.query(
      "UPDATE contas SET status = ? WHERE id = ? AND usuario_id = ?",
      [status, id, usuario_id]
    );
  },

  verificarLancamentos: async (conta_id, usuario_id) => {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS total FROM lancamentos WHERE conta_id = ? AND usuario_id = ?",
      [conta_id, usuario_id]
    );
    return rows[0].total;
  },

  atualizarValorInicial: async (contaId, novoValor, usuarioId) => {
    await db.query(
      "UPDATE contas SET valorDepositado = ? WHERE id = ? AND usuario_id = ?",
      [novoValor, contaId, usuarioId]
    );
  },

  buscarPorId: async (id, usuario_id) => {
    const [rows] = await db.query(
      "SELECT * FROM contas WHERE id = ? AND usuario_id = ?",
      [id, usuario_id]
    );
    return rows[0]; // Retorna a conta encontrada ou undefined
  },
  
  excluirLancamentos: async (conta_id, usuario_id) => {
    await db.query(
      "DELETE FROM lancamentos WHERE conta_id = ? AND usuario_id = ?",
      [conta_id, usuario_id]
    );
  },

  excluirConta: async (id, usuario_id) => {
    await db.query(
      "DELETE FROM contas WHERE id = ? AND usuario_id = ?",
      [id, usuario_id]
    );
  }
};

