const Auth = require("../models/authModel");

module.exports = {
  paginaLogin: (req, res) => {
    if (req.session.user) return res.redirect("/");
    res.render("auth/login");
  },

  paginaRegistro: (req, res) => {
    if (req.session.user) return res.redirect("/");
    res.render("auth/register");
  },

  registrar: async (req, res) => {
    const { email, senha } = req.body;
    try {
      await Auth.criarUsuario(email, senha);
      return res.json({ sucesso: true });
    } catch (err) {
      console.error(err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ erro: "Este email já está cadastrado." });
      }
      return res.status(500).json({ erro: "Erro ao registrar usuário." });
    }
  },

  // NOVA FUNÇÃO DE LOGIN APENAS PARA CLIENTES
  loginCliente: async (req, res) => {
    const { email, senha } = req.body;
    try {
      const usuario = await Auth.login(email, senha);
      if (!usuario) {
        return res.status(401).json({ erro: "Email ou senha incorretos." });
      }

      // Lógica de assinatura para clientes
      if (usuario.tipo_usuario === 'cliente') {
        if (!usuario.assinatura_expira_em || new Date() > new Date(usuario.assinatura_expira_em)) {
          return res.status(401).json({ erro: "Sua assinatura está expirada ou não foi encontrada." });
        }
      }

      req.session.user = { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario };
      
      // Redireciona SEMPRE para o dashboard principal
      return res.json({ sucesso: true, redirectTo: '/' });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ erro: "Erro ao fazer login." });
    }
  },

  // NOVA FUNÇÃO DE LOGIN APENAS PARA ADMINS
  loginAdmin: async (req, res) => {
    const { email, senha } = req.body;
    try {
      const usuario = await Auth.login(email, senha);

      // Validação: O usuário existe E é um admin?
      if (!usuario || usuario.tipo_usuario !== 'admin') {
        return res.status(401).json({ erro: "Credenciais de administrador inválidas." });
      }

      req.session.user = { id: usuario.id, email: usuario.email, tipo_usuario: usuario.tipo_usuario };

      // Redireciona SEMPRE para o painel de admin
      return res.json({ sucesso: true, redirectTo: '/admin/painel' });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ erro: "Erro ao fazer login de administrador." });
    }
  },
};