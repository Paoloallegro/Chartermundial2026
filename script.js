/* =====================
   SUPABASE (cambia aquí)
===================== */
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co"; // <-- cambia
const SUPABASE_ANON = "TU-ANON-PUBLIC";                 // <-- cambia

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* =====================
   UI refs
===================== */
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");

const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const authError = document.getElementById("authError");

const avion = document.getElementById("avion");
const seatLabel = document.getElementById("seatLabel");
const hintSelect = document.getElementById("hintSelect");

const searchInput = document.getElementById("search");
const chips = Array.from(document.querySelectorAll(".chip"));

const cLibre = document.getElementById("cLibre");
const cPend  = document.getElementById("cPend");
const cAbono = document.getElementById("cAbono");
const cPag   = document.getElementById("cPag");

const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");
const btnLiberar = document.getElementById("btnLiberar");
const btnCSV = document.getElementById("btnCSV");

/* Campos (coinciden con tu tabla) */
const fields = [
  "nombre","documento","telefono","email",
  "vendedor","precio","moneda",
  "formaPago","estadoPago","fechaPago","observaciones"
];

const TOTAL_ASIENTOS = 170;
const columnas = ["A","B","C","D","E","F"];

let seleccionado = null;
let data = {};
let filterEstado = "todos";
let searchText = "";

/* =====================
   Auth helpers
===================== */
function showError(msg){
  authError.style.display = msg ? "block" : "none";
  authError.textContent = msg || "";
}
function setMode(logged){
  loginScreen.style.display = logged ? "none" : "flex";
  app.style.display = logged ? "grid" : "none";
}
async function getSession(){
  const { data: s } = await db.auth.getSession();
  return s.session;
}

/* =====================
   UI helpers
===================== */
function estadoLabel(e){
  return e === "pagado" ? "PAGADO" :
         e === "abono" ? "ABONO" :
         e === "pendiente" ? "PEND" : "LIBRE";
}
function limpiarFormulario(){
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = "";
  });
}
function actualizarHint(){
  hintSelect.style.display = seleccionado ? "none" : "block";
  btnGuardar.disabled = !seleccionado;
  btnLiberar.disabled = !seleccionado;
  btnGuardar.style.opacity = seleccionado ? "1" : ".55";
  btnLiberar.style.opacity = seleccionado ? "1" : ".55";
}
function matchSearch(info){
  if (!searchText) return true;
  const hay = [
    info?.nombre, info?.documento, info?.email, info?.telefono, info?.vendedor
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(searchText);
}
function matchFilter(info){
  if (filterEstado === "todos") return true;
  const estado = (info?.estadoPago || "libre").toLowerCase();
  return estado === filterEstado;
}

function updateStats(){
  let libre = 0, pend = 0, abono = 0, pag = 0;

  for (let fila = 1, count = 0; count < TOTAL_ASIENTOS; fila++) {
    for (let i = 0; i < 6 && count < TOTAL_ASIENTOS; i++) {
      const id = fila + columnas[i];
      const estado = (data[id]?.estadoPago || "libre").toLowerCase();
      if (estado === "libre") libre++;
      else if (estado === "pendiente") pend++;
      else if (estado === "abono") abono++;
      else if (estado === "pagado") pag++;
      count++;
    }
  }

  cLibre.textContent = libre;
  cPend.textContent = pend;
  cAbono.textContent = abono;
  cPag.textContent = pag;
}

/* =====================
   Render asientos
===================== */
function crearAsiento(id){
  const info = data[id] || {};
  const seat = document.createElement("div");

  const estado = (info.estadoPago || "libre").toLowerCase();
  seat.className = `asiento ${estado}`;

  seat.innerHTML = `
    <div class="top">
      <span><span class="dot"></span>${id}</span>
      <span>${estadoLabel(estado)}</span>
    </div>
    <div class="name">${info.nombre || "—"}</div>
  `;

  const visible = matchSearch(info) && matchFilter(info);
  seat.style.opacity = visible ? "1" : ".18";
  seat.style.pointerEvents = visible ? "auto" : "none";

  seat.onclick = () => selectSeat(id, seat);
  return seat;
}

function render(){
  avion.innerHTML = "";
  let count = 0;
  let fila = 1;

  while (count < TOTAL_ASIENTOS) {
    for (let i = 0; i < 6; i++) {

      if (i === 3) {
        const pasillo = document.createElement("div");
        pasillo.className = "pasillo";
        avion.appendChild(pasillo);
      }

      if (count >= TOTAL_ASIENTOS) break;

      const id = fila + columnas[i];
      avion.appendChild(crearAsiento(id));
      count++;
    }
    fila++;
  }

  updateStats();
  actualizarHint();
}

function selectSeat(id, el){
  document.querySelectorAll(".asiento").forEach(a => a.classList.remove("seleccionado"));

  seleccionado = id;
  el.classList.add("seleccionado");
  seatLabel.textContent = id;

  fields.forEach(f => {
    const input = document.getElementById(f);
    if (input) input.value = data[id]?.[f] ?? "";
  });

  actualizarHint();
}

/* =====================
   Supabase CRUD (requiere login)
===================== */
async function cargarDesdeSupabase(){
  const session = await getSession();
  if (!session) {
    data = {};
    render();
    return;
  }

  const res = await db.from("asientos").select("*");
  if (res.error) {
    console.error(res.error);
    alert("Error cargando: " + res.error.message);
    return;
  }

  data = {};
  (res.data || []).forEach(r => { data[r.asiento] = r; });
  render();
}

async function guardarEnSupabase(){
  const session = await getSession();
  if (!session) return alert("Debes iniciar sesión.");

  if (!seleccionado) return alert("Selecciona un asiento");

  const payload = { asiento: seleccionado };

  fields.forEach(f => {
    const el = document.getElementById(f);
    payload[f] = el ? (el.value || null) : null;
  });

  // normaliza precio a número o null
  if (payload.precio !== null && payload.precio !== "") {
    const n = Number(payload.precio);
    payload.precio = Number.isFinite(n) ? n : null;
  } else {
    payload.precio = null;
  }

  if (!payload.estadoPago) payload.estadoPago = "pendiente";

  const res = await db.from("asientos").upsert(payload).select().single();
  if (res.error) {
    console.error(res.error);
    alert("Error guardando: " + res.error.message);
    return;
  }

  data[seleccionado] = res.data;
  render();
}

async function liberarEnSupabase(){
  const session = await getSession();
  if (!session) return alert("Debes iniciar sesión.");

  if (!seleccionado) return;
  if (!confirm(`¿Liberar el asiento ${seleccionado}?`)) return;

  const res = await db.from("asientos").delete().eq("asiento", seleccionado);
  if (res.error) {
    console.error(res.error);
    alert("Error liberando: " + res.error.message);
    return;
  }

  delete data[seleccionado];
  limpiarFormulario();
  seatLabel.textContent = "—";
  seleccionado = null;
  render();
}

/* =====================
   CSV
===================== */
function exportCSV(){
  const headers = ["asiento", ...fields];
  const rows = [headers.join(",")];

  for (const a in data) {
    const row = [a, ...fields.map(f => (data[a]?.[f] ?? "").toString().replace(/"/g,'""'))]
      .map(v => `"${v}"`);
    rows.push(row.join(","));
  }

  const blob = new Blob([rows.join("\n")], { type:"text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "asientos.csv";
  link.click();
}

/* =====================
   Eventos
===================== */
btnLogin.addEventListener("click", async () => {
  showError("");

  const email = (loginEmail.value || "").trim();
  const password = loginPass.value || "";

  if (!email || !password) return showError("Completa email y contraseña.");

  const { data: out, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return showError(error.message);

  setMode(true);
  await cargarDesdeSupabase();
});

btnLogout.addEventListener("click", async () => {
  await db.auth.signOut();
  seleccionado = null;
  setMode(false);
  limpiarFormulario();
});

btnGuardar.addEventListener("click", guardarEnSupabase);
btnLiberar.addEventListener("click", liberarEnSupabase);

btnNuevo.addEventListener("click", () => {
  seleccionado = null;
  document.querySelectorAll(".asiento").forEach(a => a.classList.remove("seleccionado"));
  seatLabel.textContent = "—";
  limpiarFormulario();
  actualizarHint();
});

searchInput.addEventListener("input", (e) => {
  searchText = (e.target.value || "").trim().toLowerCase();
  render();
});

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    filterEstado = chip.dataset.filter;
    render();
  });
});

btnCSV.addEventListener("click", exportCSV);

/* =====================
   INIT
===================== */
(async () => {
  const { data: s } = await db.auth.getSession();
  const logged = !!s.session;

  setMode(logged);

  // Render rápido
  render();

  if (logged) {
    await cargarDesdeSupabase();
  }

  db.auth.onAuthStateChange((_event, session) => {
    setMode(!!session);
    if (session) cargarDesdeSupabase();
  });

  actualizarHint();
})();
