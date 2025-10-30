
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
  
  if (document.getElementById("totalInvestido")) carregarDashboard();
  if (document.getElementById("kanbanContas")) carregarContas();
  if (document.getElementById("formConta")) initFormConta();
  if (document.getElementById("formLancamento")) initFormLancamento();
  if (document.getElementById("listaContasMultiplas")) initLancamentoMultiplo();
  if (document.getElementById("listaLancamentos")) carregarLancamentos();
  document.getElementById("filtroData")?.addEventListener("change", carregarLancamentos);
  
  // Adiciona o listener para o formulário de edição do valor inicial APENAS UMA VEZ
  const formEditarValor = document.getElementById("formEditarValorInicial");
  if (formEditarValor) {
    formEditarValor.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // O dataset.contaId será preenchido quando o modal abrir
      const contaId = e.target.dataset.contaId;
      const novoValor = document.getElementById("modalValorInicialInput").value;

      try {
        const res = await fetch(`/api/contas/${contaId}/valor-inicial`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ valorDepositado: novoValor }),
        });

        if (!res.ok) throw new Error("Falha na atualização");

        // Fecha o modal, mostra uma mensagem de sucesso e recarrega as contas
        bootstrap.Modal.getInstance(document.getElementById("modalContaDetalhes")).hide();
        mostrarToast("Valor inicial atualizado com sucesso!");
        carregarContas(); // Recarrega o Kanban para refletir a mudança

      } catch (err) {
        console.error(err);
        mostrarToast("Erro ao atualizar valor.", "danger");
      }
    });
  }
  async function carregarDashboard() {
    const tot = await fetch("/api/lancamentos/totais").then(res => res.json());
    
    const totalInvestido = parseFloat(tot.totalInvestido);
    const totalRetornado = parseFloat(tot.totalRetornado);
    const lucroBruto = totalRetornado - totalInvestido;

    // calcula lucro líquido considerando repasse
    const contas = await fetch("/api/contas").then(r => r.json());
    let lucroLiquido = 0;

    contas.forEach(c => {
      // totalInvestido e totalRetorno por conta
      const invest = parseFloat(c.totalInvestido || 0);
      const retorno = parseFloat(c.totalRetornado || 0);
      const bruto = retorno - invest;
      const repasse = parseFloat(c.repasse) || 0;
      const liquido = repasse > 0 ? bruto * (1 - repasse / 100) : bruto;
      lucroLiquido += liquido;
    });

    document.getElementById("totalInvestido").innerText = 
        parseFloat(tot.totalInvestido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("totalRetornado").innerText = 
        parseFloat(tot.totalRetornado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("lucroBruto").innerText = 
        parseFloat(tot.lucroBruto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    // NOVA LINHA - Usa o lucro líquido que já vem calculado do backend
    document.getElementById("lucroTotal").innerText = 
        parseFloat(tot.lucroTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const lucro = await fetch("/api/lancamentos/lucro").then(res => res.json());
    //const lucroTotal = await fetch("/api/lancamentos/lucro").then(res => res.json());
    const lucroDescricoes = await fetch("/api/lancamentos/lucroPorDescricao").then(res => res.json());

    const labels = lucro.map(l => new Date(l.dia).toISOString().slice(0, 10));

    // dados do lucro total
    const datasets = [
      {
        label: "Lucro Total",
        data: lucro.map(l => l.lucro),
        fill: false,
        borderColor: "#6f42c1", // roxo
        tension: 0.1
      }
    ];

    // cores por descrição
    const cores = {
      "Erro": "#F44336",              // Vermelho Forte
      "Bingo": "#4CAF50",             // Verde Vistoso
      "Duvidosa": "#FFEB3B",           // Amarelo Vívido
      "Risco": "#3F51B5",              // Azul Índigo
      "Finalização Times": "#00BCD4"   // Ciano Claro   // azul info
    };

    console.log(lucroDescricoes);


    // agrupar os dados por descrição
    const dadosPorDescricao = {};
    lucroDescricoes.forEach(item => {
      const dia = new Date(item.dia).toISOString().slice(0, 10);
      if (!dadosPorDescricao[item.descricao]) dadosPorDescricao[item.descricao] = {};
      dadosPorDescricao[item.descricao][dia] = item.lucro;
    });

    // montar um dataset para cada descrição
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


    // novo bloco: carregar totais por descrição
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

    // ativar clique em cards de categoria
    document.querySelectorAll(".card-categoria").forEach(card => {
      card.addEventListener("click", () => {
        const descricao = card.dataset.descricao;

        // toggle: se já clicado, desativa
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


    // carregar lucro por dia
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

    function formatarMoeda(valor) {
      return parseFloat(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });
    }

    renderizarTabelaLucro(lucrosDias);

    // filtros
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

  }

  function carregarContas() {
    Promise.all([
      fetch("/api/contas").then(res => res.json()),
      fetch("/api/lancamentos/lucrosPorConta").then(res => res.json())
    ]).then(([contas, lucros]) => {
      console.log(JSON.stringify(lucros));
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

        div.addEventListener("click", async (e) => {
          // Ignora clique no botão de excluir
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

    // arrastar/soltar permanece o mesmo
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
  }

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
  }

  function initFormLancamento() {
    const form = document.getElementById("formLancamento");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      fetch("/api/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      }).then(() => {
        form.reset();
        carregarLancamentos();
      });
    });
    carregarLancamentos();
  }

function formatarMoeda(valor) {
  return parseFloat(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataBr(dataIso) {
  const soData = dataIso.split("T")[0]; // pega só YYYY-MM-DD
  const [ano, mes, dia] = soData.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function carregarLancamentos() {
  const filtroData = document.getElementById("filtroData")?.value;

  let lancs = await (await fetch("/api/lancamentos")).json();

  // Filtra por data, se houver
  if (filtroData) {
    lancs = lancs.filter(l => l.data.split("T")[0] === filtroData);
  }

  // Agrupar por conta e data
  const grupos = {};

  lancs.forEach(l => {
    const data = l.data.split("T")[0]; // YYYY-MM-DD
    const key = `${l.conta_nome}_${data}`; // chave unica por conta + data
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(l);
  });

  // Obter as chaves e ordenar por data mais recente
  const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
    const dataA = a.split("_")[1];
    const dataB = b.split("_")[1];
    return new Date(dataB) - new Date(dataA); // mais recente primeiro
  });

  const lista = document.getElementById("listaLancamentos");
  lista.innerHTML = "";

  chavesOrdenadas.forEach(chave => {
    let grupo = grupos[chave];

    // Ordena dentro do grupo: primeiro Investimento, depois Retorno
    grupo.sort((a, b) => {
      const ordem = { "Investimento": 1, "Retorno": 2 };
      return (ordem[a.tipo] || 99) - (ordem[b.tipo] || 99);
    });

    // Renderiza as linhas do grupo
    grupo.forEach(l => {
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
    });
  });

  // Checkbox "selecionar todos"
  const checkTodos = document.getElementById("checkTodos");
  if (checkTodos) {
    checkTodos.addEventListener("change", e => {
      document.querySelectorAll(".check-lancamento").forEach(chk => chk.checked = e.target.checked);
    });
  }

  // Botão excluir múltiplos
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

  // Botões de excluir individual
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

  // Botões de editar
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
}

// Submit do modal de edição
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

});

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

// CÓDIGO CORRIGIDO
const btnEditarDataSelecionados = document.getElementById("btnEditarDataSelecionados");
if (btnEditarDataSelecionados) { // Adicionamos esta verificação
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

// Correção para o erro da linha ~529
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

function initLancamentoMultiplo() {
  const contasContainer = document.getElementById("listaContasMultiplas");
  const contasSelecionadas = new Set();

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
    const descricaoGlobal = document.getElementById("descricaoGlobal").value;
    if (contasSelecionadas.size === 0) return mostrarToast("Selecione ao menos uma conta.", "danger");
    if (!descricaoGlobal) return mostrarToast("Selecione uma descrição.", "danger");

    const tbody = document.getElementById("tabelaContasSelecionadas");
    tbody.innerHTML = "";

    Array.from(contasSelecionadas).forEach(id => {
      const contaEl = [...contasContainer.children].find(el => el.dataset.id === id);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="background:#f0f0f0">${contaEl.textContent}</td>
        <td><input type="number" step="0.01" class="form-control" data-id="${id}" data-tipo="investimento"></td>
        <td><input type="number" step="0.01" class="form-control" data-id="${id}" data-tipo="retorno"></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("formLotes").style.display = "block";
  });

  document.getElementById("btnLancarTodos").addEventListener("click", () => {
    const inputs = document.querySelectorAll("#tabelaContasSelecionadas input");
    const descricaoGlobal = document.getElementById("descricaoGlobal").value;

    const lancamentos = [];

    inputs.forEach(input => {
      const valor = parseFloat(input.value);
      if (!isNaN(valor)) {
        lancamentos.push({
          conta_id: input.dataset.id,
          tipo: input.dataset.tipo === "investimento" ? "Investimento" : "Retorno",
          valor,
          descricao: descricaoGlobal,
          acao: "Operação"
        });
      }
    });

    if (lancamentos.length === 0) return mostrarToast("Nenhum valor informado.", "danger");

    Promise.all(
      lancamentos.map(l =>
        fetch("/api/lancamentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(l)
        })
      )
    ).then(() => {
      mostrarToast("Lançamentos registrados!");
      document.getElementById("formLotes").style.display = "none";
      document.querySelectorAll(".conta-tag").forEach(el => el.classList.remove("selected"));
      contasSelecionadas.clear();
      carregarLancamentos();
    });
  });
}

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

    const confirmar = () => {
      btnConfirmar.removeEventListener("click", confirmar);
      resolve(true);
      modal.hide();
    };

    btnConfirmar.addEventListener("click", confirmar);
  });
}

