/* =====================
   CONFIGURACIÓN (usar .env en producción)
===================== */
const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";

// ⚠️ IMPORTANTE: En producción, nunca hardcodees credenciales.
// Usa un backend seguro o variables de entorno.

// ⚙️ PARTIDO POR DEFECTO: Panamá vs Inglaterra
const DEFAULT_MATCH = "PA-EN";

// ⏱️ CONFIGURACIÓN DE AUTO-LOGOUT
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos en milisegundos
const WARNING_TIME = 2 * 60 * 1000; // Advertencia 2 minutos antes
const LOGOUT_ON_CLOSE = true; // Cerrar sesión al cerrar pestaña/navegador
const SESSION_KEY = "app_session_active"; // Clave para detectar sesión activa

if (!window.supabase) {
  alert("❌ No se cargó el SDK de Supabase. Revisa el script src.");
}
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* =====================
   CONSTANTES
===================== */
const TOTAL_ASIENTOS = 189;
const columnas = ["A", "B", "C", "D", "E", "F"];

const fields = [
  "nombre", "documento", "empresa", "telefono", "email",
  "vendedor", "precio", "moneda",
  "formaPago", "estadoPago", "fechaPago", "observaciones"
];

const VALIDATION_RULES = {
  nombre: { required: false, maxLength: 100 },
  documento: { required: false, maxLength: 50 },
  empresa: { required: false, maxLength: 100 },
  telefono: { required: false, maxLength: 20, pattern: /^[0-9+\-\s\(\)]*$/ },
  email: { required: false, type: "email" },
  vendedor: { required: false, maxLength: 100 },
  precio: { required: false, min: 0, max: 99999.99 },
  moneda: { required: false },
  formaPago: { required: false },
  estadoPago: { required: true },
  fechaPago: { required: false, type: "date" },
  observaciones: { required: false, maxLength: 500 }
};

/* =====================
   UI REFS
===================== */
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const app = document.getElementById("app");
const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const btnLogin = document.getElementById("btnLogin");
const loginLoader = document.getElementById("loginLoader");
const authError = document.getElementById("authError");

const avion = document.getElementById("avion");
const seatLabel = document.getElementById("seatLabel");
const singleSeatLabel = document.getElementById("singleSeatLabel");
const multiSeatLabel = document.getElementById("multiSeatLabel");
const multiCount = document.getElementById("multiCount");
const hintSelect = document.getElementById("hintSelect");
const hintRO = document.getElementById("hintRO");
const loadingSpinner = document.getElementById("loadingSpinner");

const searchInput = document.getElementById("search");
const chips = Array.from(document.querySelectorAll(".chip"));

const cLibre = document.getElementById("cLibre");
const cPend = document.getElementById("cPend");
const cAbono = document.getElementById("cAbono");
const cPag = document.getElementById("cPag");
const cBloq = document.getElementById("cBloq");

const btnLogout = document.getElementById("btnLogout");
const btnNuevo = document.getElementById("btnNuevo");
const btnGuardar = document.getElementById("btnGuardar");
const btnGuardarText = document.getElementById("btnGuardarText");
const btnLiberar = document.getElementById("btnLiberar");
const btnLiberarText = document.getElementById("btnLiberarText");
const btnCSV = document.getElementById("btnCSV");
const seatForm = document.getElementById("seatForm");
const matchTitle = document.getElementById("matchTitle");

const saveLoader = document.getElementById("saveLoader");
const releaseLoader = document.getElementById("releaseLoader");

// Multi-select UI
const multiSelectBadge = document.getElementById("multiSelectBadge");
const selectedSeatsDisplay = document.getElementById("selectedSeatsDisplay");
const btnClearMulti = document.getElementById("btnClearMulti");

/* =====================
   STATE
===================== */
let seleccionado = null;
let selectedSeats = new Set();
let data = {};
let filterEstado = "todos";
let searchText = "";
let isReadOnly = false;
let currentSession = null;

// Estado de auto-logout
let inactivityTimer = null;
let warningTimer = null;
let warningModal = null;

/* =====================
   SESSION PERSISTENCE CONTROL
===================== */

// Marcar que la sesión está activa (usar sessionStorage)
function markSessionActive() {
  if (LOGOUT_ON_CLOSE) {
    // sessionStorage se borra al cerrar la pestaña/navegador
    sessionStorage.setItem(SESSION_KEY, "true");
  }
}

// Verificar si la sesión debe estar activa
function shouldSessionBeActive() {
  if (!LOGOUT_ON_CLOSE) return true;
  // Si no existe la marca en sessionStorage, la pestaña fue cerrada
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

// Limpiar marca de sesión activa
function clearSessionMark() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* =====================
   AUTO-LOGOUT SYSTEM
===================== */
function resetInactivityTimer() {
  // Limpiar timers existentes
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (warningModal) closeWarningModal();

  // Solo configurar si hay sesión activa
  const hasSession = app.style.display !== "none";
  if (!hasSession) return;

  // Timer para mostrar advertencia
  warningTimer = setTimeout(() => {
    showWarningModal();
  }, INACTIVITY_TIMEOUT - WARNING_TIME);

  // Timer para logout automático
  inactivityTimer = setTimeout(() => {
    autoLogout("inactividad");
  }, INACTIVITY_TIMEOUT);
}

function showWarningModal() {
  // Crear modal de advertencia
  warningModal = document.createElement("div");
  warningModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease-out;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
  `;

  let countdown = Math.floor(WARNING_TIME / 1000); // segundos
  
  modalContent.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
    <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #0f172a;">Sesión por Expirar</h2>
    <p style="color: #64748b; margin-bottom: 24px;">
      Tu sesión se cerrará en <strong id="countdown">${countdown}</strong> segundos por inactividad.
    </p>
    <button id="btnStayActive" style="
      background: linear-gradient(90deg, #3b82f6, #06b6d4);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      font-size: 15px;
      transition: all 0.2s;
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(59, 130, 246, 0.3)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
      Seguir Activo
    </button>
  `;

  warningModal.appendChild(modalContent);
  document.body.appendChild(warningModal);

  // Countdown
  const countdownEl = document.getElementById("countdown");
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdownEl) countdownEl.textContent = countdown;
    if (countdown <= 0) clearInterval(countdownInterval);
  }, 1000);

  // Botón para mantenerse activo
  document.getElementById("btnStayActive").onclick = () => {
    clearInterval(countdownInterval);
    closeWarningModal();
    resetInactivityTimer();
  };
}

function closeWarningModal() {
  if (warningModal) {
    warningModal.remove();
    warningModal = null;
  }
}

async function autoLogout(reason = "inactividad") {
  closeWarningModal();
  
  // Mostrar mensaje
  const logoutMsg = document.createElement("div");
  logoutMsg.textContent = reason === "inactividad" 
    ? "⏰ Sesión cerrada por inactividad" 
    : "👋 Sesión cerrada";
  logoutMsg.style.cssText = "position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:12px 16px;border-radius:8px;z-index:10000;animation:slideUp 0.3s ease-out;";
  document.body.appendChild(logoutMsg);
  
  setTimeout(() => logoutMsg.remove(), 3000);

  // Cerrar sesión
  await performLogout();
}

async function performLogout() {
  // Cerrar sesión en Supabase
  await db.auth.signOut();
  
  // Limpiar todo el estado
  sessionStorage.clear();
  localStorage.removeItem('supabase.auth.token'); // Limpiar token de Supabase
  
  applyMatchTitle();
  seleccionado = null;
  clearMultiSelection();
  isReadOnly = false;
  app.classList.remove("readonly");
  setMode(false);
  limpiarFormulario();
  data = {};
  
  // Limpiar timers
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (warningTimer) clearTimeout(warningTimer);
  closeWarningModal();
}

// Detectar actividad del usuario
function setupActivityListeners() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, () => {
      resetInactivityTimer();
    }, true);
  });
}

// Cerrar sesión al cerrar pestaña/navegador usando beforeunload
if (LOGOUT_ON_CLOSE) {
  window.addEventListener('beforeunload', (e) => {
    const hasSession = app.style.display !== "none";
    if (hasSession) {
      // Limpiar la marca de sesión activa
      clearSessionMark();
    }
  });

  // Para navegadores móviles y Safari
  window.addEventListener('pagehide', (e) => {
    const hasSession = app.style.display !== "none";
    if (hasSession) {
      clearSessionMark();
    }
  });

  // Al enfocar la ventana, verificar si la sesión sigue válida
  window.addEventListener('focus', async () => {
    const { data: session } = await db.auth.getSession();
    if (session.session && !shouldSessionBeActive()) {
      // La pestaña fue cerrada y reabierta, cerrar sesión
      await performLogout();
    }
  });
}

/* =====================
   HELPERS: ESTADO
===================== */
function normalizeEstado(e) {
  const x = (e || "libre").toString().toLowerCase();
  return x === "pendiente" ? "hold" : x;
}

function estadoLabel(e) {
  const st = normalizeEstado(e);
  const labels = {
    "pagado": "PAGADO",
    "abono": "ABONO",
    "hold": "HOLD",
    "bloqueo": "BLOQUEO",
    "libre": "LIBRE"
  };
  return labels[st] || "LIBRE";
}

/* =====================
   HELPERS: VALIDACIÓN
===================== */
function validateField(fieldName, value) {
  const rule = VALIDATION_RULES[fieldName];
  if (!rule) return { valid: true };

  if (rule.required && !value) {
    return { valid: false, message: `${fieldName} es requerido` };
  }

  if (!value) return { valid: true };

  if (rule.maxLength && value.length > rule.maxLength) {
    return { valid: false, message: `${fieldName} no puede exceder ${rule.maxLength} caracteres` };
  }

  if (rule.pattern && !rule.pattern.test(value)) {
    return { valid: false, message: `${fieldName} tiene formato inválido` };
  }

  if (rule.type === "email" && value) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return { valid: false, message: "Email inválido" };
    }
  }

  if (rule.type === "date" && value) {
    if (isNaN(Date.parse(value))) {
      return { valid: false, message: "Fecha inválida" };
    }
  }

  if (typeof rule.min !== "undefined" || typeof rule.max !== "undefined") {
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, message: `${fieldName} debe ser un número` };
    }
    if (typeof rule.min !== "undefined" && num < rule.min) {
      return { valid: false, message: `${fieldName} no puede ser menor a ${rule.min}` };
    }
    if (typeof rule.max !== "undefined" && num > rule.max) {
      return { valid: false, message: `${fieldName} no puede ser mayor a ${rule.max}` };
    }
  }

  return { valid: true };
}

function validateForm() {
  const errors = [];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    const validation = validateField(f, el.value);
    if (!validation.valid) {
      errors.push(validation.message);
    }
  });
  return errors;
}

/* =====================
   HELPERS: UI
===================== */
function showError(msg) {
  authError.style.display = msg ? "block" : "none";
  authError.textContent = msg || "";
}

function setMode(logged) {
  loginScreen.style.display = logged ? "none" : "flex";
  app.style.display = logged ? "grid" : "none";
  
  // Iniciar/detener timers de inactividad
  if (logged) {
    markSessionActive(); // Marcar sesión como activa
    resetInactivityTimer();
  } else {
    clearSessionMark(); // Limpiar marca de sesión
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);
    closeWarningModal();
  }
}

function showLoader(loader, show = true) {
  if (loader) loader.style.display = show ? "flex" : "none";
}

function showLoadingSpinner(show = true) {
  loadingSpinner.style.display = show ? "flex" : "none";
}

function applyMatchTitle() {
  matchTitle.textContent = "PANAMÁ VS INGLATERRA";
}

function getTableName() {
  return "asientos";
}

/* =====================
   MULTI-SELECT UI
===================== */
function updateMultiSelectUI() {
  const isMulti = selectedSeats.size > 0;
  
  if (isMulti) {
    multiSelectBadge.style.display = "block";
    multiCount.textContent = selectedSeats.size;
    multiSeatLabel.style.display = "block";
    singleSeatLabel.style.display = "none";
    
    btnGuardarText.textContent = `💾 Guardar en ${selectedSeats.size} asiento(s)`;
    btnLiberarText.textContent = `🗑 Liberar ${selectedSeats.size} asiento(s)`;
    
    selectedSeatsDisplay.innerHTML = "";
    const sortedSeats = Array.from(selectedSeats).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
    
    sortedSeats.forEach(seatId => {
      const chip = document.createElement("span");
      chip.className = "seat-chip";
      chip.textContent = seatId;
      selectedSeatsDisplay.appendChild(chip);
    });
  } else {
    multiSelectBadge.style.display = "none";
    multiSeatLabel.style.display = "none";
    singleSeatLabel.style.display = "block";
    btnGuardarText.textContent = "💾 Guardar";
    btnLiberarText.textContent = "🗑 Liberar";
  }
  
  actualizarHint();
}

function clearMultiSelection() {
  selectedSeats.clear();
  document.querySelectorAll(".asiento").forEach(a => {
    a.classList.remove("multi-selected");
  });
  updateMultiSelectUI();
}

/* =====================
   SESSION & ROLES
===================== */
async function getSession() {
  const { data: s } = await db.auth.getSession();
  return s.session;
}

function applyRole(session) {
  const role = session?.user?.user_metadata?.role || "editor";
  isReadOnly = (role === "viewer");
  currentSession = session;

  app.classList.toggle("readonly", isReadOnly);
  if (hintRO) hintRO.style.display = isReadOnly ? "block" : "none";
  if (hintSelect) hintSelect.style.display = (!seleccionado && selectedSeats.size === 0 && !isReadOnly) ? "block" : "none";

  const hasSelection = seleccionado || selectedSeats.size > 0;
  btnGuardar.disabled = isReadOnly || !hasSelection;
  btnLiberar.disabled = isReadOnly || !hasSelection;
  btnNuevo.disabled = isReadOnly;

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.disabled = isReadOnly;
  });
}

/* =====================
   FORM HELPERS
===================== */
function limpiarFormulario() {
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = "";
  });
}

function actualizarHint() {
  if (isReadOnly) {
    hintSelect.style.display = "none";
    return;
  }
  const hasSelection = seleccionado || selectedSeats.size > 0;
  hintSelect.style.display = hasSelection ? "none" : "block";
  btnGuardar.disabled = !hasSelection;
  btnLiberar.disabled = !hasSelection;
  btnGuardar.style.opacity = hasSelection ? "1" : ".55";
  btnLiberar.style.opacity = hasSelection ? "1" : ".55";
}

function applySeatFormLock() {
  if (isReadOnly) return;

  if (selectedSeats.size > 0) {
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.disabled = false;
    });
    return;
  }

  const estadoActual = normalizeEstado(data[seleccionado]?.estadoPago || "libre");
  const isBloqueo = (estadoActual === "bloqueo");

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    el.disabled = isBloqueo;
  });

  const ep = document.getElementById("estadoPago");
  if (ep) ep.disabled = false;
  
  if (hintRO) hintRO.style.display = isBloqueo ? "block" : "none";
}

/* =====================
   SEARCH & FILTER
===================== */
function matchSearch(info) {
  if (!searchText) return true;
  const hay = [
    info?.nombre, info?.documento, info?.empresa, info?.email, info?.telefono, info?.vendedor
  ].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(searchText);
}

function matchFilter(info) {
  if (filterEstado === "todos") return true;
  const estado = normalizeEstado(info?.estadoPago || "libre");
  return estado === filterEstado;
}

function saveFilterState() {
  sessionStorage.setItem("filter", filterEstado);
  sessionStorage.setItem("search", searchText);
}

function restoreFilterState() {
  const saved = sessionStorage.getItem("filter");
  if (saved) {
    filterEstado = saved;
    chips.forEach(c => {
      c.classList.toggle("active", c.dataset.filter === saved);
      c.setAttribute("aria-pressed", c.dataset.filter === saved);
    });
  }
  const savedSearch = sessionStorage.getItem("search");
  if (savedSearch) {
    searchText = savedSearch;
    searchInput.value = savedSearch;
  }
}

/* =====================
   ESTADÍSTICAS
===================== */
function updateStats() {
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
  cPend.textContent = hold;
  cAbono.textContent = abono;
  cPag.textContent = pag;
  if (cBloq) cBloq.textContent = bloq;
}

/* =====================
   RENDER ASIENTOS
===================== */
function crearAsiento(id) {
  const info = data[id] || {};
  const seat = document.createElement("div");

  const estado = normalizeEstado(info.estadoPago || "libre");
  seat.className = `asiento ${estado}`;

  const visible = matchSearch(info) && matchFilter(info);
  seat.style.opacity = visible ? "1" : ".18";
  seat.style.pointerEvents = visible ? "auto" : "none";

  seat.innerHTML = `
    <div class="top">
      <span><span class="dot"></span>${id}</span>
      <span>${estadoLabel(estado)}</span>
    </div>
    <div class="name">${info.nombre || "–"}</div>
    <div class="empresa">${info.empresa || "–"}</div>
  `;

  if (estado === "bloqueo") {
    seat.classList.add("disabled");
  }

  if (selectedSeats.has(id)) {
    seat.classList.add("multi-selected");
  }
  if (seleccionado === id && selectedSeats.size === 0) {
    seat.classList.add("seleccionado");
  }

  seat.onclick = (e) => selectSeat(id, seat, e);
  seat.setAttribute("role", "button");
  seat.setAttribute("tabindex", visible ? "0" : "-1");
  seat.setAttribute("aria-label", `Asiento ${id}: ${estadoLabel(estado)} - ${info.nombre || "Disponible"}`);

  return seat;
}

function render() {
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

function selectSeat(id, el, event) {
  const isMultiSelectKey = event?.ctrlKey || event?.metaKey;
  
  if (isMultiSelectKey) {
    if (selectedSeats.has(id)) {
      selectedSeats.delete(id);
      el.classList.remove("multi-selected");
    } else {
      selectedSeats.add(id);
      el.classList.add("multi-selected");
    }
    
    if (seleccionado) {
      seleccionado = null;
      seatLabel.textContent = "—";
      document.querySelectorAll(".asiento.seleccionado").forEach(a => {
        if (!selectedSeats.has(a.textContent.match(/\d+[A-F]/)?.[0])) {
          a.classList.remove("seleccionado");
        }
      });
    }
    
    if (selectedSeats.size === 1) {
      const singleSeat = Array.from(selectedSeats)[0];
      fields.forEach(f => {
        const input = document.getElementById(f);
        if (!input) return;
        if (f === "estadoPago") input.value = normalizeEstado(data[singleSeat]?.[f] ?? "libre");
        else input.value = data[singleSeat]?.[f] ?? "";
      });
    } else if (selectedSeats.size === 0) {
      limpiarFormulario();
    }
    
    updateMultiSelectUI();
  } else {
    if (selectedSeats.size > 0) {
      clearMultiSelection();
    }
    
    document.querySelectorAll(".asiento").forEach(a => a.classList.remove("seleccionado"));

    seleccionado = id;
    el.classList.add("seleccionado");
    el.focus();
    seatLabel.textContent = id;

    fields.forEach(f => {
      const input = document.getElementById(f);
      if (!input) return;
      if (f === "estadoPago") input.value = normalizeEstado(data[id]?.[f] ?? "libre");
      else input.value = data[id]?.[f] ?? "";
    });

    applySeatFormLock();
    actualizarHint();
  }
}

/* =====================
   SUPABASE CRUD
===================== */
async function cargarDesdeSupabase() {
  showLoadingSpinner(true);
  try {
    const session = await getSession();
    if (!session) {
      data = {};
      render();
      showLoadingSpinner(false);
      return;
    }

    const res = await db.from(getTableName()).select("*");
    if (res.error) {
      console.error("❌ Error cargando:", res.error);
      alert("Error cargando datos: " + res.error.message);
      showLoadingSpinner(false);
      return;
    }

    data = {};
    (res.data || []).forEach(r => {
      if (r && typeof r === "object") {
        r.estadoPago = normalizeEstado(r.estadoPago);
      }
      data[r.asiento] = r;
    });

    render();
    restoreFilterState();
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    showLoadingSpinner(false);
  }
}

async function guardarEnSupabase() {
  if (isReadOnly) return alert("❌ Este usuario es solo lectura.");
  const session = await getSession();
  if (!session) return alert("❌ Debes iniciar sesión.");
  
  const seatsToSave = selectedSeats.size > 0 
    ? Array.from(selectedSeats) 
    : (seleccionado ? [seleccionado] : []);
  
  if (seatsToSave.length === 0) return alert("❌ Selecciona al menos un asiento");

  const errors = validateForm();
  if (errors.length > 0) {
    alert("❌ Errores de validación:\n" + errors.join("\n"));
    return;
  }

  if (seatsToSave.length > 1) {
    const confirm = window.confirm(
      `¿Guardar la misma información en ${seatsToSave.length} asientos?\n\n` +
      `Asientos: ${seatsToSave.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      }).join(", ")}`
    );
    if (!confirm) return;
  }

  showLoader(saveLoader, true);

  try {
    const basePayload = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      basePayload[f] = el ? (el.value || null) : null;
    });

    if (basePayload.precio !== null && basePayload.precio !== "") {
      const n = Number(basePayload.precio);
      basePayload.precio = Number.isFinite(n) ? n : null;
    } else {
      basePayload.precio = null;
    }

    if (!basePayload.estadoPago) basePayload.estadoPago = "hold";
    basePayload.estadoPago = normalizeEstado(basePayload.estadoPago);

    const promises = seatsToSave.map(async (seatId) => {
      const payload = { ...basePayload, asiento: seatId };
      return db.from(getTableName()).upsert(payload).select().single();
    });

    const results = await Promise.all(promises);

    const hasError = results.some(res => res.error);
    if (hasError) {
      const errorMsg = results.find(res => res.error)?.error.message;
      console.error("❌ Error guardando:", errorMsg);
      alert("Error guardando: " + errorMsg);
      showLoader(saveLoader, false);
      return;
    }

    results.forEach(res => {
      if (res.data) {
        res.data.estadoPago = normalizeEstado(res.data.estadoPago);
        data[res.data.asiento] = res.data;
      }
    });

    const savedAlert = document.createElement("div");
    savedAlert.textContent = seatsToSave.length === 1 
      ? "✅ Guardado exitosamente"
      : `✅ ${seatsToSave.length} asientos guardados exitosamente`;
    savedAlert.style.cssText = "position:fixed;top:20px;right:20px;background:#22c55e;color:white;padding:12px 16px;border-radius:8px;z-index:1001;animation:slideUp 0.3s ease-out;";
    document.body.appendChild(savedAlert);
    setTimeout(() => savedAlert.remove(), 3000);

    render();
    
    if (selectedSeats.size > 0) {
      setTimeout(() => {
        selectedSeats.forEach(seatId => {
          const asientos = document.querySelectorAll(".asiento");
          asientos.forEach(seat => {
            if (seat.textContent.includes(seatId)) {
              seat.classList.add("multi-selected");
            }
          });
        });
      }, 100);
    } else if (seleccionado) {
      setTimeout(() => {
        const asientos = document.querySelectorAll(".asiento");
        asientos.forEach(seat => {
          if (seat.textContent.includes(seleccionado)) {
            seat.classList.add("seleccionado");
          }
        });
      }, 100);
    }
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error: " + err.message);
  } finally {
    showLoader(saveLoader, false);
  }
}

async function liberarEnSupabase() {
  if (isReadOnly) return alert("❌ Este usuario es solo lectura.");
  const session = await getSession();
  if (!session) return alert("❌ Debes iniciar sesión.");
  
  const seatsToFree = selectedSeats.size > 0 
    ? Array.from(selectedSeats) 
    : (seleccionado ? [seleccionado] : []);
  
  if (seatsToFree.length === 0) return;

  const confirmMsg = seatsToFree.length === 1
    ? `¿Liberar el asiento ${seatsToFree[0]}?`
    : `¿Liberar ${seatsToFree.length} asientos?\n\n${seatsToFree.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      }).join(", ")}`;
  
  if (!confirm(confirmMsg)) return;

  showLoader(releaseLoader, true);

  try {
    const promises = seatsToFree.map(seatId => 
      db.from(getTableName()).delete().eq("asiento", seatId)
    );

    const results = await Promise.all(promises);

    const hasError = results.some(res => res.error);
    if (hasError) {
      const errorMsg = results.find(res => res.error)?.error.message;
      console.error("❌ Error liberando:", errorMsg);
      alert("Error liberando: " + errorMsg);
      showLoader(releaseLoader, false);
      return;
    }

    seatsToFree.forEach(seatId => {
      delete data[seatId];
    });

    limpiarFormulario();
    seatLabel.textContent = "–";
    seleccionado = null;
    clearMultiSelection();

    const freedAlert = document.createElement("div");
    freedAlert.textContent = seatsToFree.length === 1
      ? "✅ Asiento liberado"
      : `✅ ${seatsToFree.length} asientos liberados`;
    freedAlert.style.cssText = "position:fixed;top:20px;right:20px;background:#22c55e;color:white;padding:12px 16px;border-radius:8px;z-index:1001;animation:slideUp 0.3s ease-out;";
    document.body.appendChild(freedAlert);
    setTimeout(() => freedAlert.remove(), 3000);

    render();
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error: " + err.message);
  } finally {
    showLoader(releaseLoader, false);
  }
}

/* =====================
   CSV EXPORT
===================== */
function exportCSV() {
  const headers = ["asiento", ...fields];
  const rows = [headers.join(",")];

  for (const a in data) {
    const row = [a, ...fields.map(f => {
      let v = (data[a]?.[f] ?? "");
      if (f === "estadoPago") v = normalizeEstado(v);
      return v.toString().replace(/"/g, '""');
    })].map(v => `"${v}"`);

    rows.push(row.join(","));
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `asientos_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* =====================
   EVENT HANDLERS
===================== */
async function handleLogin(e) {
  e.preventDefault();
  showError("");

  const email = (loginEmail.value || "").trim();
  const password = loginPass.value || "";

  if (!email || !password) return showError("❌ Completa email y contraseña.");

  showLoader(loginLoader, true);

  try {
    sessionStorage.setItem("match", DEFAULT_MATCH);

    const { data: auth, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return showError("❌ " + error.message);

    setMode(true);
    applyMatchTitle();
    applyRole(auth.session);
    await cargarDesdeSupabase();

    loginForm.reset();
  } catch (err) {
    console.error("❌ Error:", err);
    showError("❌ Error de login: " + err.message);
  } finally {
    showLoader(loginLoader, false);
  }
}

btnLogout.addEventListener("click", async () => {
  await performLogout();
});

btnGuardar.addEventListener("click", guardarEnSupabase);
btnLiberar.addEventListener("click", liberarEnSupabase);

btnNuevo.addEventListener("click", () => {
  if (isReadOnly) return;
  seleccionado = null;
  clearMultiSelection();
  document.querySelectorAll(".asiento").forEach(a => {
    a.classList.remove("seleccionado");
    a.classList.remove("multi-selected");
  });
  seatLabel.textContent = "–";
  limpiarFormulario();
  if (hintRO) hintRO.style.display = "none";
  fields.forEach(f => {
    const el2 = document.getElementById(f);
    if (el2) el2.disabled = false;
  });
  actualizarHint();
});

btnClearMulti.addEventListener("click", () => {
  clearMultiSelection();
  limpiarFormulario();
});

searchInput.addEventListener("input", (e) => {
  searchText = (e.target.value || "").trim().toLowerCase();
  saveFilterState();
  render();
});

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(c => {
      c.classList.remove("active");
      c.setAttribute("aria-pressed", "false");
    });
    chip.classList.add("active");
    chip.setAttribute("aria-pressed", "true");
    filterEstado = chip.dataset.filter;
    saveFilterState();
    render();
  });
});

btnCSV.addEventListener("click", exportCSV);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (selectedSeats.size > 0) {
      clearMultiSelection();
      limpiarFormulario();
    } else if (seleccionado) {
      seleccionado = null;
      document.querySelectorAll(".asiento").forEach(a => a.classList.remove("seleccionado"));
      limpiarFormulario();
      actualizarHint();
    }
  }
});

/* =====================
   INIT
===================== */
(async () => {
  try {
    if (!sessionStorage.getItem("match")) {
      sessionStorage.setItem("match", DEFAULT_MATCH);
    }

    const { data: s } = await db.auth.getSession();
    const logged = !!s.session;

    // Verificar si la sesión debería estar activa
    if (logged && LOGOUT_ON_CLOSE && !shouldSessionBeActive()) {
      // La pestaña fue cerrada previamente, cerrar sesión
      await performLogout();
      return;
    }

    setMode(logged);
    render();

    if (logged) {
      applyMatchTitle();
      applyRole(s.session);
      await cargarDesdeSupabase();
      setupActivityListeners();
    }

    db.auth.onAuthStateChange((_event, session) => {
      setMode(!!session);
      if (session) {
        applyMatchTitle();
        applyRole(session);
        cargarDesdeSupabase();
        setupActivityListeners();
      }
    });

    actualizarHint();
  } catch (err) {
    console.error("❌ Init error:", err);
  }
})();
