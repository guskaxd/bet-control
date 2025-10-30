const db = require("../database");

module.exports = {
  listarPorConta: async (contaId, usuario_id) => {
    const [rows] = await db.query(
      `SELECT * FROM lancamentos 
       WHERE conta_id = ? AND usuario_id = ? 
       ORDER BY data DESC`,
      [contaId, usuario_id]
    );
    return rows;
  },

  listarTodos: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT l.*, c.nome AS conta_nome, c.casa
       FROM lancamentos l
       JOIN contas c ON l.conta_id = c.id
       WHERE l.usuario_id = ?
       ORDER BY l.data DESC`,
      [usuario_id]
    );
    return rows;
  },

  cadastrar: async (dados) => {
    const { conta_id, tipo, valor, descricao, acao, usuario_id } = dados;
    const [result] = await db.query(
      "INSERT INTO lancamentos (conta_id, tipo, valor, descricao, acao, usuario_id) VALUES (?, ?, ?, ?, ?, ?)",
      [conta_id, tipo, valor, descricao, acao, usuario_id]
    );
    return result.insertId;
  },

  totais: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT 
        (SELECT IFNULL(SUM(valor), 0) FROM lancamentos WHERE tipo = 'Investimento' AND usuario_id = ?) AS totalInvestido,
        (SELECT IFNULL(SUM(valor), 0) FROM lancamentos WHERE tipo = 'Retorno' AND usuario_id = ?) AS totalRetornado`,
      [usuario_id, usuario_id]
    );
    return rows[0];
  },

  lucroPorData: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT DATE(data) AS dia,
              SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END) -
              SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END) AS lucro
       FROM lancamentos
       WHERE usuario_id = ?
       GROUP BY DATE(data)
       ORDER BY DATE(data)`,
      [usuario_id]
    );
    return rows;
  },

  lucrosPorConta: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT conta_id,
              SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END) -
              SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END) AS lucro
       FROM lancamentos
       WHERE usuario_id = ?
       GROUP BY conta_id`,
      [usuario_id]
    );
    return rows;
  },

  totaisPorDescricao: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT 
        descricao,
        SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END) AS total_investido,
        SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END) AS total_retorno,
        SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END) - 
        SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END) AS total
       FROM lancamentos
       WHERE usuario_id = ?
       GROUP BY descricao`,
      [usuario_id]
    );
    return rows;
  },

  lucroPorDataPorDescricao: async (usuario_id) => {
    const descricoes = ['Erro', 'Bingo', 'Duvidosa', 'Risco', 'Finalização Times'];
    const queries = descricoes.map(desc => `
      SELECT DATE(data) AS dia, '${desc}' AS descricao,
             SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END) -
             SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END) AS lucro
      FROM lancamentos
      WHERE descricao = ? AND usuario_id = ?
      GROUP BY DATE(data)
    `);

    const fullQuery = queries.join(' UNION ALL ') + ' ORDER BY dia';
    const params = [];
    descricoes.forEach(desc => {
      params.push(desc, usuario_id);
    });

    const [rows] = await db.query(fullQuery, params);
    return rows;
  },

  excluir: async (id, usuario_id) => {
    await db.query(
      "DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?",
      [id, usuario_id]
    );
  },

  totaisPorConta: async (contaId, usuario_id) => {
    const [rows] = await db.query(
      `SELECT 
        IFNULL(SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END), 0) AS totalInvestido,
        IFNULL(SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END), 0) AS totalRetornado,
        IFNULL(SUM(CASE WHEN tipo = 'Retorno' THEN valor ELSE 0 END) -
               SUM(CASE WHEN tipo = 'Investimento' THEN valor ELSE 0 END), 0) AS lucro
       FROM lancamentos
       WHERE conta_id = ? AND usuario_id = ?`,
      [contaId, usuario_id]
    );
    return rows[0];
  },

  // --- ADICIONE ESTA NOVA FUNÇÃO ---
  totaisAgrupadosPorConta: async (usuario_id) => {
    const [rows] = await db.query(
      `SELECT
         c.id AS conta_id,
         c.repasse,
         IFNULL(SUM(CASE WHEN l.tipo = 'Investimento' THEN l.valor ELSE 0 END), 0) AS totalInvestido,
         IFNULL(SUM(CASE WHEN l.tipo = 'Retorno' THEN l.valor ELSE 0 END), 0) AS totalRetornado
       FROM contas c
       LEFT JOIN lancamentos l ON c.id = l.conta_id AND l.usuario_id = ?
       WHERE c.usuario_id = ?
       GROUP BY c.id`,
      [usuario_id, usuario_id]
    );
    return rows;
  },
  lucroBrutoPorDiaEConta: async (usuario_id) => {
    const [rows] = await db.query(`
      SELECT 
        DATE(l.data) AS dia,
        l.conta_id,
        c.repasse,
        SUM(CASE WHEN l.tipo = 'Retorno' THEN l.valor ELSE 0 END) AS retornado,
        SUM(CASE WHEN l.tipo = 'Investimento' THEN l.valor ELSE 0 END) AS investido
      FROM lancamentos l
      JOIN contas c ON l.conta_id = c.id
      WHERE l.usuario_id = ?
      GROUP BY DATE(l.data), l.conta_id, c.repasse
      ORDER BY DATE(l.data) DESC
    `, [usuario_id]);
    return rows;
  },

  atualizar: async (id, usuario_id, data, valor) => {
    let query, params;

    if (valor !== undefined && valor !== null) {
      // Atualiza data e valor
      query = "UPDATE lancamentos SET data = ?, valor = ? WHERE id = ? AND usuario_id = ?";
      params = [data, valor, id, usuario_id];
    } else {
      // Atualiza apenas a data
      query = "UPDATE lancamentos SET data = ? WHERE id = ? AND usuario_id = ?";
      params = [data, id, usuario_id];
    }

    await db.query(query, params);
  }
};
