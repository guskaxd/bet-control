const express = require("express");
const router = express.Router();
const controller = require("../controllers/contaController");

router.get("/", controller.listar);
router.post("/", controller.cadastrar);
router.put("/:id/status", controller.atualizarStatus);
router.delete("/:id", controller.excluir);
router.put("/:id/valor-inicial", controller.atualizarValorInicial);
router.get("/:id/verificar", controller.verificarLancamentos);

module.exports = router;