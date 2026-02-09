/* =====================
   CONFIGURACIÓN (usar .env en producción)
===================== */
const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";

// ⚠️ IMPORTANTE: En producción, nunca hardcodees credenciales.
// Usa un backend seguro o variables de entorno.

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
const matchSelect = document.getElementById("matchSelect");
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
let selectedSeats = new Set(); // Para selección múltiple
let data = {};
let filterEstado = "todos";
let searchText = "";
let isReadOnly = false;
let currentSession = null;

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

  // Requerido
  if (rule.required && !value) {
    return { valid: false, message: `${fieldName} es requerido` };
  }

  // Vacío permitido si no es requerido
  if (!value) return { valid: true };

  // Máximo de caracteres
  if (rule.maxLength && value.length > rule.maxLength) {
    return { valid: false, message: `${fieldName} no puede exceder ${rule.maxLength} caracteres` };
  }

  // Pattern
  if (rule.pattern && !rule.pattern.test(value)) {
    return { valid: false, message: `${fieldName} tiene formato inválido` };
  }

  // Email
  if (rule.type === "email" && value) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) {
      return { valid: false, message: "Email inválido" };
    }
  }

  // Date
  if (rule.type === "date" && value) {
    if (isNaN(Date.parse(value))) {
      return { valid: false, message: "Fecha inválida" };
    }
  }

  // Número
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
}

function showLoader(loader, show = true) {
  if (loader) loader.style.display = show ? "flex" : "none";
}

function showLoadingSpinner(show = true) {
  loadingSpinner.style.display = show ? "flex" : "none";
}

function applyMatchTitle() {
  const v = sessionStorage.getItem("match") || "";
  if (v === "PA-EN") matchTitle.textContent = "PANAMÁ VS INGLATERRA";
  else if (v === "PA-GH") matchTitle.textContent = "PANAMÁ VS GHANA";
  else matchTitle.textContent = "CHARTER";
}

function getTableName() {
  const m = sessionStorage.getItem("match") || "";
  return (m === "PA-GH") ? "asientos_ghana" : "asientos";
}

/* =====================
   MULTI-SELECT UI
===================== */
function updateMultiSelectUI() {
  const isMulti = selectedSeats.size > 0;
  
  if (isMulti) {
    // Mostrar badge de selección múltiple
    multiSelectBadge.style.display = "block";
    multiCount.textContent = selectedSeats.size;
    multiSeatLabel.style.display = "block";
    singleSeatLabel.style.display = "none";
    
    // Actualizar texto de botones
    btnGuardarText.textContent = `💾 Guardar en ${selectedSeats.size} asiento(s)`;
    btnLiberarText.textContent = `🗑 Liberar ${selectedSeats.size} asiento(s)`;
    
    // Mostrar chips de asientos seleccionados
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
    // Modo selección individual
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

  // En modo multi-select, no bloquear campos
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
  if (ep) ep.disabled = false; // siempre permite cambiar estado
  
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

  // Marcar como seleccionado si está en la lista
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
  // Detectar si se presionó Ctrl/Cmd para selección múltiple
  const isMultiSelectKey = event?.ctrlKey || event?.metaKey;
  
  if (isMultiSelectKey) {
    // Modo selección múltiple
    if (selectedSeats.has(id)) {
      // Deseleccionar
      selectedSeats.delete(id);
      el.classList.remove("multi-selected");
    } else {
      // Seleccionar
      selectedSeats.add(id);
      el.classList.add("multi-selected");
    }
    
    // Limpiar selección individual si existe
    if (seleccionado) {
      seleccionado = null;
      seatLabel.textContent = "—";
      document.querySelectorAll(".asiento.seleccionado").forEach(a => {
        if (!selectedSeats.has(a.textContent.match(/\d+[A-F]/)?.[0])) {
          a.classList.remove("seleccionado");
        }
      });
    }
    
    // Si solo hay un asiento seleccionado, cargar sus datos
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
    // Modo selección individual (comportamiento original)
    // Limpiar selección múltiple si existe
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
  
  // Determinar qué asientos guardar
  const seatsToSave = selectedSeats.size > 0 
    ? Array.from(selectedSeats) 
    : (seleccionado ? [seleccionado] : []);
  
  if (seatsToSave.length === 0) return alert("❌ Selecciona al menos un asiento");

  // Validar
  const errors = validateForm();
  if (errors.length > 0) {
    alert("❌ Errores de validación:\n" + errors.join("\n"));
    return;
  }

  // Confirmar si es multi-selección
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
    // Preparar payload base
    const basePayload = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      basePayload[f] = el ? (el.value || null) : null;
    });

    // Precio a número
    if (basePayload.precio !== null && basePayload.precio !== "") {
      const n = Number(basePayload.precio);
      basePayload.precio = Number.isFinite(n) ? n : null;
    } else {
      basePayload.precio = null;
    }

    // Default HOLD
    if (!basePayload.estadoPago) basePayload.estadoPago = "hold";
    basePayload.estadoPago = normalizeEstado(basePayload.estadoPago);

    // Guardar cada asiento
    const promises = seatsToSave.map(async (seatId) => {
      const payload = { ...basePayload, asiento: seatId };
      return db.from(getTableName()).upsert(payload).select().single();
    });

    const results = await Promise.all(promises);

    // Verificar errores
    const hasError = results.some(res => res.error);
    if (hasError) {
      const errorMsg = results.find(res => res.error)?.error.message;
      console.error("❌ Error guardando:", errorMsg);
      alert("Error guardando: " + errorMsg);
      showLoader(saveLoader, false);
      return;
    }

    // Actualizar data local
    results.forEach(res => {
      if (res.data) {
        res.data.estadoPago = normalizeEstado(res.data.estadoPago);
        data[res.data.asiento] = res.data;
      }
    });

    // Feedback visual
    const savedAlert = document.createElement("div");
    savedAlert.textContent = seatsToSave.length === 1 
      ? "✅ Guardado exitosamente"
      : `✅ ${seatsToSave.length} asientos guardados exitosamente`;
    savedAlert.style.cssText = "position:fixed;top:20px;right:20px;background:#22c55e;color:white;padding:12px 16px;border-radius:8px;z-index:1001;animation:slideUp 0.3s ease-out;";
    document.body.appendChild(savedAlert);
    setTimeout(() => savedAlert.remove(), 3000);

    render();
    
    // Re-seleccionar asientos después de renderizar
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
  
  // Determinar qué asientos liberar
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
    // Liberar cada asiento
    const promises = seatsToFree.map(seatId => 
      db.from(getTableName()).delete().eq("asiento", seatId)
    );

    const results = await Promise.all(promises);

    // Verificar errores
    const hasError = results.some(res => res.error);
    if (hasError) {
      const errorMsg = results.find(res => res.error)?.error.message;
      console.error("❌ Error liberando:", errorMsg);
      alert("Error liberando: " + errorMsg);
      showLoader(releaseLoader, false);
      return;
    }

    // Actualizar data local
    seatsToFree.forEach(seatId => {
      delete data[seatId];
    });

    limpiarFormulario();
    seatLabel.textContent = "–";
    seleccionado = null;
    clearMultiSelection();

    // Feedback visual
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

  const match = (matchSelect?.value || "").trim();
  if (!match) return showError("❌ Selecciona el partido.");

  showLoader(loginLoader, true);

  try {
    sessionStorage.setItem("match", match);

    const { data: auth, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return showError("❌ " + error.message);

    setMode(true);
    applyMatchTitle();
    applyRole(auth.session);
    await cargarDesdeSupabase();

    // Limpiar form
    loginForm.reset();
  } catch (err) {
    console.error("❌ Error:", err);
    showError("❌ Error de login: " + err.message);
  } finally {
    showLoader(loginLoader, false);
  }
}

btnLogout.addEventListener("click", async () => {
  await db.auth.signOut();
  sessionStorage.removeItem("match");
  sessionStorage.removeItem("filter");
  sessionStorage.removeItem("search");
  if (matchSelect) matchSelect.value = "";
  applyMatchTitle();
  seleccionado = null;
  clearMultiSelection();
  isReadOnly = false;
  app.classList.remove("readonly");
  setMode(false);
  limpiarFormulario();
  data = {};
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

// Naveg con teclado
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
  } catch (err) {
    console.error("❌ Init error:", err);
  }
})();

/* =====================
   SERVICE WORKER (opcional para PWA)
===================== */
if ("serviceWorker" in navigator) {
  // Descomenta si implementas un service worker
  // navigator.serviceWorker.register("/sw.js").catch(e => console.log("SW error:", e));
}
