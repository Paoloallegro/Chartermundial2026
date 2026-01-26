const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const TOTAL_ASIENTOS = 189;
const columnas = ["A","B","C","D","E","F"];

const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const avion = document.getElementById("avion");
const seatLabel = document.getElementById("seatLabel");

const fields = [
  "nombre","documento","empresa","telefono","email",
  "vendedor","precio","estadoPago","observaciones"
];

let data = {};
let seleccionado = null;

function setMode(logged){
  loginScreen.style.display = logged ? "none" : "flex";
  app.style.display = logged ? "grid" : "none";
}

btnLogin.onclick = async ()=>{
  const { error } = await db.auth.signInWithPassword({
    email: loginEmail.value,
    password: loginPass.value
  });
  if(error) return alert(error.message);
  setMode(true);
  cargar();
};

btnLogout.onclick = async ()=>{
  await db.auth.signOut();
  location.reload();
};

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

async function cargar(){
  const r=await db.from("asientos").select("*");
  data={};
  r.data?.forEach(x=>data[x.asiento]=x);
  render();
}

btnGuardar.onclick = async ()=>{
  if(!seleccionado) return;
  const p={ asiento:seleccionado };
  fields.forEach(f=>p[f]=document.getElementById(f).value||null);
  await db.from("asientos").upsert(p);
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
  const blob=new Blob([rows.join("\n")],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="asientos.csv";
  a.click();
};

(async()=>{
  const { data:s } = await db.auth.getSession();
  setMode(!!s.session);
  if(s.session) cargar();
})();
