/* =====================
   SUPABASE (SIN CONFLICTO)
===================== */
const SUPABASE_URL = 'https://wzmucdhsjbfxjbxvzlxo.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI';

/* 👇 USAMOS db, NO supabase */
const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON
);

/* =====================
   ELEMENTOS
===================== */
const avion = document.getElementById('avion');
const seatLabel = document.getElementById('seatLabel');

const fields = [
  'nombre','documento','telefono','email',
  'vendedor','precio','moneda',
  'formaPago','estadoPago','fechaPago','observaciones'
];

const TOTAL_ASIENTOS = 170;
const columnas = ['A','B','C','D','E','F'];

let seleccionado = null;
let data = {};

/* =====================
   UTILIDADES
===================== */
function estadoLabel(e){
  return e === 'pagado' ? 'PAGADO' :
         e === 'abono' ? 'ABONO' :
         e === 'pendiente' ? 'PEND' : 'LIBRE';
}

/* =====================
   ASIENTOS
===================== */
function crearAsiento(id){
  const info = data[id] || {};
  const seat = document.createElement('div');

  seat.className = `asiento ${info.estadoPago || 'libre'}`;
  seat.innerHTML = `
    <div class="top">
      <span><span class="dot"></span>${id}</span>
      <span>${estadoLabel(info.estadoPago)}</span>
    </div>
    <div class="name">${info.nombre || '—'}</div>
  `;

  seat.onclick = () => selectSeat(id, seat);
  return seat;
}

function render(){
  avion.innerHTML = '';
  let count = 0;
  let fila = 1;

  while (count < TOTAL_ASIENTOS) {
    for (let i = 0; i < 6; i++) {

      if (i === 3) {
        const pasillo = document.createElement('div');
        pasillo.className = 'pasillo';
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
  document.querySelectorAll('.asiento')
    .forEach(a => a.classList.remove('seleccionado'));

  seleccionado = id;
  el.classList.add('seleccionado');
  seatLabel.textContent = id;

  fields.forEach(f => {
    document.getElementById(f).value = data[id]?.[f] || '';
  });
}

/* =====================
   SUPABASE CRUD
===================== */
async function cargarDesdeSupabase(){
  const { data: rows, error } = await db
    .from('asientos')
    .select('*');

  if (error) {
    console.error(error);
    alert('Error cargando datos');
    return;
  }

  data = {};
  rows.forEach(r => data[r.asiento] = r);
  render();
}

document.getElementById('btnGuardar').onclick = async () => {
  if (!seleccionado) return alert('Selecciona un asiento');

  const payload = { asiento: seleccionado };
  fields.forEach(f => payload[f] = document.getElementById(f).value);
  if (!payload.estadoPago) payload.estadoPago = 'pendiente';

  const { error } = await db.from('asientos').upsert(payload);
  if (error) return alert('Error guardando');

  data[seleccionado] = payload;
  render();
};

document.getElementById('btnLiberar').onclick = async () => {
  if (!seleccionado) return;
  if (!confirm(`¿Liberar ${seleccionado}?`)) return;

  await db.from('asientos').delete().eq('asiento', seleccionado);
  delete data[seleccionado];
  fields.forEach(f => document.getElementById(f).value = '');
  seatLabel.textContent = '—';
  seleccionado = null;
  render();
};

/* =====================
   INICIO
===================== */
cargarDesdeSupabase();
