/* =====================
   SUPABASE (cambia aquí)
===================== */
const SUPABASE_URL  = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";  // <-- cambia
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";              // <-- cambia

// ⚠️ No declares `supabase` para evitar: Identifier 'supabase' has already been declared
if (!window.supabase) {
  alert("No se cargó el SDK de Supabase. Revisa el <script src='https://unpkg.com/@supabase/supabase-js@2'>");
}
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* =====================
   CONFIG
===================== */
const TOTAL_ASIENTOS = 189;
const columnas = ["A","B","C","D","E","F"];

// ✅ Incluye empresa
const fields = [
  "nombre","documento","empresa","telefono","email",
  "vendedor","precio","moneda",
  "formaPago","estadoPago","fechaPago","observaciones"
];

/* =====================
   UI refs
===================== */
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");

const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const matchSelect = document.getElementById("matchSelect");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const authError = document.getElementById("authError");

const avion = document.getElementById("avion");
const seatLabel = document.getElementById("seatLabel");
const hintSelect = document.getElementById("hintSelect");
const hintRO = document.getElementById("hintRO");

const searchInput = document.getElementById("search");
const chips = Array.from(document.querySelectorAll(".chip"));

const cLibre = document.getElementById("cLibre");
const cPend  = document.getElementById("cPend"); // (MISMO ID) ahora cuenta HOLD
const cAbono = document.getElementById("cAbono");
const cPag   = document.getElementById("cPag");
const cBloq = document.getElementById("cBloq");

const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");
const btnLiberar = document.getElementById("btnLiberar");
const btnCSV = document.getElementById("btnCSV");

let seleccionado = null;
let data = {};
let filterEstado = "todos";
let searchText = "";
let isReadOnly = false;

/* =====================
   Helpers estado (compat)
   - si viene "pendiente" => lo tratamos como "hold"
===================== */
function normalizeEstado(e){
  const x = (e || "libre").toString().toLowerCase();
  return x === "pendiente" ? "hold" : x;
}

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

/* =====================
   Partido seleccionado (login)
===================== */
function applyMatchTitle(){
  const v = sessionStorage.getItem("match") || "";
  const titleEl = document.querySelector(".brand .title");
  if (!titleEl) return;

  if (v === "PA-EN") titleEl.textContent = "PANAMÁ VS INGLATERRA";
  else if (v === "PA-GH") titleEl.textContent = "PANAMÁ VS GHANA";
  else titleEl.textContent = "CHARTER";
}

// ✅ Tabla dinámica según partido
function getTableName(){
  const m = sessionStorage.getItem("match") || "";
  return (m === "PA-GH") ? "asientos_ghana" : "asientos";
}

async function getSession(){
  const { data: s } = await db.auth.getSession();
  return s.session;
}

/* =====================
   ROLES (EDITOR / VIEWER)
===================== */
function applyRole(session){
  const role = session?.user?.user_metadata?.role || "editor";
  isReadOnly = (role === "viewer");

  // marca visual + bloqueo
  app.classList.toggle("readonly", isReadOnly);
  if (hintRO) hintRO.style.display = isReadOnly ? "block" : "none";
  if (hintSelect) hintSelect.style.display = (!seleccionado && !isReadOnly) ? "block" : "none";

  // botones
  btnGuardar.disabled = isReadOnly || !seleccionado;
  btnLiberar.disabled = isReadOnly || !seleccionado;
  btnNuevo.disabled = isReadOnly;

  // inputs/selects del panel (bloqueo fuerte)
  fields.forEach(f=>{
    const el = document.getElementById(f);
    if (el) el.disabled = isReadOnly;
  });
}

/* =====================
   UI helpers
===================== */
function estadoLabel(e){
  const st = normalizeEstado(e);
  return st === "pagado" ? "PAGADO" :
         st === "abono" ? "ABONO" :
         st === "hold" ? "HOLD" :
         st === "bloqueo" ? "BLOQUEO" : "LIBRE";
}
function limpiarFormulario(){
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = "";
  });
}
function actualizarHint(){
  if (isReadOnly) {
    hintSelect.style.display = "none";
    btnGuardar.disabled = true;
    btnLiberar.disabled = true;
    btnNuevo.disabled = true;
    return;
  }
  hintSelect.style.display = seleccionado ? "none" : "block";
  btnGuardar.disabled = !seleccionado;
  btnLiberar.disabled = !seleccionado;
  btnGuardar.style.opacity = seleccionado ? "1" : ".55";
  btnLiberar.style.opacity = seleccionado ? "1" : ".55";
}


/* =====================
   BLOQUEO: permitir click pero bloquear edición
===================== */
function applySeatFormLock(){
  if (isReadOnly) return; // viewer ya bloquea todo

  const estadoActual = normalizeEstado(data[seleccionado]?.estadoPago || "libre");
  const isBloqueo = (estadoActual === "bloqueo");

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    el.disabled = isBloqueo;
  });

  const ep = document.getElementById("estadoPago");
  if (ep) ep.disabled = false; // siempre permite cambiar estado

  if (hintRO) hintRO.style.display = isBloqueo ? "block" : "none";
}


function matchSearch(info){
  if (!searchText) return true;
  const hay = [
    info?.nombre, info?.documento, info?.empresa, info?.email, info?.telefono, info?.vendedor
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(searchText);
}
function matchFilter(info){
  if (filterEstado === "todos") return true;
  const estado = normalizeEstado(info?.estadoPago || "libre");
  return estado === filterEstado;
}
function updateStats(){
  let libre = 0, hold = 0, abono = 0, pag = 0, bloq = 0;

  for (let fila = 1, count = 0; count < TOTAL_ASIENTOS; fila++) {
    for (let i = 0; i < 6 && count < TOTAL_ASIENTOS; i++) {
      const id = fila + columnas[i];
      const estado = normalizeEstado(data[id]?.estadoPago || "libre");

      if (estado === "libre") libre++;
      else if (estado === "hold") hold++;
      else if (estado === "abono") abono++;
      else if (estado === "pagado") pag++;
      else if (estado === "bloqueo") bloq++;
      count++;
    }
  }

  cLibre.textContent = libre;
  cPend.textContent = hold; // (MISMO ID) ahora muestra HOLD
  cAbono.textContent = abono;
  cPag.textContent = pag;
  if (cBloq) cBloq.textContent = bloq;
}

/* =====================
   Render asientos (avión)
===================== */
function crearAsiento(id){
  const info = data[id] || {};
  const seat = document.createElement("div");

  const estado = normalizeEstado(info.estadoPago || "libre");
  seat.className = `asiento ${estado}`;

  seat.innerHTML = `
    <div class="top">
      <span><span class="dot"></span>${id}</span>
      <span>${estadoLabel(estado)}</span>
    </div>
    <div class="name">${info.nombre || "—"}</div>
    <div class="empresa">${info.empresa || "—"}</div>
  `;

  const visible = matchSearch(info) && matchFilter(info);
  seat.style.opacity = visible ? "1" : ".18";
  seat.style.pointerEvents = visible ? "auto" : "none";

  if (estado === "bloqueo") {
    seat.classList.add("disabled");
    seat.style.cursor = "not-allowed";
  }
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
    if (!input) return;

    // compat: si lo guardado es "pendiente" lo mostramos como "hold"
    if (f === "estadoPago") input.value = normalizeEstado(data[id]?.[f] ?? "");
    else input.value = data[id]?.[f] ?? "";
  });
  applySeatFormLock();
  actualizarHint();
}

/* =====================
   Supabase CRUD
===================== */
async function cargarDesdeSupabase(){
  const session = await getSession();
  if (!session) {
    data = {};
    render();
    return;
  }

  const res = await db.from(getTableName()).select("*");
  if (res.error) {
    console.error(res.error);
    alert("Error cargando: " + res.error.message);
    return;
  }

  data = {};
  (res.data || []).forEach(r => {
    // normalizamos al cargar
    if (r && typeof r === "object") {
      r.estadoPago = normalizeEstado(r.estadoPago);
    }
    data[r.asiento] = r;
  });

  render();
}

async function guardarEnSupabase(){
  if (isReadOnly) return alert("Este usuario es solo lectura.");
  const session = await getSession();
  if (!session) return alert("Debes iniciar sesión.");
  if (!seleccionado) return alert("Selecciona un asiento");

  const payload = { asiento: seleccionado };

  fields.forEach(f => {
    const el = document.getElementById(f);
    payload[f] = el ? (el.value || null) : null;
  });

  // precio a número
  if (payload.precio !== null && payload.precio !== "") {
    const n = Number(payload.precio);
    payload.precio = Number.isFinite(n) ? n : null;
  } else payload.precio = null;

  // ✅ default ahora es HOLD
  if (!payload.estadoPago) payload.estadoPago = "hold";

  // compat: si por error llega "pendiente", lo convertimos
  payload.estadoPago = normalizeEstado(payload.estadoPago);

  const res = await db.from(getTableName()).upsert(payload).select().single();
  if (res.error) {
    console.error(res.error);
    alert("Error guardando: " + res.error.message);
    return;
  }

  // normaliza lo que vuelve
  res.data.estadoPago = normalizeEstado(res.data.estadoPago);

  data[seleccionado] = res.data;
  render();
}

async function liberarEnSupabase(){
  if (isReadOnly) return alert("Este usuario es solo lectura.");
  const session = await getSession();
  if (!session) return alert("Debes iniciar sesión.");
  if (!seleccionado) return;
  if (!confirm(`¿Liberar el asiento ${seleccionado}?`)) return;

  const res = await db.from(getTableName()).delete().eq("asiento", seleccionado);
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
    const row = [a, ...fields.map(f => {
      let v = (data[a]?.[f] ?? "");
      // compat: exporta HOLD si había pendiente
      if (f === "estadoPago") v = normalizeEstado(v);
      return v.toString().replace(/"/g,'""');
    })].map(v => `"${v}"`);

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

  const match = (matchSelect?.value || "").trim();
  if (!match) return showError("Selecciona el partido.");
  sessionStorage.setItem("match", match);

  const { data: auth, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return showError(error.message);

  setMode(true);
  applyMatchTitle();
  applyRole(auth.session);
  await cargarDesdeSupabase();
});

btnLogout.addEventListener("click", async () => {
  await db.auth.signOut();
  sessionStorage.removeItem("match");
  if (matchSelect) matchSelect.value = "";
  applyMatchTitle();
  seleccionado = null;
  isReadOnly = false;
  app.classList.remove("readonly");
  setMode(false);
  limpiarFormulario();
});

btnGuardar.addEventListener("click", guardarEnSupabase);
btnLiberar.addEventListener("click", liberarEnSupabase);

btnNuevo.addEventListener("click", () => {
  if (isReadOnly) return;
  seleccionado = null;
  document.querySelectorAll(".asiento").forEach(a => a.classList.remove("seleccionado"));
  seatLabel.textContent = "—";
  limpiarFormulario();
  if (hintRO) hintRO.style.display = "none";
  fields.forEach(f => {
    const el2 = document.getElementById(f);
    if (el2) el2.disabled = false;
  });
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
  render();

  if (logged) {
    applyRole(s.session);
    await cargarDesdeSupabase();
  }

  db.auth.onAuthStateChange((_event, session) => {
    setMode(!!session);
    if (session) {
      applyRole(session);
      cargarDesdeSupabase();
    }
  });
  actualizarHint();
})();
