let graficoInstance;
let datasetsOriginais;
let descricaoSelecionada = null;

function formatarMoeda(valor) {
  return parseFloat(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataBr(dataIso) {
  // garante que pega só a parte da data (antes do "T")
  const soData = dataIso.split("T")[0]; // "2025-08-25"
  const [ano, mes, dia] = soData.split("-");
  return `${dia}/${mes}/${ano}`;
}

document.addEventListener("DOMContentLoaded", () => {
  
  // --- INICIALIZAÇÃO E EVENT LISTENERS ---
  
  if (document.getElementById("totalInvestido")) carregarDashboard();
  if (document.getElementById("kanbanContas")) carregarContas();
  if (document.getElementById("formConta")) initFormConta();
  if (document.getElementById("formLancamento")) initFormLancamento();
  if (document.getElementById("listaContasMultiplas")) initLancamentoMultiplo();
  if (document.getElementById("listaLancamentos")) carregarLancamentos();
  document.getElementById("filtroData")?.addEventListener("change", carregarLancamentos);
  
  // Listener para o formulário de edição do valor inicial (Modal do Kanban)
  const formEditarValor = document.getElementById("formEditarValorInicial");
  if (formEditarValor) {
    formEditarValor.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const contaId = e.target.dataset.contaId;
      const novoValor = document.getElementById("modalValorInicialInput").value;

      try {
        const res = await fetch(`/api/contas/${contaId}/valor-inicial`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ valorDepositado: novoValor }),
        });

        if (!res.ok) throw new Error("Falha na atualização");

        bootstrap.Modal.getInstance(document.getElementById("modalContaDetalhes")).hide();
        mostrarToast("Valor inicial atualizado com sucesso!");
        carregarContas(); 

      } catch (err) {
        console.error(err);
        mostrarToast("Erro ao atualizar valor.", "danger");
      }
    });
  }

  // Listener para o modal de edição de lançamento individual
  const formEditar = document.getElementById("formEditarLancamento");
  if (formEditar) {
    formEditar.addEventListener("submit", async e => {
      e.preventDefault();
      const id = document.getElementById("editarId").value;
      const data = document.getElementById("editarData").value;
      const hora = document.getElementById("editarData").dataset.hora; // preserva hora
      const valor = document.getElementById("editarValor").value;
      const dataHora = `${data}T${hora}`;

      await fetch(`/api/lancamentos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataHora, valor })
      });

      bootstrap.Modal.getInstance(document.getElementById("modalEditarLancamento")).hide();
      mostrarToast("Lançamento atualizado com sucesso!");
      carregarLancamentos();
    });
  }

  // Listener para o botão de editar datas em lote
  const btnEditarDataSelecionados = document.getElementById("btnEditarDataSelecionados");
  if (btnEditarDataSelecionados) {
    btnEditarDataSelecionados.addEventListener("click", () => {
      const selecionados = [...document.querySelectorAll(".check-lancamento:checked")].map(c => c.value);

      if (selecionados.length === 0) {
        mostrarToast("Nenhum lançamento selecionado!");
        return;
      }

      const modalEl = document.getElementById("modalEditarDataMultiplos");
      modalEl.dataset.ids = JSON.stringify(selecionados);

      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    });
  }

  // Listener para o modal de edição de datas em lote
  const formEditarMultiplos = document.getElementById("formEditarDataMultiplos");
  if (formEditarMultiplos) {
    formEditarMultiplos.addEventListener("submit", async e => {
      e.preventDefault();

      const modalEl = document.getElementById("modalEditarDataMultiplos");
      const ids = JSON.parse(modalEl.dataset.ids);
      const novaData = document.getElementById("novaDataMultiplos").value;

      for (const id of ids) {
        await fetch(`/api/lancamentos/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: novaData }) // envia apenas data
        });
      }

      bootstrap.Modal.getInstance(modalEl).hide();
      mostrarToast("Datas dos lançamentos atualizadas com sucesso!");
      carregarLancamentos();
    });
  }


  // --- DEFINIÇÕES DAS FUNÇÕES PRINCIPAIS ---

  async function carregarDashboard() {
    // 1. Carrega os totais (Investido, Retornado, Bruto, Líquido)
    const tot = await fetch("/api/lancamentos/totais").then(res => res.json());
    
    document.getElementById("totalInvestido").innerText = 
        parseFloat(tot.totalInvestido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("totalRetornado").innerText = 
        parseFloat(tot.totalRetornado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("lucroBruto").innerText = 
        parseFloat(tot.lucroBruto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("lucroTotal").innerText = 
        parseFloat(tot.lucroTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // 2. Carrega dados para o gráfico
    const lucro = await fetch("/api/lancamentos/lucro").then(res => res.json());
    const lucroDescricoes = await fetch("/api/lancamentos/lucroPorDescricao").then(res => res.json());

    const labels = lucro.map(l => new Date(l.dia).toISOString().slice(0, 10));

    const datasets = [
      {
        label: "Lucro Total",
        data: lucro.map(l => l.lucro),
        fill: false,
        borderColor: "#6f42c1", // roxo
        tension: 0.1
      }
    ];

    const cores = {
      "Erro": "#F44336",
      "Bingo": "#4CAF50",
      "Duvidosa": "#FFEB3B",
      "Risco": "#3F51B5",
      "Finalização Times": "#00BCD4"
    };

    // Agrupa os dados por descrição para o gráfico
    const dadosPorDescricao = {};
    lucroDescricoes.forEach(item => {
      const dia = new Date(item.dia).toISOString().slice(0, 10);
      if (!dadosPorDescricao[item.descricao]) dadosPorDescricao[item.descricao] = {};
      dadosPorDescricao[item.descricao][dia] = item.lucro;
    });

    // Monta um dataset para cada descrição
    for (const descricao in dadosPorDescricao) {
      const data = labels.map(dia => dadosPorDescricao[descricao][dia] ?? 0);
      datasets.push({
        label: `Lucro - ${descricao}`,
        data,
        fill: false,
        borderColor: cores[descricao] || "gray",
        tension: 0.1
      });
    }

    // Renderiza o gráfico
    const ctx = document.getElementById("graficoLucro");
    graficoInstance = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    datasetsOriginais = datasets; // guardamos o original

    // 3. Carrega os cards de categoria (totais por descrição)
    const desc = await fetch("/api/lancamentos/totaisPorDescricao").then(r => r.json());
    const cardArea = document.getElementById("cardsPorDescricao");

    const descricoes = [
      { chave: "Erro", cor: "danger" },
      { chave: "Bingo", cor: "success" },
      { chave: "Duvidosa", cor: "warning" },
      { chave: "Risco", cor: "primary" },
      { chave: "Finalização Times", cor: "info" }
    ];

    cardArea.innerHTML = "";
    descricoes.forEach(d => {
      const total = desc[d.chave] ?? 0;
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4 col-xl-2 mb-3";
      col.innerHTML = `
        <div class="card text-bg-${d.cor} card-categoria" data-descricao="${d.chave}" style="cursor: pointer;">
          <div class="card-body">
            <h5>${d.chave}</h5>
            <p>${formatarMoeda(total)}</p>
          </div>
        </div>
      `;
      cardArea.appendChild(col);
    });

    // Ativa o clique nos cards de categoria para filtrar o gráfico
    document.querySelectorAll(".card-categoria").forEach(card => {
      card.addEventListener("click", () => {
        const descricao = card.dataset.descricao;

        if (descricaoSelecionada === descricao) {
          descricaoSelecionada = null;
          resetarCards();
          atualizarGrafico(datasetsOriginais);
        } else {
          descricaoSelecionada = descricao;
          destacarCard(descricao);
          const novoDataset = datasetsOriginais.filter(ds =>
            ds.label === `Lucro - ${descricao}`
          );
          atualizarGrafico([...novoDataset]);
        }
      });
    });

    // 4. Carrega a tabela de "Lucro por Dia"
    const lucrosDias = await fetch("/api/lancamentos/lucros-por-dia").then(res => res.json());
    const corpoTabela = document.getElementById("tabelaLucroPorDia");

    function renderizarTabelaLucro(dados) {
      corpoTabela.innerHTML = "";
      dados.forEach(l => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatarDataBr(l.dia)}</td>
          <td class="text-danger">${formatarMoeda(l.totalInvestido)}</td>
          <td class="text-success">${formatarMoeda(l.totalRetornado)}</td>
          <td style="color:${l.lucroBruto >= 0 ? 'gray' : 'red'}">${formatarMoeda(l.lucroBruto)}</td>
          <td style="color:${l.lucroLiquido >= 0 ? 'green' : 'red'}">
            <strong>${formatarMoeda(l.lucroLiquido)}</strong>
          </td>
        `;
        corpoTabela.appendChild(tr);
      });
    }

    renderizarTabelaLucro(lucrosDias);

    // Filtros da tabela de Lucro por Dia
    document.getElementById("filtroDataInicio").addEventListener("change", aplicarFiltro);
    document.getElementById("filtroDataFim").addEventListener("change", aplicarFiltro);

    function aplicarFiltro() {
      const inicio = document.getElementById("filtroDataInicio").value;
      const fim = document.getElementById("filtroDataFim").value;

      const filtrado = lucrosDias.filter(l => {
        const data = l.dia.slice(0, 10);
        return (!inicio || data >= inicio) && (!fim || data <= fim);
      });

      renderizarTabelaLucro(filtrado);
    }

    // Funções auxiliares do gráfico
    function destacarCard(descricao) {
      document.querySelectorAll(".card-categoria").forEach(card => {
        const estaAtivo = card.dataset.descricao === descricao;
        card.classList.toggle("border-3", estaAtivo);
        card.classList.toggle("border-dark", estaAtivo);
        card.style.opacity = estaAtivo ? "1" : "0.4";
      });
    }

    function resetarCards() {
      document.querySelectorAll(".card-categoria").forEach(card => {
        card.classList.remove("border-3", "border-dark");
        card.style.opacity = "1";
      });
    }

    function atualizarGrafico(novosDatasets) {
      graficoInstance.data.datasets = novosDatasets;
      graficoInstance.update();
    }
  } // Fim do carregarDashboard

  function carregarContas() {
    Promise.all([
      fetch("/api/contas").then(res => res.json()),
      fetch("/api/lancamentos/lucrosPorConta").then(res => res.json())
    ]).then(([contas, lucros]) => {
      
      ["nova", "depositada", "limitada", "perdida"].forEach(status => {
        document.getElementById(status).innerHTML = "";
      });

      contas.forEach(conta => {
        const div = document.createElement("div");
        div.className = "kanban-item";
        div.draggable = true;

        const lucro = lucros[conta.id] ?? 0;

        div.innerHTML = `
          <div style="position: relative">
            <button class="btn-close btn-sm btn-excluir-conta" data-id="${conta.id}" style="position:absolute;top:0;right:0"></button>
            <strong>${conta.nome}</strong><br>
            ${conta.casa}<br>
            <small style="color: ${lucro >= 0 ? "green" : "red"}">
              Lucro: ${formatarMoeda(lucro)}
            </small>
          </div>
        `;

        div.addEventListener("dragstart", e => {
          e.dataTransfer.setData("text/plain", conta.id);
        });

        document.getElementById(conta.status.toLowerCase().replace(" ", "")).appendChild(div);

        // Listener para excluir conta
        div.querySelector(".btn-excluir-conta").addEventListener("click", async () => {
          const id = conta.id;
          const temLancs = await fetch(`/api/contas/${id}/verificar`).then(r => r.json());

          if (temLancs.total > 0) {
            const confirmar = await confirmarAcao(`Esta conta possui ${temLancs.total} lançamentos. Deseja excluir os lançamentos também?`);
            if (!confirmar) return;
            await fetch(`/api/contas/${id}?excluirLancs=true`, { method: "DELETE" });
          } else {
            const confirmar = await confirmarAcao("Deseja realmente excluir esta conta?");
            if (!confirmar) return;
            await fetch(`/api/contas/${id}`, { method: "DELETE" });
          }

          mostrarToast("Conta excluída com sucesso!");
          carregarContas();
        });

        // Listener para abrir o modal de detalhes da conta
        div.addEventListener("click", async (e) => {
          if (e.target.classList.contains("btn-excluir-conta")) return;

          const totais = await fetch(`/api/lancamentos/totaisPorConta/${conta.id}`).then(r => r.json());

          document.getElementById("tituloModalConta").innerText = conta.nome + '(' + conta.casa + ')';
          document.getElementById("modalContaEmail").innerText = conta.email && conta.email.trim() !== "" ? conta.email : "Não Cadastrado";
          document.getElementById("modalContaInvestido").innerText = formatarMoeda(totais.totalInvestido);
          document.getElementById("modalContaRetornado").innerText = formatarMoeda(totais.totalRetornado);
          document.getElementById("modalContaLucro").innerText = formatarMoeda(totais.lucro);  
          document.getElementById("modalRepasse").innerText = conta.repasse;

          document.getElementById("modalValorInicialInput").value = parseFloat(conta.valorDepositado).toFixed(2);
          document.getElementById("formEditarValorInicial").dataset.contaId = conta.id;

          const modal = new bootstrap.Modal(document.getElementById("modalContaDetalhes"));
          modal.show();
        });

      });
    });

    // Ativa o drag-and-drop nas colunas do Kanban
    document.querySelectorAll(".kanban-col").forEach(col => {
      col.addEventListener("dragover", e => e.preventDefault());
      col.addEventListener("drop", e => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        const status = col.id;
        fetch(`/api/contas/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }).then(() => carregarContas());
      });
    });
  } // Fim do carregarContas

  function initFormConta() { 
    const form = document.getElementById("formConta");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      fetch("/api/contas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      }).then(() => {
        form.reset();
        bootstrap.Modal.getInstance(document.getElementById("modalAdicionarConta")).hide();
        carregarContas();
      });
    });
  } // Fim do initFormConta

  function initFormLancamento() {
    // Esta função (se existir no HTML) cuidaria de um formulário de lançamento único.
    // Atualmente, a lógica principal está em initLancamentoMultiplo.
    const form = document.getElementById("formLancamento");
    if(!form) return; 

    form.addEventListener("submit", e => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      fetch("/api/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados) // Envia um objeto único
      }).then(() => {
        form.reset();
        carregarLancamentos();
      });
    });
    carregarLancamentos();
  } // Fim do initFormLancamento

  async function carregarLancamentos() {
    const filtroData = document.getElementById("filtroData")?.value;

    let lancs = await (await fetch("/api/lancamentos")).json();

    if (filtroData) {
      lancs = lancs.filter(l => l.data.split("T")[0] === filtroData);
    }

    // Agrupa lançamentos da mesma operação
    const lancamentosAgrupados = {};
    const lancamentosSemOperacao = [];

    lancs.forEach(l => {
      if (l.operacao_id) {
        if (!lancamentosAgrupados[l.operacao_id]) {
          lancamentosAgrupados[l.operacao_id] = [];
        }
        lancamentosAgrupados[l.operacao_id].push(l);
      } else {
        // Guarda lançamentos antigos/individuais
        lancamentosSemOperacao.push(l);
      }
    });

    const lista = document.getElementById("listaLancamentos");
    lista.innerHTML = "";

    // Função para renderizar uma linha
    const renderRow = (l) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="check-lancamento" value="${l.id}"></td>
        <td>${l.conta_nome} (${l.casa})</td>
        <td>${l.tipo}</td>
        <td>${formatarMoeda(l.valor)}</td>
        <td>${l.descricao}</td>
        <td>${formatarDataBr(l.data)}</td>
        <td>
          <div class="dropdown">
            <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
              <i class="bi bi-chevron-down"></i>
            </button>
            <ul class="dropdown-menu">
              <li>
                <a class="dropdown-item text-primary btn-editar-lancamento" href="#"
                  data-id="${l.id}"
                  data-data="${l.data.split("T")[0]}"
                  data-hora="${l.data.split("T")[1].split(".")[0]}"
                  data-valor="${l.valor}">Editar</a>
              </li>
              <li>
                <a class="dropdown-item text-danger btn-excluir-lancamento" href="#" data-id="${l.id}">Excluir</a>
              </li>
            </ul>
          </div>
        </td>
      `;
      lista.appendChild(tr);
    };

    // Renderiza operações agrupadas (Investimento primeiro)
    Object.values(lancamentosAgrupados).forEach(grupo => {
      grupo.sort((a, b) => (a.tipo === 'Investimento' ? -1 : 1));
      grupo.forEach(renderRow);
    });

    // Renderiza lançamentos individuais/antigos
    lancamentosSemOperacao.forEach(renderRow);
    
    // --- Re-ativação dos listeners da tabela ---

    const checkTodos = document.getElementById("checkTodos");
    if (checkTodos) {
      checkTodos.checked = false; // Garante que o "check all" comece desmarcado
      checkTodos.addEventListener("change", e => {
        document.querySelectorAll(".check-lancamento").forEach(chk => chk.checked = e.target.checked);
      });
    }

    const btnExcluirSelecionados = document.getElementById("btnExcluirSelecionados");
    if (btnExcluirSelecionados) {
      btnExcluirSelecionados.addEventListener("click", async () => {
        const selecionados = [...document.querySelectorAll(".check-lancamento:checked")].map(c => c.value);
        if (selecionados.length === 0) {
          mostrarToast("Nenhum lançamento selecionado!");
          return;
        }
        const confirmar = await confirmarAcao(`Deseja excluir ${selecionados.length} lançamentos?`);
        if (!confirmar) return;

        for (const id of selecionados) {
          await fetch(`/api/lancamentos/${id}`, { method: "DELETE" });
        }
        mostrarToast("Lançamentos excluídos com sucesso!");
        carregarLancamentos();
      });
    }

    document.querySelectorAll(".btn-excluir-lancamento").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.preventDefault();
        const id = btn.dataset.id;
        const confirmar = await confirmarAcao("Deseja realmente excluir este lançamento?");
        if (!confirmar) return;
        await fetch(`/api/lancamentos/${id}`, { method: "DELETE" });
        mostrarToast("Lançamento excluído com sucesso!");
        carregarLancamentos();
      });
    });

    document.querySelectorAll(".btn-editar-lancamento").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        document.getElementById("editarId").value = btn.dataset.id;
        document.getElementById("editarData").value = btn.dataset.data;
        document.getElementById("editarData").dataset.hora = btn.dataset.hora;
        document.getElementById("editarValor").value = btn.dataset.valor;
        const modal = new bootstrap.Modal(document.getElementById("modalEditarLancamento"));
        modal.show();
      });
    });
  } // Fim do carregarLancamentos

  function initLancamentoMultiplo() {
    const contasContainer = document.getElementById("listaContasMultiplas");
    const contasSelecionadas = new Set();
    const tbodyLotes = document.getElementById("tabelaContasSelecionadas");
    const formLotes = document.getElementById("formLotes");
    const descricaoGlobalEl = document.getElementById("descricaoGlobal");

    fetch("/api/contas")
      .then(res => res.json())
      .then(contas => {
        contas
          .filter(c => c.status.toLowerCase() === "depositada")
          .forEach(c => {
            const span = document.createElement("span");
            span.className = "conta-tag";
            span.textContent = `${c.nome} (${c.casa})`;
            span.dataset.id = c.id;

            span.addEventListener("click", () => {
              const id = span.dataset.id;
              if (contasSelecionadas.has(id)) {
                contasSelecionadas.delete(id);
                span.classList.remove("selected");
              } else {
                contasSelecionadas.add(id);
                span.classList.add("selected");
              }
            });

            contasContainer.appendChild(span);
          });
      });

    document.getElementById("carregarContasSelecionadas").addEventListener("click", () => {
      const descricaoGlobal = descricaoGlobalEl.value;
      if (contasSelecionadas.size === 0) return mostrarToast("Selecione ao menos uma conta.", "danger");
      if (!descricaoGlobal) return mostrarToast("Selecione uma descrição.", "danger");

      tbodyLotes.innerHTML = "";

      Array.from(contasSelecionadas).forEach(id => {
        const contaEl = [...contasContainer.children].find(el => el.dataset.id === id);
        const tr = document.createElement("tr");
        tr.dataset.contaId = id;
        tr.innerHTML = `
          <td style="background:#f0f0f0">${contaEl.textContent}</td>
          <td><input type="number" step="0.01" class="form-control" name="investimento"></td>
          <td><input type="number" step="0.01" class="form-control" name="retorno"></td>
        `;
        tbodyLotes.appendChild(tr);
      });

      formLotes.style.display = "block";
    });

    document.getElementById("btnLancarTodos").addEventListener("click", () => {
      const linhas = tbodyLotes.querySelectorAll("tr");
      const descricaoGlobal = descricaoGlobalEl.value;
      const promessas = [];

      linhas.forEach(tr => {
        const contaId = tr.dataset.contaId;
        const valorInvestido = parseFloat(tr.querySelector("input[name='investimento']").value) || 0;
        const valorRetornado = parseFloat(tr.querySelector("input[name='retorno']").value) || 0;

        if (valorInvestido === 0 && valorRetornado === 0) {
          return; 
        }

        const operacaoId = `op-${Date.now()}-${Math.random()}`;

        const lancamentosDaOperacao = [
          {
            conta_id: contaId,
            tipo: "Investimento",
            valor: valorInvestido,
            descricao: descricaoGlobal,
            acao: "Operação",
            operacao_id: operacaoId
          },
          {
            conta_id: contaId,
            tipo: "Retorno",
            valor: valorRetornado,
            descricao: descricaoGlobal,
            acao: "Operação",
            operacao_id: operacaoId
          }
        ];

        promessas.push(
          fetch("/api/lancamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lancamentosDaOperacao)
          })
        );
      });

      if (promessas.length === 0) return mostrarToast("Nenhum valor informado.", "danger");

      Promise.all(promessas)
        .then(() => {
          mostrarToast("Lançamentos registrados!");
          formLotes.style.display = "none";
          document.querySelectorAll(".conta-tag").forEach(el => el.classList.remove("selected"));
          contasSelecionadas.clear();
          carregarLancamentos();
        })
        .catch(err => {
          console.error(err);
          mostrarToast("Erro ao registrar lançamentos.", "danger");
        });
    });
  } // Fim do initLancamentoMultiplo

}); // --- FIM DO DOMContentLoaded ---


// --- FUNÇÕES AUXILIARES GLOBAIS ---

function mostrarToast(mensagem, cor = "success") {
  const toast = document.getElementById("toastAviso");
  const body = document.getElementById("toastMensagem");
  body.innerText = mensagem;
  toast.className = `toast align-items-center text-white bg-${cor} border-0`;
  new bootstrap.Toast(toast).show();
}

function confirmarAcao(mensagem) {
  return new Promise(resolve => {
    document.getElementById("modalConfirmacaoMensagem").innerText = mensagem;
    const modal = new bootstrap.Modal(document.getElementById("modalConfirmacao"));
    modal.show();

    const btnConfirmar = document.getElementById("btnConfirmarModal");

    // Remove listener antigo para evitar cliques múltiplos
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);

    novoBtn.addEventListener("click", () => {
      resolve(true);
      modal.hide();
    });

    // Adiciona listener para o botão de cancelar (para resolver como falso)
    const btnCancelar = document.querySelector("#modalConfirmacao .btn-secondary");
    const novoBtnCancelar = btnCancelar.cloneNode(true);
    btnCancelar.parentNode.replaceChild(novoBtnCancelar, btnCancelar);

    novoBtnCancelar.addEventListener("click", () => {
      resolve(false);
      modal.hide();
    });
  });
}