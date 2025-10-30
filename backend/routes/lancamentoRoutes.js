const express = require("express");
const router = express.Router();
const controller = require("../controllers/lancamentoController");

router.put("/:id", controller.atualizar); // nova rota
router.get("/lucroPorDescricao", controller.lucroPorDescricao);
router.get("/lucros-por-dia", controller.lucrosDetalhadosPorDia);
router.get("/totaisPorDescricao", controller.totaisPorDescricao);
router.get("/totaisPorConta/:id", controller.totaisPorConta);
router.get("/lucrosPorConta", controller.lucrosPorConta);
router.get("/totais", controller.totais);
router.get("/lucro", controller.lucroPorData);
router.get("/", controller.listarTodos);
router.get("/:id", controller.listarPorConta);
router.post("/", controller.cadastrar);
router.delete("/:id", controller.excluir);


module.exports = router;
