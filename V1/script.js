const types = {

  hours: {
    title: "Registrar horas complementares",
    desc: "Informe os dados da atividade que deseja registrar.",
    fields: [
      { id: "activity", label: "Nome da atividade", type: "text", required: true, help: "Ex.: participação em palestra de tecnologia." },
      { id: "period", label: "Período letivo", type: "select", required: true, options: ["2026/1", "2026/2", "2025/2"] },
      { id: "category", label: "Tipo de atividade", type: "select", required: true, options: ["Evento / palestra", "Curso / capacitação", "Projeto / monitoria", "Outra atividade"] },
      { id: "hours", label: "Carga horária (horas)", type: "number", required: true, help: "Informe um número maior que zero.", min: 1 },
      { id: "details", label: "Observações (opcional)", type: "textarea", required: false, full: true }
    ]
  },

  extension: {
    title: "Submeter projeto de extensão",
    desc: "Informe os dados básicos do projeto de extensão.",
    fields: [
      { id: "project", label: "Título do projeto", type: "text", required: true },
      { id: "coordinator", label: "Responsável / orientador", type: "text", required: true },
      { id: "period", label: "Período de execução", type: "text", required: true, help: "Ex.: março a novembro de 2027." },
      { id: "summary", label: "Resumo e objetivo", type: "textarea", required: true, full: true }
    ]
  },

  research: {
    title: "Submeter projeto de pesquisa",
    desc: "Informe os dados básicos da proposta de pesquisa.",
    fields: [
      { id: "project", label: "Título do projeto", type: "text", required: true },
      { id: "advisor", label: "Orientador / responsável", type: "text", required: true },
      { id: "area", label: "Área de pesquisa", type: "text", required: true },
      { id: "summary", label: "Resumo e objetivo", type: "textarea", required: true, full: true }
    ]
  }

};

const STORAGE_KEY = "suapIhcDemoRecords";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let kind = "hours";
let stage = 1;
let data = {};
let records = loadRecords();
let draftValues = {};

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function notify(msg) {
  $("toast").textContent = msg;
  $("toast").classList.remove("hidden");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $("toast").classList.add("hidden"), 3000);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {}
}

function show(id) {
  ["home", "formpage", "done"].forEach(x => $(x).classList.toggle("hidden", x !== id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
  show("home");
  $("crumb").textContent = "Área do estudante / Início";
  renderRecords();
}

function viewRecords() {
  goHome();
  $("requests").scrollIntoView({ behavior: "smooth", block: "start" });
}

function start(k) {
  kind = k;
  stage = 1;
  data = {};
  draftValues = {};

  $("file").value = "";
  $("filemeta").innerHTML = "";
  $("fileerr").textContent = "";
  $("formtitle").textContent = types[k].title;
  $("formdesc").textContent = types[k].desc;

  renderFields();
  renderStage();
  show("formpage");
  $("crumb").textContent = "Área do estudante / " + types[k].title;
}

function buildControl(f) {
  const required = f.required ? "required" : "";

  if (f.type === "select") {
    const options = f.options.map(o => `<option>${o}</option>`).join("");
    return `<select id="${f.id}" ${required}>
              <option value="">Selecione uma opção</option>${options}
            </select>`;
  }

  if (f.type === "textarea") {
    return `<textarea id="${f.id}" rows="3" ${required} placeholder="Digite aqui..."></textarea>`;
  }

  const min = f.min ? `min="${f.min}"` : "";
  const placeholder = f.type === "number" ? "Ex.: 4" : "Digite aqui...";
  return `<input id="${f.id}" type="${f.type}" ${required} ${min} placeholder="${placeholder}">`;
}

function buildField(f) {
  return `
    <div class="${f.full ? "full" : ""}">
      <label for="${f.id}">${f.label}${f.required ? " *" : ""}</label>
      ${buildControl(f)}
      <div class="field-error" id="err-${f.id}" role="alert"></div>
      ${f.help ? `<span class="help">${f.help}</span>` : ""}
    </div>`;
}

function renderFields() {
  const fields = types[kind].fields;

  $("fields").innerHTML =
    "<h2>Dados da solicitação</h2>" +
    "<div class='formgrid'>" + fields.map(buildField).join("") + "</div>";

  fields.forEach(f => {
    const el = $(f.id);
    el.addEventListener("input", () => {
      el.classList.remove("invalid");
      $("err-" + f.id).textContent = "";
    });
  });
}

function renderStage() {
  $("fields").classList.toggle("hidden", stage !== 1);
  $("docs").classList.toggle("hidden", stage !== 2);
  $("review").classList.toggle("hidden", stage !== 3);

  [1, 2, 3].forEach(n => {
    const el = $("st" + n);
    el.classList.toggle("active", n === stage);
    el.classList.toggle("done", n < stage);
  });

  $("back").style.display = stage === 1 ? "none" : "inline-block";
  $("next").textContent = stage === 3 ? "Confirmar envio ✓" : "Continuar →";

  if (stage === 3) buildSummary();
}

function collect() {
  types[kind].fields.forEach(f => {
    const el = $(f.id);
    if (el) data[f.id] = el.value.trim();
  });
}

function setFieldError(el, err, message) {
  el.classList.add("invalid");
  err.textContent = message;
}

function clearFieldError(el, err) {
  el.classList.remove("invalid");
  err.textContent = "";
}

function validateFields() {
  collect();
  let first = null;

  types[kind].fields.forEach(f => {
    const el = $(f.id);
    const err = $("err-" + f.id);

    if (f.required && !data[f.id]) {
      setFieldError(el, err, "Este campo é obrigatório.");
      if (!first) first = el;
    } else if (f.type === "number" && data[f.id] && Number(data[f.id]) <= 0) {
      setFieldError(el, err, "Informe um valor maior que zero.");
      if (!first) first = el;
    } else {
      clearFieldError(el, err);
    }
  });

  if (first) {
    first.focus();
    notify("Confira os campos destacados.");
    return false;
  }
  return true;
}

function resetFileInput() {
  $("file").value = "";
  $("filemeta").innerHTML = "";
}

function removeFile() {
  resetFileInput();
  $("fileerr").textContent = "Arquivo removido.";
}

$("file").addEventListener("change", () => {
  const f = $("file").files[0];
  $("fileerr").textContent = "";

  if (!f) {
    $("filemeta").innerHTML = "";
    return;
  }

  if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) {
    $("fileerr").textContent = "Formato não aceito. Escolha PDF, PNG ou JPG.";
    resetFileInput();
    return;
  }

  if (f.size > MAX_FILE_SIZE) {
    $("fileerr").textContent = "O arquivo deve ter até 10 MB nesta demonstração.";
    resetFileInput();
    return;
  }

  $("filemeta").innerHTML = `
    <div class="file-meta">
      <span>📎 ${esc(f.name)}<br><small class="muted">${(f.size / 1024).toFixed(1)} KB</small></span>
      <button class="danger" type="button" onclick="removeFile()">Remover</button>
    </div>`;
});

function next() {
  if (stage === 1) {
    if (!validateFields()) return;
    stage = 2;
    renderStage();
    return;
  }

  if (stage === 2) {
    const f = $("file").files[0];
    if (!f) {
      $("fileerr").textContent = "Selecione um documento para continuar.";
      notify("Anexe o documento para avançar.");
      $("file").focus();
      return;
    }
    data.filename = f.name;
    stage = 3;
    renderStage();
    return;
  }

  submitForm();
}

function prev() {
  if (stage > 1) {
    if (stage === 2) collect();
    stage--;
    renderStage();
  }
}

function cancelForm() {
  if (confirm("Deseja cancelar? Os dados preenchidos neste formulário serão descartados.")) {
    goHome();
    notify("Preenchimento cancelado.");
  }
}

function submitForm() {
  const record = {
    kind,
    title: types[kind].title,
    date: new Date().toLocaleDateString("pt-BR"),
    id: "DEMO-" + String(Date.now()).slice(-6),
    status: "Enviada (demonstração)",
    data: { ...data }
  };

  records.unshift(record);
  saveRecords();

  $("doneText").textContent = record.title + " foi registrada apenas nesta demonstração.";
  $("protocol").textContent = "Identificador demonstrativo: " + record.id;

  show("done");
  $("crumb").textContent = "Área do estudante / Confirmação";
  notify("Etapas concluídas no protótipo.");
}

function buildSummary() {
  const rows = types[kind].fields.map(f => `
    <div class="summary-row">
      <div class="summary-label">${esc(f.label)}</div>
      <div>${esc(data[f.id] || "—")}</div>
    </div>`).join("");

  const fileRow = `
    <div class="summary-row">
      <div class="summary-label">Documento</div>
      <div>📎 ${esc(data.filename || "—")}</div>
    </div>`;

  $("summary").innerHTML = rows + fileRow;
}

function buildTable(list) {
  const rows = list.map(r => `
    <tr>
      <td>${esc(r.title)}</td>
      <td>${esc(r.date)}</td>
      <td><span class="tag">${esc(r.status)}</span></td>
      <td>${esc(r.id)}</td>
    </tr>`).join("");

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Processo</th><th>Data</th><th>Status</th><th>Identificador</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderRecords() {
  const query = ($("searchRecords")?.value || "").toLowerCase().trim();

  let filtered = records.filter(r => (r.title + " " + r.id).toLowerCase().includes(query));

  if ($("filterStatus")?.value === "sent") {
    filtered = filtered.filter(r => r.status);
  }

  if (!filtered.length) {
    const message = records.length
      ? "Nenhum resultado para essa busca."
      : "Você ainda não enviou solicitações neste protótipo.";
    $("requests").innerHTML = `<div class="empty">${message}</div>`;
    return;
  }

  $("requests").innerHTML = buildTable(filtered);
}

renderRecords();
