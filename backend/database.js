const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "mysql",
  user: "betcontrol",
  password: "betcontrol",
  database: "betcontrol",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0,
  timezone: 'America/Sao_Paulo'
});

// Testa a conexão
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err);
  } else {
    console.log("Conectado ao MySQL!");
    connection.release(); // devolve a conexão para o pool
  }
});

module.exports = pool.promise(); // exporta versão com Promises

