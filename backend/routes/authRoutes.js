const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");

// Telas
router.get("/login", controller.paginaLogin);
router.get("/register", controller.paginaRegistro);

// Ações
router.post("/register", controller.registrar);
router.post("/login", controller.loginCliente);


module.exports = router;
