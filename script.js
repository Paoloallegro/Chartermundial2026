/* SUPABASE */
const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* CONFIG */
const TOTAL_ASIENTOS = 189;   // 👈 CAMBIO AQUÍ
const columnas = ["A","B","C","D","E","F"];

/* REFS */
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const avion = document.getElementById("avion");
const seatLabel = document.getElementById("seatLabel");

const fields = [
  "nombre","documento","telefono","email",
  "vendedor","precio","moneda",
  "formaPago","estadoPago","fechaPago","observaciones"
];

let data = {};
let seleccionado = null;

/* AUTH */
btnLogin.onclick = async () => {
  const { error } = await db.auth.signInWithPassword({
    email: loginEmail.value,
    password: loginPass.value
  });
  if (error) return alert(error.message);
  loginScreen.style.display="none";
  app.style.display="grid";
  cargar();
};

btnLogout.onclick = async () => {
  await db.auth.signOut();
  location.reload();
};

/* RENDER */
function render(){
  avion.innerHTML="";
  let count=0,fila=1;

  while(count<TOTAL_ASIENTOS){
    for(let i=0;i<6;i++){
      if(i===3) avion.appendChild(document.createElement("div"));
      if(count>=TOTAL_ASIENTOS) break;

      const id=fila+columnas[i];
      const info=data[id]||{};
      const el=document.createElement("div");
      el.className="asiento"+(seleccionado===id?" seleccionado":"");
      el.innerHTML=`<strong>${id}</strong><br>${info.nombre||"LIBRE"}`;
      el.onclick=()=>selectSeat(id);
      avion.appendChild(el);
      count++;
    }
    fila++;
  }
}

function selectSeat(id){
  seleccionado=id;
  seatLabel.textContent=id;
  fields.forEach(f=>document.getElementById(f).value=data[id]?.[f]||"");
  render();
}

/* CRUD */
async function cargar(){
  const res=await db.from("asientos").select("*");
  data={};
  res.data?.forEach(r=>data[r.asiento]=r);
  render();
}

btnGuardar.onclick = async ()=>{
  if(!seleccionado) return;
  const payload={asiento:seleccionado};
  fields.forEach(f=>payload[f]=document.getElementById(f).value||null);
  await db.from("asientos").upsert(payload);
  cargar();
};

btnLiberar.onclick = async ()=>{
  if(!seleccionado) return;
  await db.from("asientos").delete().eq("asiento",seleccionado);
  seleccionado=null;
  seatLabel.textContent="—";
  cargar();
};

btnCSV.onclick = ()=>{
  const rows=[["asiento",...fields].join(",")];
  for(const a in data){
    rows.push([a,...fields.map(f=>data[a]?.[f]||"")].join(","));
  }
  const b=new Blob([rows.join("\n")],{type:"text/csv"});
  const l=document.createElement("a");
  l.href=URL.createObjectURL(b);
  l.download="asientos.csv";
  l.click();
};

/* INIT */
(async()=>{
  const { data:s } = await db.auth.getSession();
  if(s.session){
    loginScreen.style.display="none";
    app.style.display="grid";
    cargar();
  }
})();
