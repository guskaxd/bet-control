const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");
const protegerAdmin = require("../middlewares/protegerAdmin");

// --- ROTAS PÚBLICAS ---
router.get("/login", (req, res) => {
    if (req.session.user && req.session.user.tipo_usuario === 'admin') {
      return res.redirect("/admin/painel");
    }
    res.render("auth/loginAdmin"); 
});

router.post("/login", authController.loginAdmin);

// --- ROTAS PROTEGIDAS ---
router.get("/painel", protegerAdmin, adminController.exibirPainel);

router.post("/usuario/:usuarioId/definir-tipo", protegerAdmin, adminController.definirTipo);

router.post("/usuario/:usuarioId/atualizar", protegerAdmin, adminController.atualizarAssinatura);
router.post("/usuario/:usuarioId/excluir", protegerAdmin, adminController.excluirUsuario);

module.exports = router;