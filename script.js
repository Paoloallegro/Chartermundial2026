const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const TOTAL_ASIENTOS = 189;
const columnas = ["A","B","C","D","E","F"];

let seleccionado = null;
let datos = {};

async function login(){
  const email = loginEmail.value;
  const password = loginPassword.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) return alert(error.message);

  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  cargar();
}

async function logout(){
  await supabase.auth.signOut();
  location.reload();
}

async function cargar(){
  const { data } = await supabase.from("asientos").select("*");
  datos = {};
  data?.forEach(a=>datos[a.codigo]=a);
  render();
}

function render(){
  avion.innerHTML="";
  let count=0,fila=1;

  while(count<TOTAL_ASIENTOS){
    for(let i=0;i<6;i++){
      if(i===3) avion.appendChild(document.createElement("div")).className="pasillo";
      if(count>=TOTAL_ASIENTOS) break;
      const id=fila+columnas[i];
      avion.appendChild(crearAsiento(id));
      count++;
    }
    fila++;
  }
}

function crearAsiento(id){
  const info=datos[id]||{};
  const d=document.createElement("div");
  d.className=`asiento ${info.estado||"libre"}`;
  d.innerHTML=`<strong>${id}</strong><br>${info.nombre||"LIBRE"}`;
  d.onclick=()=>select(id,d);
  return d;
}

function select(id,el){
  document.querySelectorAll(".asiento").forEach(a=>a.classList.remove("seleccionado"));
  el.classList.add("seleccionado");
  seleccionado=id;
  seatLabel.textContent=id;

  ["nombre","documento","empresa","telefono","email","vendedor","precio","estado","observaciones"]
    .forEach(f=>window[f].value=datos[id]?.[f]||"");
}

async function guardar(){
  if(!seleccionado) return;
  const payload={ codigo:seleccionado };

  ["nombre","documento","empresa","telefono","email","vendedor","precio","estado","observaciones"]
    .forEach(f=>payload[f]=window[f].value);

  await supabase.from("asientos").upsert(payload);
  cargar();
}

async function liberar(){
  if(!seleccionado) return;
  await supabase.from("asientos").delete().eq("codigo",seleccionado);
  seleccionado=null;
  cargar();
}

function exportarCSV(){
  const rows=[["Asiento","Nombre","Documento","Empresa","Telefono","Email","Vendedor","Precio","Estado","Obs"]];
  Object.values(datos).forEach(d=>{
    rows.push([d.codigo,d.nombre,d.documento,d.empresa,d.telefono,d.email,d.vendedor,d.precio,d.estado,d.observaciones]);
  });
  const csv=rows.map(r=>r.join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="asientos.csv";
  a.click();
}
