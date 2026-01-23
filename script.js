/* =====================
   SUPABASE (UNA SOLA VEZ)
===================== */
const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co"; 
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";                 

if (!window.supabase) {
  alert("No se cargó el SDK de Supabase. Revisa que el <script> de supabase-js esté antes de script.js");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* =====================
   ELEMENTOS UI
===================== */
const avion = document.getElementById("avion") || document.getElementById("asientos");
const seatLabel = document.getElementById("seatLabel");

const fields = [
  "nombre", "documento", "telefono", "email",
  "vendedor", "precio", "moneda",
  "formaPago", "estadoPago", "fechaPago", "observaciones"
];

const TOTAL_ASIENTOS = 170;
const columnas = ["A","B","C","D","E","F"];

let seleccionado = null;
let data = {};

/* =====================
   HELPERS
===================== */
function estadoLabel(e){
  return e === "pagado" ? "PAGADO" :
         e === "abono" ? "ABONO" :
         e === "pendiente" ? "PEND" : "LIBRE";
}

function crearAsiento(id){
  const info = data[id] || {};
  const seat = document.createElement("div");

  seat.className = `asiento ${info.estadoPago || "libre"}`;
  seat.innerHTML = `
    <div class="top">
      <span><span class="dot"></span>${id}</span>
      <span>${estadoLabel(info.estadoPago)}</span>
    </div>
    <div class="name">${info.nombre || "—"}</div>
  `;

  seat.onclick = () => selectSeat(id, seat);
  return seat;
}

function render(){
  if (!avion) return;

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
}

function selectSeat(id, el){
  document.querySelectorAll(".asiento").forEach(a => a.classList.remove("seleccionado"));

  seleccionado = id;
  el.classList.add("seleccionado");
  if (seatLabel) seatLabel.textContent = id;

  fields.forEach(f => {
    const input = document.getElementById(f);
    if (input) input.value = data[id]?.[f] ?? "";
  });
}

/* =====================
   SUPABASE: CARGAR
===================== */
async function cargarDesdeSupabase(){
  try {
    console.log("CARGANDO DESDE SUPABASE...");

    const res = await db.from("asientos").select("*");

    console.log("RESPUESTA SELECT:", res);

    if (res.error) {
      alert(`Error cargando: ${res.error.message}`);
      return;
    }

    data = {};
    (res.data || []).forEach(r => {
      data[r.asiento] = r;
    });

    render();
  } catch (e) {
    console.error("EXCEPCIÓN CARGANDO:", e);
    alert("Error cargando (exception). Mira la consola.");
  }
}

/* =====================
   SUPABASE: GUARDAR / UPDATE
===================== */
document.getElementById("btnGuardar")?.addEventListener("click", async () => {
  if (!seleccionado) return alert("Selecciona un asiento");

  const payload = { asiento: seleccionado };
  fields.forEach(f => {
    const el = document.getElementById(f);
    payload[f] = el ? (el.value || null) : null;
  });

  if (!payload.estadoPago) payload.estadoPago = "pendiente";

  try {
    console.log("ENVIANDO UPSERT:", payload);

    const res = await db
      .from("asientos")
      .upsert(payload)
      .select()
      .single();

    console.log("RESPUESTA UPSERT:", res);

    if (res.error) {
      alert(`Error guardando: ${res.error.message}`);
      return;
    }

    data[seleccionado] = res.data;
    render();
  } catch (e) {
    console.error("EXCEPCIÓN GUARDANDO:", e);
    alert("Error guardando (exception). Mira la consola.");
  }
});

/* =====================
   SUPABASE: LIBERAR / DELETE
===================== */
document.getElementById("btnLiberar")?.addEventListener("click", async () => {
  if (!seleccionado) return;
  if (!confirm(`¿Liberar el asiento ${seleccionado}?`)) return;

  try {
    console.log("ELIMINANDO:", seleccionado);

    const res = await db
      .from("asientos")
      .delete()
      .eq("asiento", seleccionado);

    console.log("RESPUESTA DELETE:", res);

    if (res.error) {
      alert(`Error liberando: ${res.error.message}`);
      return;
    }

    delete data[seleccionado];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = "";
    });
    if (seatLabel) seatLabel.textContent = "—";
    seleccionado = null;

    render();
  } catch (e) {
    console.error("EXCEPCIÓN LIBERANDO:", e);
    alert("Error liberando (exception). Mira la consola.");
  }
});

/* =====================
   EXPORTAR CSV (OPCIONAL)
   Requiere botón con id="btnCSV"
===================== */
document.getElementById("btnCSV")?.addEventListener("click", () => {
  const headers = ["asiento", ...fields];
  const rows = [headers.join(",")];

  for (const a in data) {
    const row = [a, ...fields.map(f => (data[a]?.[f] ?? "").toString().replace(/,/g, " "))];
    rows.push(row.join(","));
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "asientos.csv";
  link.click();
});

/* =====================
   INIT
===================== */
render();               // pinta la grilla vacía rápido
cargarDesdeSupabase();  // luego carga datos reales
