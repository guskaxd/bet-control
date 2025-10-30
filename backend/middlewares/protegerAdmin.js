module.exports = (req, res, next) => {
    // Verifica se o usuário está logado E se o tipo de usuário é 'admin'
    if (req.session.user && req.session.user.tipo_usuario === 'admin') {
      return next(); // Se for admin, permite o acesso
    }
    // Se não for admin, redireciona para a página inicial
    res.redirect("/");
  };