const db = require("../database");

module.exports = {
  // A função criarUsuario já está correta para o novo método
  criarUsuario: async (email, senha) => {
    const [result] = await db.query(
      "INSERT INTO usuarios (email, senha) VALUES (?, ?)",
      [email, senha]
    );
    return result.insertId;
  },

  // A função login agora busca a nova coluna da assinatura
  login: async (email, senha) => {
    const [rows] = await db.query(
      `SELECT id, email, tipo_usuario, assinatura_expira_em FROM usuarios WHERE email = ? AND senha = ? LIMIT 1`,
      [email, senha]
    );

    if (rows.length > 0) {
      return rows[0];
    }
    
    return null;
  },
};