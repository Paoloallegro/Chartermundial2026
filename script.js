// 🔐 SUPABASE (CAMBIA ESTO)
const SUPABASE_URL = "https://wzmucdhsjbfxjbxvzlxo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bXVjZGhzamJmeGpieHZ6bHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjE4MTQsImV4cCI6MjA4NDQzNzgxNH0.GdUH59h2CUKBp3Z2ZASkFZdvSjI-HIOLWxlv49ykiAI";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// refs
const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const avion = document.getElementById("avion");
const seatLabel = document.getElementById("seatLabel");

const fields = ["nombre","documento","telefono","email","vendedor","precio","estadoPago","observaciones"];

const TOTAL = 170;
const COLS = ["A","B","C","D","E","F"];
let selected = null;
let data = {};

// auth
function showApp(on){
  loginScreen.style.display = on ? "none" : "flex";
  app.style.display = on ? "grid" : "none";
}

btnLogin.onclick = async () => {
  const email = loginEmail.value;
  const password = loginPass.value;

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  showApp(true);
  loadSeats();
};

btnLogout.onclick = async () => {
  await db.auth.signOut();
  showApp(false);
};

// seats
function render(){
  avion.innerHTML="";
  let count=0,fila=1;
  while(count<TOTAL){
    for(let i=0;i<6;i++){
      if(i===3) avion.appendChild(document.createElement("div"));
      if(count>=TOTAL) break;
      const id=fila+COLS[i];
      const d=data[id]||{};
      const el=document.createElement("div");
      el.className="asiento"+(selected===id?" seleccionado":"");
      el.innerHTML=`<strong>${id}</strong><br>${d.nombre||"LIBRE"}`;
      el.onclick=()=>selectSeat(id);
      avion.appendChild(el);
      count++;
    }
    fila++;
  }
}

function selectSeat(id){
  selected=id;
  seatLabel.textContent=id;
  fields.forEach(f=>document.getElementById(f).value=data[id]?.[f]||"");
  render();
}

async function loadSeats(){
  const res=await db.from("asientos").select("*");
  data={};
  res.data?.forEach(r=>data[r.asiento]=r);
  render();
}

btnGuardar.onclick = async ()=>{
  if(!selected) return;
  const payload={asiento:selected};
  fields.forEach(f=>payload[f]=document.getElementById(f).value||null);
  await db.from("asientos").upsert(payload);
  loadSeats();
};

btnLiberar.onclick = async ()=>{
  if(!selected) return;
  await db.from("asientos").delete().eq("asiento",selected);
  selected=null;
  seatLabel.textContent="—";
  loadSeats();
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

// init
(async()=>{
  const { data:s } = await db.auth.getSession();
  showApp(!!s.session);
  if(s.session) loadSeats();
})();
