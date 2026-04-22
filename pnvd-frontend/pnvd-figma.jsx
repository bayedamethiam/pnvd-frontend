import { useState, useEffect, useRef, useCallback } from "react";

/* ─── DESIGN TOKENS (exact from Figma) ─── */
const G = {
  bg:      "#F8FAF8",
  white:   "#FFFFFF",
  green:   "#16A34A",
  greenL:  "#DCFCE7",
  greenD:  "#14532D",
  greenM:  "#22C55E",
  red:     "#DC2626",
  redL:    "#FEF2F2",
  redBd:   "#FECACA",
  yellow:  "#D97706",
  yellowL: "#FFFBEB",
  yellowBd:"#FDE68A",
  blue:    "#2563EB",
  blueL:   "#EFF6FF",
  gray50:  "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray900: "#111827",
  border:  "#E5E7EB",
  text:    "#111827",
  textM:   "#6B7280",
  textS:   "#9CA3AF",
};

/* ─── HELPERS ─── */
const fmt  = n => Number(n).toLocaleString("fr-FR");
const clamp= (v,a,b) => Math.min(b,Math.max(a,v));

/* ─── API ─── */
const API = "http://localhost:8100/api/v1";


/* ─── NLP ─── */
async function callClaude(text) {
  const sys = `Tu es le moteur NLP de la PNVD du Sénégal. Analyse le texte. Réponds UNIQUEMENT en JSON pur sans markdown :
{"sentiment":"positif|negatif|neutre","score":<-1.0 à 1.0>,"confiance":<60-99>,"themes":["liste"],"entites":[{"nom":"","type":"PERSONNE|LIEU|ORGANISATION"}],"desinformation_score":<0-100>,"resume":"1-2 phrases"}`;
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:sys,messages:[{role:"user",content:`Texte: "${text}"`}]})
  });
  const d = await r.json();
  try{ return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim()); }catch{ return null; }
}

/* ─── MICRO COMPONENTS ─── */
function Tag({label, color="green"}) {
  const map = {
    green:  {bg:"#DCFCE7", text:"#15803D", border:"#86EFAC"},
    red:    {bg:"#FEF2F2", text:"#DC2626", border:"#FECACA"},
    yellow: {bg:"#FFFBEB", text:"#D97706", border:"#FDE68A"},
    blue:   {bg:"#EFF6FF", text:"#2563EB", border:"#BFDBFE"},
    gray:   {bg:"#F3F4F6", text:"#6B7280", border:"#E5E7EB"},
    orange: {bg:"#FFF7ED", text:"#EA580C", border:"#FED7AA"},
  };
  const s = map[color]||map.gray;
  return (
    <span style={{background:s.bg,color:s.text,border:`1px solid ${s.border}`,borderRadius:20,fontSize:11,fontWeight:600,padding:"2px 10px",whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}

function Avatar({name, size=36}) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const colors = ["#16A34A","#2563EB","#9333EA","#D97706","#DC2626","#0891B2"];
  const color = colors[name.charCodeAt(0)%colors.length];
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:size*0.35,flexShrink:0}}>
      {initials}
    </div>
  );
}

function PlatformBadge({platform}) {
  const map = {
    twitter:  {bg:"#000",     icon:"𝕏"},
    linkedin: {bg:"#0077B5",  icon:"in"},
    tiktok:   {bg:"#FF0050",  icon:"♪"},
    presse:   {bg:"#6B7280",  icon:"◈"},
    facebook: {bg:"#1877F2",  icon:"f"},
  };
  const p = map[platform]||{bg:"#6B7280",icon:"?"};
  return (
    <div style={{width:22,height:22,borderRadius:6,background:p.bg,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0}}>
      {p.icon}
    </div>
  );
}

function GreenBar({pct, height=6}) {
  return (
    <div style={{background:G.gray200,borderRadius:999,height,overflow:"hidden",flex:1}}>
      <div style={{width:`${clamp(pct,0,100)}%`,height:"100%",background:G.green,borderRadius:999,transition:"width .5s"}}/>
    </div>
  );
}

function SentBadge({s}) {
  const map={positif:{c:"green",l:"Positif"},negatif:{c:"red",l:"Négatif"},neutre:{c:"gray",l:"Neutre"}};
  const d=map[s]||map.neutre;
  return <Tag label={d.l} color={d.c}/>;
}

function Spinner({size=16}) {
  return <div style={{width:size,height:size,border:`2px solid ${G.green}44`,borderTop:`2px solid ${G.green}`,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>;
}

/* ─── SIDEBAR ICONS ─── */
const SvgIcon = ({d, size=20, children, viewBox="0 0 24 24"}) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d}/> : children}
  </svg>
);

const SIDEBAR_ICONS = [
  {
    id:"dashboard", label:"Dashboard",
    svg: <SvgIcon><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></SvgIcon>
  },
  {
    id:"flux", label:"Flux Live",
    svg: <SvgIcon><circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4"/><path d="M17.7 6.3a8 8 0 0 1 0 11.4"/><path d="M3.5 3.5a14 14 0 0 0 0 17"/><path d="M20.5 3.5a14 14 0 0 1 0 17"/></SvgIcon>
  },
  {
    id:"hashtag", label:"Mots-clés",
    svg: <SvgIcon><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></SvgIcon>
  },
  {
    id:"globe", label:"Intelligence IA",
    svg: <SvgIcon><path d="M9.5 2a6.5 6.5 0 0 1 0 9M14.5 2a6.5 6.5 0 0 0 0 9"/><path d="M12 2c-1.5 2-2.5 4-2.5 7s1 5 2.5 7c1.5-2 2.5-4 2.5-7S13.5 4 12 2z" strokeWidth="1.5"/><ellipse cx="12" cy="12" rx="10" ry="10"/><path d="M5 9h14M5 15h14"/></SvgIcon>
  },
  {
    id:"alertes", label:"Alertes",
    svg: <SvgIcon><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5"/></SvgIcon>
  },
  {
    id:"users", label:"Auteurs",
    svg: <SvgIcon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>
  },
  {
    id:"map", label:"Cartographie",
    svg: <SvgIcon><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></SvgIcon>
  },
  {
    id:"rapports", label:"Rapports",
    svg: <SvgIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></SvgIcon>
  },
  {
    id:"wifi", label:"Sources",
    svg: <SvgIcon><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></SvgIcon>
  },
  {
    id:"parametres", label:"Paramètres",
    svg: <SvgIcon viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SvgIcon>
  },
];

/* ─── ARC GAUGE ─── */
/* ═══════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════ */

/* ── ARC GAUGE SENTIMENT ── */
function ArcGauge({score=0, size=160, label=""}) {
  const s        = Math.max(-1, Math.min(1, isNaN(score)?0:score));
  const score100 = Math.round((s+1)*50); // −1→0, 0→50, +1→100
  const cx = size/2, cy = size*0.62, r = size*0.38;

  const pt = deg => {
    const rad = (deg*Math.PI)/180;
    return [cx + r*Math.cos(rad), cy - r*Math.sin(rad)];
  };
  const arc = (a1, a2) => {
    const [x1,y1]=pt(a1), [x2,y2]=pt(a2);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const angleDeg = 90*(1-s); // −1→180°, 0→90°, +1→0°
  const sw = 180-angleDeg;   // degrees swept from left

  // 5 paliers rouge→orange→jaune→lime→vert
  const SEGS = [
    {from:180,to:144,color:"#EF4444"},
    {from:144,to:108,color:"#F97316"},
    {from:108,to: 72,color:"#FBBF24"},
    {from: 72,to: 36,color:"#84CC16"},
    {from: 36,to:  0,color:"#22C55E"},
  ];
  const needleColor = score100<20?"#EF4444":score100<40?"#F97316":score100<60?"#FBBF24":score100<80?"#84CC16":"#22C55E";

  return (
    <svg width={size} height={size*0.74} viewBox={`0 0 ${size} ${size*0.74}`}>
      {/* Grey track */}
      <path d={arc(180,0)} fill="none" stroke={G.gray200} strokeWidth={13} strokeLinecap="round"/>
      {/* Paliers colorés (fond atténué) */}
      {SEGS.map((seg,i)=>(
        <path key={i} d={arc(seg.from,seg.to)}
          fill="none" stroke={seg.color} strokeWidth={13} strokeLinecap="round" opacity={0.28}/>
      ))}
      {/* Arc actif (de gauche jusqu'à l'aiguille) */}
      {sw>0&&<path
        d={sw>=180
          ? `M ${pt(180)[0]} ${pt(180)[1]} A ${r} ${r} 0 1 1 ${pt(0)[0]-0.01} ${pt(0)[1]}`
          : arc(180, angleDeg)}
        fill="none" stroke={needleColor} strokeWidth={13} strokeLinecap="round" opacity={0.95}/>}
      {/* Aiguille */}
      <line x1={cx} y1={cy}
        x2={cx+r*0.76*Math.cos((angleDeg*Math.PI)/180)}
        y2={cy-r*0.76*Math.sin((angleDeg*Math.PI)/180)}
        stroke="#1F2937" strokeWidth={2.5} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={5.5} fill="#1F2937"/>
      <circle cx={cx} cy={cy} r={2.5} fill="#fff"/>
      {/* Graduation */}
      <text x={pt(180)[0]-2} y={cy+14} fontSize={9} fill="#EF4444" textAnchor="middle" fontWeight="700">0</text>
      <text x={pt(0)[0]+2}   y={cy+14} fontSize={9} fill="#22C55E" textAnchor="middle" fontWeight="700">100</text>
      <text x={pt(90)[0]}    y={cy-r-5} fontSize={9} fill={G.textM} textAnchor="middle">50</text>
      {/* Score /100 */}
      <text x={cx} y={cy+30} fontSize={20} fontWeight="800" fill={needleColor} textAnchor="middle">{score100}</text>
      <text x={cx} y={cy+43} fontSize={9} fill={G.textM} textAnchor="middle">/100</text>
      {label&&<text x={cx} y={cy+56} fontSize={10} fill={G.textM} textAnchor="middle">{label}</text>}
    </svg>
  );
}

/* ── MINISTÈRES ── */
const MIN_IDS = ["interieur","telecoms","infrastructures"];
const MIN_META = {
  interieur:      {icon:"🏛️", color:"#4F46E5", label:"Ministère de l'Intérieur"},
  telecoms:       {icon:"📡", color:"#0891B2", label:"Télécommunications & Numérique"},
  infrastructures:{icon:"🛣️", color:"#7C3AED", label:"Infrastructures & Transports"},
};

function Ministeres() {
  const [sel,        setSel]       = useState(MIN_IDS[0]);
  const [summaries,  setSummaries] = useState({});
  const [articles,   setArticles]  = useState([]);
  const [keywords,   setKeywords]  = useState([]);
  const [topics,     setTopics]    = useState([]);
  const [platFilter, setPlatFilter]= useState("Toutes");
  const [loadSum,    setLoadSum]   = useState(true);
  const [loadArt,    setLoadArt]   = useState(false);
  const [kwOpen,     setKwOpen]    = useState(false);
  const [newKw,      setNewKw]     = useState("");
  const [newKwType,  setNewKwType] = useState("keyword");
  const [newKwWeight,setNewKwWeight]=useState(3);
  const [addingKw,   setAddingKw]  = useState(false);

  useEffect(()=>{
    setLoadSum(true);
    Promise.all(MIN_IDS.map(id=>
      fetch(`${API}/ministries/${id}/dashboard`).then(r=>r.ok?r.json():null).catch(()=>null)
    )).then(res=>{
      const m={};
      MIN_IDS.forEach((id,i)=>{ m[id]=res[i]; });
      setSummaries(m);
      setLoadSum(false);
    });
  },[]);

  useEffect(()=>{
    if(!sel) return;
    setLoadArt(true);
    setArticles([]); setKeywords([]); setTopics([]); setPlatFilter("Toutes");
    Promise.all([
      fetch(`${API}/ministries/${sel}/articles?days=90&limit=200`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/ministries/${sel}/keywords`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/ministries/${sel}/topics?days=90&limit=8`).then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]).then(([arts, kws, tops])=>{
      setArticles(arts); // déjà triés par date DESC côté backend
      setKeywords(kws);
      setTopics(tops);
      setLoadArt(false);
    });
  },[sel]);

  const meta = MIN_META[sel]||{};
  const dash = summaries[sel];
  const d7   = dash?.last_7_days||{};
  const agg  = dash?.latest_daily||{};

  // Score : priorité aggregation API, sinon calculé depuis les articles chargés
  const scoreFromArticles = articles.length > 0
    ? articles.reduce((s, a) => s + (a.sentiment_score ?? 0), 0) / articles.length
    : null;
  const score = agg.avg_score != null ? agg.avg_score
    : d7.avg_sentiment_score != null ? d7.avg_sentiment_score
    : scoreFromArticles ?? 0;

  // Comptages sentiment — priorité aux articles chargés (plus récents que les agrégats)
  const posCount = articles.length > 0
    ? articles.filter(a=>a.sentiment==="positif").length
    : (agg.positive ?? d7.positive_count ?? 0);
  const negCount = articles.length > 0
    ? articles.filter(a=>a.sentiment==="negatif").length
    : (agg.negative ?? d7.negative_count ?? 0);
  const neuCount = articles.length > 0
    ? articles.filter(a=>a.sentiment==="neutre").length
    : (agg.neutral ?? d7.neutral_count ?? 0);

  const total = posCount + negCount + neuCount || articles.length || 0;
  const posP = total>0 ? Math.round(posCount/total*100) : 0;
  const negP = total>0 ? Math.round(negCount/total*100) : 0;
  const neuP = total>0 ? Math.round(neuCount/total*100) : 0;

  // chart volume: group articles by day (last 7j)
  const dayVolume = (() => {
    const map = {};
    articles.forEach(a=>{
      if(!a.published_at) return;
      const d = a.published_at.slice(0,10);
      map[d] = (map[d]||0)+1;
    });
    const days = [];
    for(let i=6;i>=0;i--){
      const dt = new Date(); dt.setDate(dt.getDate()-i);
      const k  = dt.toISOString().slice(0,10);
      const lbl= dt.toLocaleDateString("fr-FR",{weekday:"short"});
      days.push({k, lbl, v: map[k]||0});
    }
    return days;
  })();
  const maxDay = Math.max(...dayVolume.map(d=>d.v), 1);

  // répartition plateforme
  const platCounts = {};
  articles.forEach(a=>{ platCounts[a.platform]=(platCounts[a.platform]||0)+1; });
  const platList = Object.entries(platCounts).sort((a,b)=>b[1]-a[1]);
  const totalPlat = articles.length||1;

  const platOptions = ["Toutes",...new Set(articles.map(a=>a.platform))];
  const filtered    = platFilter==="Toutes" ? articles : articles.filter(a=>a.platform===platFilter);

  const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "";
  const sentColor= s => s==="positif"?G.green:s==="negatif"?G.red:G.gray400;
  const maxTopVol= topics[0]?.vol||1;

  const addKw = async() => {
    const term = newKw.trim();
    if(!term) return;
    setAddingKw(true);
    const r = await fetch(`${API}/ministries/${sel}/keywords`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({term, term_type:newKwType, weight:Number(newKwWeight), language:"FR"})
    }).catch(()=>null);
    if(r?.ok){
      const fresh = await fetch(`${API}/ministries/${sel}/keywords`).then(r=>r.ok?r.json():[]).catch(()=>[]);
      setKeywords(fresh);
      setNewKw(""); setNewKwType("keyword"); setNewKwWeight(3);
    }
    setAddingKw(false);
  };

  const delKw = async(kwId) => {
    await fetch(`${API}/ministries/${sel}/keywords/${kwId}`,{method:"DELETE"}).catch(()=>{});
    setKeywords(p=>p.filter(k=>k.id!==kwId));
  };

  const accentColor = meta.color||G.green;

  return (
    <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:230,borderRight:`1px solid ${G.border}`,background:G.white,display:"flex",flexDirection:"column",padding:"20px 12px",gap:6,flexShrink:0,overflowY:"auto"}}>
        <div style={{fontSize:11,fontWeight:700,color:G.textS,letterSpacing:.8,textTransform:"uppercase",paddingLeft:8,marginBottom:8}}>Ministères</div>
        {MIN_IDS.map(id=>{
          const m   = MIN_META[id]||{};
          const s   = summaries[id];
          const sc  = s?.latest_daily?.avg_score != null ? s.latest_daily.avg_score
            : s?.last_7_days?.avg_sentiment_score != null ? s.last_7_days.avg_sentiment_score
            : 0;
          const col = sc>0.15?G.green:sc<-0.15?G.red:G.yellow;
          const tot = s?.last_7_days?.total_mentions || 0;
          const isA = sel===id;
          return (
            <button key={id} onClick={()=>setSel(id)}
              style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px",borderRadius:12,border:`1.5px solid ${isA?m.color||G.green:G.border}`,background:isA?`${m.color||G.green}0D`:"transparent",cursor:"pointer",textAlign:"left",transition:"all .15s",width:"100%"}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${m.color||G.green}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{m.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:isA?700:500,color:G.text,lineHeight:1.3,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label||id}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:col}}/>
                    <span style={{fontSize:11,color:col,fontWeight:700}}>{sc>=0?"+":""}{(sc*100).toFixed(0)}</span>
                  </div>
                  <span style={{fontSize:11,color:G.textS}}>{fmt(tot)} mentions</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── DASHBOARD PANEL ── */}
      <div style={{flex:1,overflowY:"auto",background:G.bg,padding:"0"}}>

        {/* HEADER BAND */}
        <div style={{background:`linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`,borderBottom:`1px solid ${accentColor}22`,padding:"20px 28px",display:"flex",alignItems:"center",gap:20}}>
          <div style={{width:52,height:52,borderRadius:14,background:`${accentColor}22`,border:`1.5px solid ${accentColor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
            {meta.icon}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:20,color:G.text}}>{dash?.ministry?.name||meta.label}</div>
            <div style={{fontSize:13,color:G.textM,marginTop:2}}>
              {fmt(total)} mentions · {articles.length} articles · 90 jours
            </div>
          </div>
        </div>

        <div style={{padding:"20px 28px",display:"flex",flexDirection:"column",gap:20}}>

          {/* KPI CARDS */}
          <div style={{display:"grid",gridTemplateColumns:"180px repeat(4,1fr)",gap:14}}>
            {/* Jauge sentiment */}
            <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <ArcGauge score={score} size={130}/>
            </div>
            {[
              {icon:"📊", iconBg:accentColor, l:"Mentions (7j)",  v:fmt(total),              sub:null},
              {icon:"😊", iconBg:G.green,     l:"Positif",        v:`${posP}%`,              sub:`${posCount} articles`, c:G.green},
              {icon:"😐", iconBg:G.gray500,   l:"Neutre",         v:`${neuP}%`,              sub:`${neuCount} articles`, c:G.gray500},
              {icon:"😠", iconBg:G.red,       l:"Négatif",        v:`${negP}%`,              sub:`${negCount} articles`, c:G.red},
            ].map((k,i)=>(
              <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div style={{width:46,height:46,borderRadius:12,background:k.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,opacity:.9}}>{k.icon}</div>
                <div>
                  <div style={{fontSize:11,color:G.textM,fontWeight:500,marginBottom:3}}>{k.l}</div>
                  <div style={{fontSize:24,fontWeight:800,color:k.c||G.text,lineHeight:1}}>{k.v}</div>
                  {k.sub&&<div style={{fontSize:11,color:G.textS,marginTop:2}}>{k.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* CHART + PLATEFORME */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

            {/* Volume 7 jours */}
            <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"20px 22px"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Volume — 7 jours</div>
              <div style={{fontSize:12,color:G.textM,marginBottom:18}}>Articles collectés par jour</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:6,height:88,marginBottom:8}}>
                {dayVolume.map((d,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,height:"100%",justifyContent:"flex-end"}}>
                    <div style={{fontSize:9,color:d.v===maxDay?accentColor:G.textS,fontWeight:d.v===maxDay?700:400}}>{d.v||""}</div>
                    <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:`${Math.max(4,Math.round((d.v/maxDay)*100))}%`,background:d.v===maxDay?accentColor:`${accentColor}44`,transition:"height .3s"}}/>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {dayVolume.map((d,i)=>(
                  <span key={i} style={{flex:1,textAlign:"center",fontSize:10,color:G.textS,textTransform:"capitalize"}}>{d.lbl}</span>
                ))}
              </div>
            </div>

            {/* Répartition plateformes */}
            <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"20px 22px"}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Plateformes</div>
              <div style={{fontSize:12,color:G.textM,marginBottom:16}}>Distribution des sources</div>
              {platList.length===0 ? (
                <div style={{fontSize:13,color:G.textS,textAlign:"center",padding:"24px 0"}}>Aucune donnée</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {platList.slice(0,5).map(([plat,cnt],i)=>{
                    const pct = Math.round((cnt/totalPlat)*100);
                    const platColors = {twitter:"#1DA1F2",youtube:"#FF0000",reddit:"#FF4500",presse:"#16A34A"};
                    const c = platColors[plat]||accentColor;
                    return (
                      <div key={i}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:G.text,fontWeight:500,textTransform:"capitalize"}}>{plat}</span>
                          <span style={{fontSize:12,fontWeight:700,color:c}}>{pct}% <span style={{color:G.textS,fontWeight:400}}>({cnt})</span></span>
                        </div>
                        <div style={{background:G.gray200,borderRadius:999,height:6,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:999,transition:"width .4s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* SUJETS TENDANCE */}
          <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"20px 22px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:14}}>🔥 Sujets tendance</div>
              {topics.length>0&&<Tag label={`${topics.length} sujets`} color="blue"/>}
            </div>
            {topics.length===0 ? (
              <div style={{fontSize:13,color:G.textS,textAlign:"center",padding:"16px 0"}}>Aucun sujet détecté sur la période</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {topics.map((t,i)=>{
                  const pctNeg = t.vol>0?Math.round(t.neg/t.vol*100):0;
                  const pctPos = t.vol>0?Math.round(t.pos/t.vol*100):0;
                  const barColor = pctNeg>50?G.red:pctPos>50?G.green:G.yellow;
                  return (
                    <div key={i} style={{padding:"12px 14px",background:G.gray50,borderRadius:10,border:`1px solid ${G.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7,gap:6}}>
                        <span style={{fontSize:12,fontWeight:600,color:G.text,lineHeight:1.3,flex:1}}>{t.topic}</span>
                        <span style={{fontSize:12,fontWeight:700,color:barColor,flexShrink:0}}>{t.vol}</span>
                      </div>
                      <div style={{height:4,borderRadius:999,background:G.gray200,overflow:"hidden"}}>
                        <div style={{display:"flex",height:"100%"}}>
                          <div style={{width:`${Math.round(t.pos/maxTopVol*100)}%`,background:G.green}}/>
                          <div style={{width:`${Math.round(t.neu/maxTopVol*100)}%`,background:G.gray300}}/>
                          <div style={{width:`${Math.round(t.neg/maxTopVol*100)}%`,background:G.red}}/>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:5,fontSize:10,color:G.textS}}>
                        <span style={{color:G.green}}>{t.pos}+</span>
                        <span style={{color:G.gray400}}>{t.neu}~</span>
                        <span style={{color:G.red}}>{t.neg}-</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ARTICLES */}
          <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"20px 22px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <div style={{fontWeight:700,fontSize:14}}>
                Articles récents
                <span style={{fontSize:12,color:G.textM,fontWeight:400,marginLeft:8}}>{filtered.length} résultats</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {platOptions.map(p=>(
                  <button key={p} onClick={()=>setPlatFilter(p)}
                    style={{padding:"4px 14px",borderRadius:20,border:`1px solid ${platFilter===p?accentColor:G.border}`,background:platFilter===p?accentColor:"transparent",color:platFilter===p?"#fff":G.textM,fontSize:12,fontWeight:platFilter===p?600:400,cursor:"pointer",transition:"all .15s",textTransform:"capitalize"}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {loadArt ? (
              <div style={{display:"flex",justifyContent:"center",padding:32}}><Spinner size={24}/></div>
            ) : articles.length===0 ? (
              <div style={{textAlign:"center",padding:"32px 16px",color:G.textM}}>
                <div style={{fontSize:32,marginBottom:10}}>🏷️</div>
                <div style={{fontWeight:700,fontSize:14,color:G.text,marginBottom:6}}>Aucun article tagué pour ce ministère</div>
                <p style={{fontSize:13,margin:0,lineHeight:1.6}}>Le tagging s'effectue automatiquement après chaque collecte.</p>
              </div>
            ) : filtered.length===0 ? (
              <div style={{textAlign:"center",padding:"28px 0",color:G.textM,fontSize:13}}>Aucun article pour ce filtre</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column"}}>
                {filtered.map((a,i)=>(
                  <div key={a.id} style={{display:"flex",gap:12,padding:"13px 0",borderBottom:i<filtered.length-1?`1px solid ${G.border}`:"none",alignItems:"flex-start"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:sentColor(a.sentiment),marginTop:4,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:G.textM,flexShrink:0}}>{fmtDate(a.published_at)}</span>
                        <span style={{fontSize:11,background:G.gray100,borderRadius:4,padding:"1px 7px",color:G.textM,textTransform:"capitalize",flexShrink:0}}>{a.platform}</span>
                        {a.source_name&&<span style={{fontSize:11,color:G.textS,flexShrink:0}}>{a.source_name}</span>}
                        <span style={{marginLeft:"auto",flexShrink:0}}><SentBadge s={a.sentiment}/></span>
                      </div>
                      <a href={a.url} target="_blank" rel="noreferrer"
                        style={{fontSize:13,fontWeight:600,color:G.text,textDecoration:"none",lineHeight:1.4,display:"block"}}
                        onMouseEnter={e=>e.currentTarget.style.color=accentColor}
                        onMouseLeave={e=>e.currentTarget.style.color=G.text}>
                        {a.title}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MOTS-CLÉS SUIVIS */}
          <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,overflow:"hidden"}}>
            <button onClick={()=>setKwOpen(p=>!p)}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:G.textM,fontWeight:600}}>
              <span>Mots-clés suivis <span style={{fontWeight:400,color:G.textS}}>({keywords.length})</span></span>
              <span style={{fontSize:11,transition:"transform .2s",display:"inline-block",transform:kwOpen?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
            </button>
            {kwOpen&&(
              <div style={{padding:"0 20px 18px"}}>
                {/* Formulaire ajout */}
                <div style={{background:G.gray50,border:`1px solid ${G.border}`,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:600,color:G.textM,marginBottom:10}}>Nouveau mot-clé</div>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <input value={newKw} onChange={e=>setNewKw(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&addKw()}
                      placeholder="ex: fibre optique, #5GSenegal…"
                      style={{flex:2,minWidth:140,padding:"7px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:12,outline:"none",background:G.white}}/>
                    {/* Type */}
                    <select value={newKwType} onChange={e=>setNewKwType(e.target.value)}
                      style={{flex:1,minWidth:120,padding:"7px 10px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:12,outline:"none",background:G.white,cursor:"pointer"}}>
                      <option value="keyword">Mot-clé</option>
                      <option value="hashtag">Hashtag</option>
                      <option value="person">Personne</option>
                      <option value="institution">Institution</option>
                      <option value="program">Programme</option>
                    </select>
                    {/* Poids */}
                    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      <span style={{fontSize:11,color:G.textM,whiteSpace:"nowrap"}}>Poids</span>
                      <div style={{display:"flex",gap:3}}>
                        {[1,2,3,4,5].map(n=>(
                          <button key={n} onClick={()=>setNewKwWeight(n)}
                            style={{width:24,height:24,borderRadius:6,border:`1px solid ${newKwWeight>=n?accentColor:G.border}`,background:newKwWeight>=n?accentColor:"transparent",color:newKwWeight>=n?"#fff":G.textM,fontSize:11,fontWeight:700,cursor:"pointer",padding:0}}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={addKw} disabled={addingKw||!newKw.trim()}
                      style={{background:!newKw.trim()?G.gray200:accentColor,color:!newKw.trim()?G.textS:"#fff",border:"none",borderRadius:8,padding:"7px 20px",fontSize:12,fontWeight:600,cursor:!newKw.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
                      {addingKw?<Spinner size={12}/>:"+"} Ajouter
                    </button>
                  </div>
                </div>
                {/* Liste */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {keywords.length===0&&<span style={{fontSize:12,color:G.textS}}>Aucun mot-clé suivi</span>}
                  {keywords.map((k,i)=>{
                    const typeColors = {keyword:G.blue,hashtag:"#7C3AED",person:"#0891B2",institution:G.green,program:G.yellow};
                    const tc = typeColors[k.term_type||k.type]||G.gray400;
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"3px 8px 3px 10px"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:tc,flexShrink:0}}/>
                        <span style={{color:G.text,fontWeight:500}}>{k.term}</span>
                        <span style={{color:G.textS,fontSize:10}}>×{k.weight||1}</span>
                        <button onClick={()=>delKw(k.id)} style={{background:"none",border:"none",cursor:"pointer",color:G.textS,fontSize:13,lineHeight:1,padding:"0 1px",marginLeft:1}}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── FLUX LIVE ── */
const PLAT_FILTERS = ["Toutes","twitter","youtube","reddit","presse"];
const PLAT_LABELS  = {twitter:"Twitter X", youtube:"YouTube", reddit:"Reddit", presse:"Presse"};

function fmtDate(iso) {
  if(!iso) return "";
  const d = new Date(iso);
  const diff = Date.now()-d.getTime();
  const m = Math.floor(diff/60000);
  if(m<1) return "À l'instant";
  if(m<60) return `Il y a ${m} min`;
  const h = Math.floor(m/60);
  if(h<24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h/24)}j`;
}

function FluxLive() {
  const [platFilter, setPlatFilter] = useState("Toutes");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    fetch(`${API}/articles?limit=50`)
      .then(r=>r.ok?r.json():[])
      .then(d=>{ setItems(Array.isArray(d)?d:d.items||[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  const filtered = platFilter==="Toutes" ? items
    : items.filter(m=>m.platform===platFilter);

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Flux Live</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>{filtered.length} publications · Surveillance en temps réel</p>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"14px 20px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:G.textM}}>Plateforme :</span>
          {PLAT_FILTERS.map(p=>(
            <button key={p} onClick={()=>setPlatFilter(p)}
              style={{padding:"5px 16px",borderRadius:20,border:`1px solid ${platFilter===p?G.green:G.border}`,background:platFilter===p?G.green:"transparent",color:platFilter===p?"#fff":G.textM,fontSize:13,fontWeight:platFilter===p?600:400,cursor:"pointer",transition:"all .15s"}}>
              {p==="Toutes"?"Toutes":PLAT_LABELS[p]||p}
            </button>
          ))}
        </div>
      </div>

      {/* POSTS */}
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:"48px 0"}}><Spinner size={28}/></div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0",color:G.textM,fontSize:14}}>Aucune publication collectée</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtered.map((m,i)=>(
            <div key={m.id||i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"20px 24px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <Avatar name={m.source_name||m.platform} size={44}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{fontWeight:700,fontSize:14,color:G.text}}>{m.source_name||"—"}</span>
                    <span style={{fontSize:13,color:G.textS}}>· {fmtDate(m.published_at)}</span>
                    <div style={{marginLeft:"auto"}}><PlatformBadge platform={m.platform}/></div>
                  </div>
                  <p style={{margin:"0 0 14px",fontSize:14,color:G.text,lineHeight:1.6}}>{m.title||m.text||""}</p>
                  {m.text&&m.title&&<p style={{margin:"0 0 14px",fontSize:13,color:G.textM,lineHeight:1.5}}>{m.text.slice(0,200)}{m.text.length>200?"…":""}</p>}
                  <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end"}}>
                    <SentBadge s={m.sentiment}/>
                    {m.url&&<a href={m.url} target="_blank" rel="noopener noreferrer" style={{color:G.green,fontSize:13,fontWeight:500,textDecoration:"none"}}>Voir source ↗</a>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── ALERTES ── */
function Alertes() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch(`${API}/alerts?limit=50`)
      .then(r=>r.ok?r.json():[])
      .then(d=>{ setAlerts(Array.isArray(d)?d:d.items||[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  const critical  = alerts.filter(a=>a.level==="critical").length;
  const warning   = alerts.filter(a=>a.level==="warning").length;
  const unread    = alerts.filter(a=>!a.read).length;

  const levelBorder = l => l==="critical"?"red":l==="warning"?"yellow":"gray";
  const levelTag    = l => l==="critical"?"Critique":l==="warning"?"Avertissement":"Info";
  const levelColor  = l => l==="critical"?"red":l==="warning"?"yellow":"blue";

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Alertes</h1>
        <p style={{color:G.textM,fontSize:14,margin:0}}>Surveillez les événements critiques en temps réel</p>
      </div>

      {/* KPI STRIP */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28}}>
        {[
          {icon:"⚠",  iconBg:"#EF4444", label:"Critiques",      value:String(critical)},
          {icon:"📈",  iconBg:"#F59E0B", label:"Avertissements", value:String(warning)},
          {icon:"🔔",  iconBg:"#0EA5E9", label:"Non lues",       value:String(unread)},
        ].map((k,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            <div style={{width:52,height:52,borderRadius:14,background:k.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:12,color:G.textM,marginBottom:4,fontWeight:500}}>{k.label}</div>
              <span style={{fontSize:28,fontWeight:800,color:G.text,lineHeight:1}}>{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ALERT CARDS */}
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:"48px 0"}}><Spinner size={28}/></div>
      ) : alerts.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0",color:G.textM,fontSize:14}}>Aucune alerte</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {alerts.map(a=>{
            const bd = levelBorder(a.level);
            const borderColor = bd==="red"?G.red:bd==="yellow"?G.yellow:G.border;
            const iconColor   = bd==="red"?G.red:bd==="yellow"?G.yellow:G.green;
            const bgColor     = bd==="red"?G.redL:bd==="yellow"?G.yellowL:G.white;
            return (
              <div key={a.id} style={{background:bgColor,border:`1.5px solid ${borderColor}`,borderRadius:12,padding:"20px 24px",display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${iconColor}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {bd==="red"?"⚠":bd==="yellow"?"⚠":"↗"}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:15,color:G.text}}>{a.title}</span>
                    <Tag label={levelTag(a.level)} color={levelColor(a.level)}/>
                    {!a.read&&<Tag label="Non lue" color="gray"/>}
                  </div>
                  <p style={{margin:0,fontSize:13,color:G.textM,marginBottom:8}}>{a.description}</p>
                  <div style={{display:"flex",gap:16,fontSize:12,color:G.textS}}>
                    {a.triggered_by&&<span>🔖 {a.triggered_by}</span>}
                    <span>🕐 {fmtDate(a.created_at)}</span>
                  </div>
                </div>
                <button style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>Analyser</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── CARTOGRAPHIE ── */
function Cartographie() {
  const [sel, setSel]   = useState(null);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch(`${API}/stats/dashboard`)
      .then(r=>r.ok?r.json():{})
      .then(d=>{
        const raw = d.regions||[];
        const total = raw.reduce((s,r)=>s+r.count,0)||1;
        setRegions(raw.map((r,i)=>({
          rank: i+1,
          name: r.name,
          mentions: r.count,
          pct: ((r.count/total)*100).toFixed(1)+"%",
        })));
        setLoading(false);
      })
      .catch(()=>setLoading(false));
  },[]);

  const maxMentions = regions[0]?.mentions || 1;

  return (
    <div style={{padding:"32px 36px"}}>
      <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Cartographie régionale</h1>
      <p style={{color:G.textM,fontSize:14,margin:"0 0 24px"}}>Distribution géographique de l'activité digitale au Sénégal</p>

      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:"48px 0"}}><Spinner size={28}/></div>
      ) : regions.length===0 ? (
        <div style={{textAlign:"center",padding:"48px 0",color:G.textM,fontSize:14}}>Aucune donnée régionale disponible</div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:20}}>
          {/* RANKING */}
          <div>
            <h3 style={{fontSize:15,fontWeight:700,color:G.text,margin:"0 0 16px"}}>📊 Classement régional</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {regions.map((r,i)=>(
                <div key={i} onClick={()=>setSel(r.name)} style={{background:sel===r.name?G.green:G.white,border:`1px solid ${sel===r.name?G.green:G.border}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:sel===r.name?"#fff":G.green}}>#{r.rank}</span>
                      <span style={{fontWeight:700,fontSize:14,color:sel===r.name?"#fff":G.text}}>{r.name}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:600,color:sel===r.name?"#fff":G.green}}>{r.pct}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:12,color:sel===r.name?"rgba(255,255,255,.75)":G.textM}}>Mentions</span>
                    <span style={{fontSize:14,fontWeight:700,color:sel===r.name?"#fff":G.text}}>{fmt(r.mentions)}</span>
                  </div>
                  <div style={{background:sel===r.name?"rgba(255,255,255,.3)":G.gray200,borderRadius:999,height:5,overflow:"hidden"}}>
                    <div style={{width:`${Math.round((r.mentions/maxMentions)*100)}%`,height:"100%",background:sel===r.name?"#fff":G.green,borderRadius:999}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TREEMAP GRID */}
          <div>
            <h3 style={{fontSize:15,fontWeight:700,color:G.text,margin:"0 0 16px"}}>Vue régionale</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {regions.map((r,i)=>{
                const alpha = 0.3 + ((r.mentions/maxMentions)*0.7);
                const isSelected = sel===r.name;
                return (
                  <div key={i} onClick={()=>setSel(r.name===sel?null:r.name)}
                    style={{background:isSelected?G.greenD:`rgba(22,163,74,${alpha})`,borderRadius:12,padding:"18px 16px",cursor:"pointer",border:`2px solid ${isSelected?G.greenD:"transparent"}`,transition:"all .2s"}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:4}}>{r.name}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{fmt(r.mentions)}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginTop:2}}>mentions</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── RAPPORTS ── */
function Rapports() {
  const [showGen, setShowGen] = useState(false);
  const [selType, setSelType] = useState("presidentiel");
  const [rapportType, setRapportType] = useState("Rapport Mensuel");
  const [topics, setTopics] = useState({politique:false,economie:false,sante:false,education:false,securite:false,culture:false,sport:false,societe:false});

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Rapports & Documents</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>Consultez, générez et téléchargez vos rapports d'analyse officiels</p>
        </div>
        <button onClick={()=>setShowGen(s=>!s)} style={{display:"flex",alignItems:"center",gap:8,background:G.green,color:"#fff",border:"none",borderRadius:10,padding:"10px 22px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
          + Générer un rapport
        </button>
      </div>


      {/* GENERATOR */}
      {showGen&&(
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:14,padding:"28px 32px",marginBottom:24}}>
          <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 6px"}}>Générateur de rapports officiels</h2>
          <p style={{color:G.textM,fontSize:13,margin:"0 0 24px"}}>Sélectionnez un format et configurez votre rapport</p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
            {[{id:"presidentiel",label:"Rapport Présidentiel",sub:"Format officiel de la Présidence de la République",icon:"📄"},{id:"ministeriel",label:"Rapport Ministériel",sub:"Synthèse thématique pour les ministères",icon:"📋"},{id:"strategique",label:"Note Stratégique",sub:"Analyse approfondie et recommandations",icon:"📈"}].map(t=>(
              <div key={t.id} onClick={()=>setSelType(t.id)}
                style={{border:`2px solid ${selType===t.id?G.green:G.border}`,borderRadius:12,padding:"18px",cursor:"pointer",background:selType===t.id?`${G.greenL}`:G.white,transition:"all .15s"}}>
                <div style={{fontSize:22,marginBottom:10,color:G.green}}>{t.icon}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{t.label}</div>
                <div style={{fontSize:12,color:G.textM}}>{t.sub}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:16,marginBottom:20}}>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:G.gray700,display:"block",marginBottom:6}}>Type de rapport</label>
              <div style={{position:"relative"}}>
                <select value={rapportType} onChange={e=>setRapportType(e.target.value)}
                  style={{width:"100%",padding:"10px 36px 10px 14px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,color:G.text,background:G.white,appearance:"none",cursor:"pointer",outline:"none"}}>
                  {["Rapport Mensuel","Rapport Hebdomadaire","Rapport Trimestriel","Note Stratégique","Rapport d'Impact"].map(t=><option key={t}>{t}</option>)}
                </select>
                <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:G.textM}}>▾</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {["Date de début","Date de fin"].map(l=>(
                <div key={l}>
                  <label style={{fontSize:13,fontWeight:600,color:G.gray700,display:"block",marginBottom:6}}>{l}</label>
                  <div style={{position:"relative"}}>
                    <input type="text" placeholder="jj/mm/aaaa" style={{width:"100%",padding:"10px 36px 10px 14px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,color:G.textM,background:G.white,outline:"none",boxSizing:"border-box"}}/>
                    <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:G.textM}}>📅</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,fontWeight:600,color:G.gray700,display:"block",marginBottom:12}}>Thématiques à inclure</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {Object.keys(topics).map(t=>(
                <label key={t} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:G.text}}>
                  <input type="checkbox" checked={topics[t]} onChange={()=>setTopics(p=>({...p,[t]:!p[t]}))} style={{width:16,height:16,accentColor:G.green}}/>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:12}}>
            <button style={{flex:1,background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer"}}>📄 Générer le rapport</button>
            <button onClick={()=>setShowGen(false)} style={{background:G.white,color:G.textM,border:`1px solid ${G.border}`,borderRadius:8,padding:"12px 24px",fontSize:14,cursor:"pointer"}}>Annuler</button>
          </div>
        </div>
      )}

      {/* LIST — pas encore de backend rapports */}
      <div style={{textAlign:"center",padding:"40px 0",color:G.textM,fontSize:14,background:G.white,border:`1px solid ${G.border}`,borderRadius:12}}>
        Aucun rapport généré pour l'instant. Utilisez le générateur ci-dessus.
      </div>
    </div>
  );
}

/* ── DASHBOARD HOME ── */
/* ─── TRENDING TOPICS WIDGET ─── */
function TrendingTopics({topics, loading, title="Sujets tendance"}) {
  if(loading) return (
    <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
      <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>{title}</div>
      <div style={{display:"flex",justifyContent:"center",padding:"24px 0"}}><Spinner size={24}/></div>
    </div>
  );
  if(!topics?.length) return (
    <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
      <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>{title}</div>
      <div style={{fontSize:13,color:G.textM,textAlign:"center",padding:"20px 0"}}>Aucun sujet détecté sur la période</div>
    </div>
  );
  const max = topics[0]?.vol || 1;
  return (
    <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontWeight:700,fontSize:15}}>{title}</div>
        <Tag label={`${topics.length} sujets`} color="green"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {topics.map((t,i)=>{
          const pctNeg = t.vol>0 ? Math.round(t.neg/t.vol*100) : 0;
          const pctPos = t.vol>0 ? Math.round(t.pos/t.vol*100) : 0;
          const barColor = pctNeg>50 ? G.red : pctPos>50 ? G.green : G.yellow;
          return (
            <div key={i} style={{padding:"10px 14px",background:G.gray50,borderRadius:10,border:`1px solid ${G.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:G.textS,minWidth:18}}>#{i+1}</span>
                  <span style={{fontWeight:600,fontSize:13,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.topic}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:G.text}}>{t.vol}</span>
                  {pctNeg>50&&<Tag label={`${pctNeg}% nég`} color="red"/>}
                  {pctPos>50&&<Tag label={`${pctPos}% pos`} color="green"/>}
                </div>
              </div>
              {/* Barre volume relative */}
              <div style={{display:"flex",gap:4,height:5,borderRadius:999,overflow:"hidden",background:G.gray200}}>
                <div style={{width:`${Math.round(t.pos/max*100)}%`,background:G.green,transition:"width .4s"}}/>
                <div style={{width:`${Math.round(t.neu/max*100)}%`,background:G.gray400,transition:"width .4s"}}/>
                <div style={{width:`${Math.round(t.neg/max*100)}%`,background:G.red,transition:"width .4s"}}/>
              </div>
              <div style={{display:"flex",gap:12,marginTop:5,fontSize:10,color:G.textS}}>
                <span style={{color:G.green}}>▪ {t.pos} positif</span>
                <span style={{color:G.gray400}}>▪ {t.neu} neutre</span>
                <span style={{color:G.red}}>▪ {t.neg} négatif</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CollectButton() {
  const [state, setState] = useState("idle"); // idle | running | done | error
  const run = async() => {
    setState("running");
    try {
      const r = await fetch(`${API}/collect/trigger`, {method:"POST"});
      setState(r.ok ? "done" : "error");
    } catch { setState("error"); }
    setTimeout(()=>setState("idle"), 4000);
  };
  const label = state==="running"?"Collecte en cours…":state==="done"?"✓ Lancée !":state==="error"?"✗ Erreur":"▶ Lancer une collecte";
  const bg    = state==="done"?G.green:state==="error"?G.red:G.green;
  return (
    <button onClick={run} disabled={state==="running"}
      style={{padding:"9px 20px",borderRadius:9,border:"none",background:bg,color:"#fff",fontSize:13,fontWeight:600,cursor:state==="running"?"not-allowed":"pointer",opacity:state==="running"?.7:1,display:"flex",alignItems:"center",gap:8,transition:"all .2s"}}>
      {state==="running"&&<Spinner size={13}/>}{label}
    </button>
  );
}

function DashboardHome() {
  const [dash, setDash]       = useState(null);
  const [recent, setRecent]   = useState([]);
  const [topics, setTopics]   = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  useEffect(()=>{
    fetch(`${API}/stats/dashboard`)
      .then(r=>r.ok?r.json():null)
      .then(d=>setDash(d))
      .catch(()=>{});
    fetch(`${API}/articles?limit=4`)
      .then(r=>r.ok?r.json():[])
      .then(d=>setRecent(Array.isArray(d)?d:d.items||[]))
      .catch(()=>{});
    fetch(`${API}/stats/topics?hours=168&limit=12`)
      .then(r=>r.ok?r.json():[])
      .then(d=>{ setTopics(d); setTopLoading(false); })
      .catch(()=>setTopLoading(false));
  },[]);

  const sent = dash?.sentiment || {};
  const posP = sent.positif_pct ?? 0;
  const negP = sent.negatif_pct ?? 0;
  const neuP = sent.neutre_pct  ?? 0;
  const hourly = dash?.hourly_volume || [];
  const maxH = hourly.reduce((m,h)=>Math.max(m,h.count),1);

  const kpis = [
    {iconBg:"#7C3AED", icon:"📄", l:"Mentions totales",  v: dash ? fmt(dash.total_mentions) : "—"},
    {iconBg:"#10B981", icon:"😊", l:"Sentiment positif", v: dash ? `${posP.toFixed(1)}%`    : "—"},
    {iconBg:"#3B82F6", icon:"🌍", l:"Régions actives",   v: dash ? String((dash.regions||[]).length) : "—"},
    {iconBg:"#16A34A", icon:"📡", l:"Plateformes",       v: dash ? String(Object.keys(dash.platforms||{}).length) : "—"},
  ];

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:"0 0 6px"}}>Dashboard</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>Vue d'ensemble · Surveillance nationale · Temps réel</p>
        </div>
        <CollectButton/>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:16,padding:"20px 22px",display:"flex",alignItems:"center",gap:18,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
            <div style={{width:58,height:58,borderRadius:16,background:k.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:12,color:G.textM,marginBottom:5,fontWeight:500}}>{k.l}</div>
              <span style={{fontSize:30,fontWeight:800,color:G.text,lineHeight:1,letterSpacing:"-1px"}}>{k.v}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TRENDING TOPICS */}
      <div style={{marginBottom:20}}>
        <TrendingTopics topics={topics} loading={topLoading} title="Sujets tendance — 7 jours"/>
      </div>

      {/* CHART + SENTIMENT */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,marginBottom:20}}>
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Volume de mentions — 24h</div>
          <div style={{fontSize:12,color:G.textM,marginBottom:20}}>Toutes plateformes</div>
          {hourly.length===0 ? (
            <div style={{height:108,display:"flex",alignItems:"center",justifyContent:"center",color:G.textS,fontSize:13}}>Aucune donnée horaire</div>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:100,marginBottom:8}}>
                {hourly.map((h,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,height:"100%",justifyContent:"flex-end"}}>
                    <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:`${Math.round((h.count/maxH)*100)}%`,background:`${G.green}${h.count===maxH?"ff":"66"}`}}/>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {hourly.filter((_,i)=>i%4===0).map((h,i)=>(
                  <span key={i} style={{fontSize:10,color:G.textS}}>{String(h.hour).padStart(2,"0")}h</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Sentiment global</div>
          {[{l:"Positif",p:posP,c:G.green},{l:"Neutre",p:neuP,c:G.gray400},{l:"Négatif",p:negP,c:G.red}].map(s=>(
            <div key={s.l} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,color:G.textM}}>{s.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:s.c}}>{s.p.toFixed(1)}%</span>
              </div>
              <GreenBar pct={s.p} height={8}/>
            </div>
          ))}
        </div>
      </div>

      {/* LATEST POSTS */}
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Publications récentes</div>
        {recent.length===0 ? (
          <div style={{textAlign:"center",padding:"20px 0",color:G.textM,fontSize:13}}>Aucune publication récente</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {recent.map((m,i)=>(
              <div key={m.id||i} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:i<recent.length-1?`1px solid ${G.border}`:"none",alignItems:"flex-start"}}>
                <Avatar name={m.source_name||m.platform} size={36}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:600,fontSize:13}}>{m.source_name||m.platform}</span>
                    <span style={{fontSize:12,color:G.textS}}>{fmtDate(m.published_at)}</span>
                    <div style={{marginLeft:"auto"}}><SentBadge s={m.sentiment}/></div>
                  </div>
                  <p style={{margin:0,fontSize:13,color:G.textM,lineHeight:1.5}}>{(m.title||m.text||"").slice(0,120)}{(m.title||m.text||"").length>120?"…":""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── HASHTAGS / MOTS-CLÉS (sidebar icon #) ── */
function MotsCles() {
  const [newKw,   setNewKw]  = useState("");
  const [kws,     setKws]    = useState([]);
  const [stats,   setStats]  = useState({});
  const [loading, setLoading]= useState(true);
  const [adding,  setAdding] = useState(false);
  const [err,     setErr]    = useState("");

  const fetchKws = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/keywords`).then(r=>r.ok?r.json():[]),
      fetch(`${API}/stats/keywords?hours=168`).then(r=>r.ok?r.json():[]),
    ]).then(([kwList, kwStats])=>{
      setKws(kwList);
      const map = {};
      kwStats.forEach(s=>{ map[s.term]=s; });
      setStats(map);
      setLoading(false);
    }).catch(()=>setLoading(false));
  };

  useEffect(()=>{ fetchKws(); },[]);

  const addKw = async() => {
    const term = newKw.trim();
    if(!term){ setErr("Terme requis"); return; }
    setAdding(true); setErr("");
    const r = await fetch(`${API}/keywords`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({term,weight:3})});
    if(r.ok){ setNewKw(""); fetchKws(); }
    else{ const e=await r.json().catch(()=>({})); setErr(e.detail||"Erreur"); }
    setAdding(false);
  };

  const deleteKw = async(term) => {
    await fetch(`${API}/keywords/${encodeURIComponent(term)}`,{method:"DELETE"});
    setKws(p=>p.filter(k=>k.term!==term));
  };

  const toggleAlert = async(term) => {
    await fetch(`${API}/keywords/${encodeURIComponent(term)}/toggle`,{method:"PATCH"});
    setKws(p=>p.map(k=>k.term===term?{...k,active:!k.active}:k));
  };

  const activeKws = kws.filter(k=>k.active);

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Mots-clés & Hashtags</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>Gérez les termes surveillés sur toutes les plateformes</p>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input value={newKw} onChange={e=>{setNewKw(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&addKw()}
            placeholder="Ajouter un mot-clé…"
            style={{padding:"8px 14px",border:`1px solid ${err?G.red:G.border}`,borderRadius:8,fontSize:13,outline:"none",width:220}}/>
          <button onClick={addKw} disabled={adding}
            style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:600,cursor:adding?"not-allowed":"pointer",opacity:adding?.7:1,display:"flex",alignItems:"center",gap:6}}>
            {adding?<Spinner size={13}/>:"+"} Ajouter
          </button>
        </div>
      </div>

      {err&&<div style={{background:G.redL,border:`1px solid ${G.redBd}`,borderRadius:8,padding:"8px 14px",fontSize:12,color:G.red,marginBottom:16}}>{err}</div>}

      {/* ACTIFS */}
      <div style={{background:G.greenL,border:`1px solid ${G.green}44`,borderRadius:12,padding:"16px 20px",marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:14}}>🔔</span>
          <span style={{fontWeight:700,fontSize:14,color:G.greenD}}>Surveillance active ({activeKws.length})</span>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {activeKws.length===0&&<span style={{fontSize:13,color:G.textM}}>Aucun mot-clé actif</span>}
          {activeKws.map((k,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:G.white,border:`1px solid ${G.green}44`,borderRadius:20,padding:"4px 12px"}}>
              <span style={{fontSize:12,color:G.textM}}>#</span>
              <span style={{fontSize:13,fontWeight:600,color:G.text}}>{k.term}</span>
              <span style={{fontSize:12,color:G.green,fontWeight:700}}>{fmt(stats[k.term]?.hits||0)}</span>
            </div>
          ))}
        </div>
      </div>

      {loading
        ? <div style={{display:"flex",justifyContent:"center",padding:48}}><Spinner size={28}/></div>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {kws.map((k,i)=>{
              const s = stats[k.term]||{hits:0,positif:0,neutre:0,negatif:0};
              const dominant = s.positif>s.negatif ? "positif" : s.negatif>s.positif ? "negatif" : "neutre";
              return (
                <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"22px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div style={{width:44,height:44,borderRadius:10,background:G.greenL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:G.green}}>#</div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <SentBadge s={dominant}/>
                      <div onClick={()=>toggleAlert(k.term)}
                        style={{width:28,height:28,borderRadius:"50%",background:k.active?G.green:G.gray200,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <span style={{fontSize:13,color:k.active?"#fff":G.textM}}>🔔</span>
                      </div>
                      <div onClick={()=>deleteKw(k.term)}
                        style={{width:28,height:28,borderRadius:"50%",background:G.redL,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                        <span style={{fontSize:13,color:G.red}}>✕</span>
                      </div>
                    </div>
                  </div>
                  <div style={{fontWeight:800,fontSize:18,color:G.text,marginBottom:4}}>{k.term}</div>
                  <div style={{fontSize:13,color:G.textM,marginBottom:2}}>Mentions (7j)</div>
                  <div style={{fontSize:26,fontWeight:800,color:G.text,marginBottom:12}}>{fmt(s.hits)}</div>
                  {s.hits>0&&(
                    <div style={{display:"flex",gap:3,height:6,borderRadius:999,overflow:"hidden",marginBottom:8}}>
                      <div style={{width:`${Math.round(s.positif/s.hits*100)}%`,background:G.green}}/>
                      <div style={{width:`${Math.round(s.neutre/s.hits*100)}%`,background:G.gray400}}/>
                      <div style={{width:`${Math.round(s.negatif/s.hits*100)}%`,background:G.red}}/>
                    </div>
                  )}
                  <div style={{display:"flex",gap:10,fontSize:11,color:G.textS}}>
                    <span style={{color:G.green}}>{s.positif} pos</span>
                    <span style={{color:G.gray400}}>{s.neutre} neu</span>
                    <span style={{color:G.red}}>{s.negatif} nég</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

/* ── AUTEURS & INFLUENCEURS (sidebar users) ── */
function Auteurs() {
  return (
    <div style={{padding:"32px 36px"}}>
      <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Auteurs & Influenceurs</h1>
      <p style={{color:G.textM,fontSize:14,margin:"0 0 32px"}}>Identification des auteurs actifs sur les plateformes collectées</p>
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"48px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:16}}>👥</div>
        <div style={{fontWeight:700,fontSize:16,color:G.text,marginBottom:8}}>Fonctionnalité à venir</div>
        <p style={{fontSize:13,color:G.textM,margin:0}}>L'identification et le classement des auteurs sera disponible dans une prochaine version.</p>
      </div>
    </div>
  );
}

/* ── NLP / INTELLIGENCE ARTIFICIELLE ── */
function NLPPage() {
  const [text, setText]     = useState("");
  const [loading, setLoad]  = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr]       = useState("");

  const run = async () => {
    if(!text.trim()) return;
    setLoad(true); setResult(null); setErr("");
    try{
      const r = await callClaude(text);
      if(r) setResult(r);
      else   setErr("Erreur d'analyse.");
    }catch{ setErr("Erreur de connexion à l'API."); }
    setLoad(false);
  };

  return (
    <div style={{padding:"32px 36px"}}>
      <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:"0 0 4px"}}>Intelligence Artificielle & NLP</h1>
      <p style={{color:G.textM,fontSize:14,margin:"0 0 28px"}}>Analyse sémantique avancée et détection automatique des tendances</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28}}>
        {[
          {icon:"🎯", iconBg:"#7C3AED", l:"Analyse sentiment", v:"87%",  sub:"+2.3%", subUp:true},
          {icon:"✨", iconBg:"#0EA5E9", l:"Détection auto",    v:"142",  sub:"+18",   subUp:true},
          {icon:"💬", iconBg:"#16A34A", l:"Traitement",        v:"2.4M", sub:"+314%", subUp:true},
        ].map((k,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            <div style={{width:52,height:52,borderRadius:14,background:k.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:12,color:G.textM,marginBottom:4,fontWeight:500}}>{k.l}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:28,fontWeight:800,color:G.text,lineHeight:1}}>{k.v}</span>
                <span style={{fontSize:13,fontWeight:600,color:k.subUp?G.green:G.red}}>{k.subUp?"↑":"↓"} {k.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:20,color:G.green}}>✨</span>
          <span style={{fontWeight:700,fontSize:16}}>Analyseur de texte en temps réel</span>
        </div>
        <p style={{fontSize:13,color:G.textM,margin:"0 0 20px"}}>Collez un texte pour analyser le sentiment, détecter la désinformation et extraire les entités</p>

        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder="Collez votre texte ici pour l'analyser…"
          style={{width:"100%",minHeight:120,padding:"14px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,fontFamily:"inherit",lineHeight:1.6,outline:"none",resize:"vertical",boxSizing:"border-box",color:G.text}}/>

        {err&&<div style={{background:G.redL,border:`1px solid ${G.redBd}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:G.red,margin:"10px 0"}}>{err}</div>}

        <div style={{display:"flex",gap:10,marginTop:14,alignItems:"center"}}>
          <button onClick={run} disabled={loading||!text.trim()}
            style={{display:"flex",alignItems:"center",gap:8,background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:loading||!text.trim()?"not-allowed":"pointer",opacity:loading||!text.trim()?.6:1}}>
            {loading?<><Spinner size={14}/> Analyse…</>:<>🔍 Analyser le texte</>}
          </button>
          <button onClick={()=>{setText("");setResult(null);}} style={{background:G.white,color:G.textM,border:`1px solid ${G.border}`,borderRadius:8,padding:"10px 18px",fontSize:13,cursor:"pointer"}}>Effacer</button>
        </div>

        {result&&(
          <div style={{marginTop:24,padding:"20px",background:G.gray50,borderRadius:10,border:`1px solid ${G.border}`,animation:"fadeUp .3s ease"}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Résultats de l'analyse</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {[
                {l:"Sentiment",v:result.sentiment,c:result.sentiment==="positif"?G.green:result.sentiment==="negatif"?G.red:G.gray500},
                {l:"Confiance",v:`${result.confiance}%`,c:G.green},
                {l:"Désinformation",v:`${result.desinformation_score}/100`,c:result.desinformation_score>50?G.red:G.green},
              ].map(({l,v,c})=>(
                <div key={l} style={{background:G.white,borderRadius:8,padding:"12px 16px",border:`1px solid ${G.border}`,textAlign:"center"}}>
                  <div style={{fontSize:11,color:G.textM,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{l}</div>
                  <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>
            {result.themes?.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:G.textM,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Thèmes</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {result.themes.map((t,i)=><Tag key={i} label={t} color="green"/>)}
                </div>
              </div>
            )}
            {result.resume&&(
              <div style={{padding:"12px 14px",background:G.white,borderRadius:8,border:`1px solid ${G.border}`}}>
                <div style={{fontSize:11,color:G.textM,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Résumé</div>
                <div style={{fontSize:13,color:G.text,lineHeight:1.6}}>{result.resume}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SOURCES ── */
const PLAT_COLORS = {
  presse:"#16A34A", youtube:"#FF0000", reddit:"#FF4500",
  twitter:"#000000", facebook:"#1877F2", tiktok:"#FF0050", linkedin:"#0077B5",
};
const PLAT_ICONS = {
  presse:"◈", youtube:"▶", reddit:"👾", twitter:"𝕏", facebook:"f", tiktok:"♪", linkedin:"in",
};

function Sources() {
  const [sources,   setSources]  = useState([]);
  const [platStats, setPlatStats]= useState([]);
  const [loading,   setLoading]  = useState(true);
  const [showForm,  setShowForm] = useState(false);
  const [form, setForm] = useState({name:"",url:"",platform:"presse",lang:"FR"});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const fetchSources = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/collect/status`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/stats/platforms?days=30`).then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]).then(([rss, plats])=>{
      setSources(rss);
      // Only keep social platforms (not Presse — those are shown as RSS cards)
      setPlatStats(plats.filter(p=>p.platform.toLowerCase()!=="presse"));
      setLoading(false);
    }).catch(()=>setLoading(false));
  };
  useEffect(()=>{ fetchSources(); },[]);

  const toggle = (id) => {
    fetch(`${API}/sources/${id}/toggle`,{method:"PATCH"})
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setSources(p=>p.map(s=>s.id===id?{...s,active:d.active}:s)); });
  };

  const addSource = async() => {
    if(!form.name.trim()||!form.url.trim()){setErr("Nom et URL requis");return;}
    setSaving(true); setErr("");
    const r = await fetch(`${API}/sources`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    if(r.ok){
      setSaving(false); setShowForm(false);
      setForm({name:"",url:"",platform:"presse",lang:"FR"});
      fetchSources();
    } else {
      const e = await r.json().catch(()=>({}));
      setErr(e.detail||"Erreur lors de l'ajout"); setSaving(false);
    }
  };

  const statusColor = s => s.status==="ok"?"green" : s.status==="error"?"red":"gray";
  const fmtDate = iso => iso ? new Date(iso).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "Jamais";

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:"0 0 4px"}}>Sources de données</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>Gérez et surveillez vos connecteurs de données</p>
        </div>
        <button onClick={()=>{setShowForm(p=>!p);setErr("");}}
          style={{display:"flex",alignItems:"center",gap:6,background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          + Ajouter un média
        </button>
      </div>

      {/* FORM ajout média */}
      {showForm&&(
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px",marginBottom:24,animation:"fadeUp .25s ease"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:18}}>Nouveau média / source</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr 1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Nom</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="Le Soleil…"
                style={{width:"100%",padding:"8px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>URL du flux RSS</label>
              <input value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))}
                placeholder="https://…/rss"
                style={{width:"100%",padding:"8px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Plateforme</label>
              <select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))}
                style={{width:"100%",padding:"8px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box"}}>
                {["presse","youtube","reddit","twitter","facebook","tiktok","linkedin"].map(p=>(
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Langue</label>
              <select value={form.lang} onChange={e=>setForm(p=>({...p,lang:e.target.value}))}
                style={{width:"100%",padding:"8px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",background:"#fff",boxSizing:"border-box"}}>
                {["FR","EN","WO"].map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          {err&&<div style={{color:G.red,fontSize:12,marginBottom:10}}>{err}</div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={addSource} disabled={saving}
              style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 22px",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1}}>
              {saving?"Enregistrement…":"✓ Enregistrer"}
            </button>
            <button onClick={()=>{setShowForm(false);setErr("");}}
              style={{background:G.white,color:G.textM,border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer"}}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading
        ? <div style={{display:"flex",justifyContent:"center",padding:48}}><Spinner size={32}/></div>
        : (
          <>
          {/* ── RÉSEAUX SOCIAUX ── */}
          {platStats.length>0&&(
            <div style={{marginBottom:28}}>
              <div style={{fontSize:13,fontWeight:700,color:G.textS,letterSpacing:.6,textTransform:"uppercase",marginBottom:14}}>Réseaux sociaux — 30 jours</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                {platStats.map((p,i)=>{
                  const key = p.platform.toLowerCase();
                  const col = PLAT_COLORS[key]||"#6B7280";
                  const ico = PLAT_ICONS[key]||"◈";
                  const fmtLast = p.last_fetch ? new Date(p.last_fetch).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "Jamais";
                  return (
                    <div key={i} style={{background:G.white,border:`1.5px solid ${col}33`,borderRadius:12,padding:"18px 20px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                        <div style={{width:40,height:40,borderRadius:10,background:`${col}18`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:col,fontWeight:700,flexShrink:0}}>
                          {ico}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:G.text}}>{p.platform}</div>
                          <div style={{fontSize:11,color:G.textS}}>Collecteur API</div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"10px 12px",background:G.gray50,borderRadius:8,marginBottom:10}}>
                        <div>
                          <div style={{fontSize:11,color:G.textM,marginBottom:2}}>Articles (30j)</div>
                          <div style={{fontSize:18,fontWeight:700,color:G.text}}>{fmt(p.total)}</div>
                        </div>
                        <div>
                          <div style={{fontSize:11,color:G.textM,marginBottom:2}}>Cette semaine</div>
                          <div style={{fontSize:18,fontWeight:700,color:col}}>{fmt(p.last_7_days)}</div>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:G.textS}}>Dernière synchro : {fmtLast}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SOURCES RSS ── */}
          <div style={{fontSize:13,fontWeight:700,color:G.textS,letterSpacing:.6,textTransform:"uppercase",marginBottom:14}}>Sources RSS — Presse</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
            {sources.map((s,i)=>{
              const col = PLAT_COLORS[s.platform]||"#6B7280";
              const ico = PLAT_ICONS[s.platform]||"◈";
              return (
                <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"22px 24px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:44,height:44,borderRadius:12,background:`${col}18`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:col,fontWeight:700}}>
                        {ico}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:15,color:G.text}}>{s.name}</div>
                        <div style={{fontSize:12,color:G.textM,textTransform:"capitalize"}}>{s.platform}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Tag label={s.status==="ok"?"Actif":s.status==="error"?"Erreur":"Jamais"} color={statusColor(s)}/>
                      <button onClick={()=>toggle(s.id)}
                        title={s.active?"Désactiver":"Activer"}
                        style={{width:28,height:28,borderRadius:6,border:`1px solid ${G.border}`,background:s.active?G.green:G.gray200,color:s.active?"#fff":G.textM,fontSize:12,cursor:"pointer",fontWeight:700}}>
                        {s.active?"ON":"OFF"}
                      </button>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"12px 14px",background:G.gray50,borderRadius:8,marginBottom:14}}>
                    <div>
                      <div style={{fontSize:11,color:G.textM,marginBottom:2}}>Articles collectés</div>
                      <div style={{fontSize:18,fontWeight:700,color:G.text}}>{fmt(s.last_count||0)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:G.textM,marginBottom:2}}>Dernière synchro</div>
                      <div style={{fontSize:12,fontWeight:500,color:G.text}}>{fmtDate(s.last_fetch)}</div>
                    </div>
                  </div>
                  {s.last_error&&(
                    <div style={{background:G.redL,border:`1px solid ${G.redBd}`,borderRadius:6,padding:"6px 10px",fontSize:11,color:G.red,marginBottom:10}}>
                      {s.last_error.slice(0,80)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        )
      }
    </div>
  );
}

/* ── MÉDIAS TAB (sous-onglet Paramètres) ── */
function MediasTab() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({name:"",url:"",platform:"Presse",lang:"FR"});
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [filter, setFilter] = useState("Tous");

  const PLATFORMS = ["Presse","Reddit","YouTube","Twitter"];

  const load = () => {
    setLoading(true);
    fetch(`${API}/sources`).then(r=>r.json()).then(d=>setSources(Array.isArray(d)?d:[])).catch(()=>setSources([])).finally(()=>setLoading(false));
  };
  useEffect(load,[]);

  const toggle = async(id) => {
    const r = await fetch(`${API}/sources/${id}/toggle`,{method:"PATCH"});
    if(r.ok){ const d=await r.json(); setSources(p=>p.map(s=>s.id===id?{...s,active:d.active}:s)); }
  };

  const addSource = async() => {
    if(!form.name.trim()||!form.url.trim()){ setErr("Nom et URL requis"); return; }
    setAdding(true); setErr(""); setOk("");
    const r = await fetch(`${API}/sources`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    if(r.ok){
      setOk(`Source "${form.name}" ajoutée avec succès`);
      setForm({name:"",url:"",platform:"Presse",lang:"FR"});
      load();
    } else {
      const d=await r.json().catch(()=>({}));
      setErr(d.detail||"Erreur lors de l'ajout");
    }
    setAdding(false);
  };

  const platColor = p => p==="Reddit"?"#FF4500":p==="YouTube"?"#FF0000":p==="Twitter"?"#000":G.green;
  const filtered = filter==="Tous" ? sources : sources.filter(s=>s.platform===filter);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ADD NEW SOURCE */}
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>➕ Ajouter un nouveau média</div>
        <div style={{fontSize:13,color:G.textM,marginBottom:20}}>Ajoutez un flux RSS, une source presse ou un connecteur à surveiller</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Nom du média *</label>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
              placeholder="ex: Le Monde Afrique, APS Sénégal…"
              style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>URL du flux RSS *</label>
            <input value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))}
              placeholder="https://exemple.com/feed.xml"
              style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Plateforme</label>
            <select value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))}
              style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,color:G.text,background:G.white,cursor:"pointer",outline:"none"}}>
              {PLATFORMS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Langue</label>
            <select value={form.lang} onChange={e=>setForm(p=>({...p,lang:e.target.value}))}
              style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,color:G.text,background:G.white,cursor:"pointer",outline:"none"}}>
              {["FR","EN","WOL","AR"].map(l=><option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {err&&<div style={{background:G.redL,border:`1px solid ${G.redBd}`,borderRadius:8,padding:"8px 14px",fontSize:12,color:G.red,marginBottom:12}}>{err}</div>}
        {ok&&<div style={{background:G.greenL,border:`1px solid ${G.green}44`,borderRadius:8,padding:"8px 14px",fontSize:12,color:G.green,marginBottom:12}}>{ok}</div>}

        <button onClick={addSource} disabled={adding}
          style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:adding?"not-allowed":"pointer",opacity:adding?.7:1,display:"flex",alignItems:"center",gap:8}}>
          {adding?<><Spinner size={14}/> Ajout en cours…</>:"+ Ajouter la source"}
        </button>
      </div>

      {/* SOURCE LIST */}
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15}}>Sources configurées ({sources.length})</div>
          <div style={{display:"flex",gap:6}}>
            {["Tous",...PLATFORMS].map(p=>(
              <button key={p} onClick={()=>setFilter(p)}
                style={{padding:"4px 12px",borderRadius:16,border:`1px solid ${filter===p?G.green:G.border}`,background:filter===p?G.green:"transparent",color:filter===p?"#fff":G.textM,fontSize:12,cursor:"pointer",fontWeight:filter===p?600:400}}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading&&<div style={{textAlign:"center",padding:24}}><Spinner size={24}/></div>}

        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(s=>{
            const pc = platColor(s.platform);
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:G.gray50,borderRadius:10,border:`1px solid ${G.border}`}}>
                <div style={{width:38,height:38,borderRadius:10,background:`${pc}14`,border:`1px solid ${pc}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:pc,fontWeight:700,flexShrink:0}}>◈</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:G.text,marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:11,color:G.textM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.url}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  <Tag label={s.platform} color="gray"/>
                  {s.error_count>0&&<Tag label={`${s.error_count} err`} color="red"/>}
                  {s.last_fetch&&<span style={{fontSize:11,color:G.textS}}>{relTime(s.last_fetch)}</span>}
                  <button onClick={()=>toggle(s.id)}
                    style={{padding:"5px 12px",borderRadius:16,border:`1px solid ${s.active?G.green:G.border}`,background:s.active?G.green:"transparent",color:s.active?"#fff":G.textM,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                    {s.active?"Actif":"Inactif"}
                  </button>
                </div>
              </div>
            );
          })}
          {!loading&&filtered.length===0&&(
            <div style={{textAlign:"center",padding:32,color:G.textM,fontSize:13}}>Aucune source configurée pour ce filtre.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PARAMÈTRES ── */
const CONNECTORS_DEF = [
  {id:"yt",       label:"YouTube",         icon:"▶", color:"#FF0000", desc:"Clé API Data v3",                               field:"API Key"},
  {id:"x",        label:"Twitter / X",     icon:"𝕏", color:"#000",    desc:"Bearer Token API officielle",                   field:"Bearer Token"},
  {id:"apify",    label:"Apify (Twitter)", icon:"🕸", color:"#1F73B7", desc:"Token Apify — scraping via proxies résidentiels", field:"API Token"},
  {id:"reddit",   label:"Reddit",          icon:"👾", color:"#FF4500", desc:"App credentials",                               field:"Client ID"},
  {id:"anthropic",label:"Anthropic (NLP)", icon:"✦", color:"#7C3AED", desc:"Claude API Key",                                field:"API Key"},
];

function CollecteursTab() {
  const [configs, setConfigs] = useState({});
  const [vals,    setVals]    = useState({});
  const [saving,  setSaving]  = useState({});
  const [saved,   setSaved]   = useState({});

  useEffect(()=>{
    fetch(`${API}/connectors/config`)
      .then(r=>r.ok?r.json():{}).then(d=>setConfigs(d))
      .catch(()=>{});
  },[]);

  const save = async(id) => {
    setSaving(p=>({...p,[id]:true})); setSaved(p=>({...p,[id]:false}));
    const v = vals[id]||{};
    const payload = {};
    if(v.api_key!==undefined)    payload.api_key    = v.api_key;
    if(v.rate_limit!==undefined) payload.rate_limit = Number(v.rate_limit);
    if(v.active!==undefined)     payload.active     = v.active;
    const r = await fetch(`${API}/connectors/${id}/config`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    if(r.ok){ const d=await r.json(); setConfigs(p=>({...p,[id]:d})); setSaved(p=>({...p,[id]:true})); }
    setSaving(p=>({...p,[id]:false}));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {CONNECTORS_DEF.map(con=>{
        const cfg = configs[con.id]||{};
        const v   = vals[con.id]||{};
        const set = (k,val) => setVals(p=>({...p,[con.id]:{...p[con.id],[k]:val}}));

        return (
          <div key={con.id} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
              <div style={{width:46,height:46,borderRadius:12,background:`${con.color}14`,border:`1px solid ${con.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:con.color,fontWeight:700,flexShrink:0}}>
                {con.icon}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:G.text}}>{con.label}</div>
                <div style={{fontSize:12,color:G.textM}}>{con.desc}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Tag label={cfg.has_api_key?"Clé configurée":"Sans clé"} color={cfg.has_api_key?"green":"gray"}/>
                <Tag label={cfg.active===false?"Inactif":"Actif"} color={cfg.active===false?"red":"green"}/>
              </div>
            </div>

            {/* Champs */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"flex-end"}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>
                  {con.field} {cfg.has_api_key&&<span style={{color:G.green}}>✓ défini</span>}
                </label>
                <input type="password" value={v.api_key??""} onChange={e=>set("api_key",e.target.value)}
                  placeholder={cfg.has_api_key?"••••••••••••••••••••":"Entrez la clé…"}
                  style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Rate limit (req/min)</label>
                <input type="number" min={1} max={1000}
                  value={v.rate_limit??cfg.rate_limit??60} onChange={e=>set("rate_limit",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",paddingBottom:1}}>
                <button onClick={()=>set("active",!(v.active??cfg.active??true))}
                  style={{padding:"9px 14px",borderRadius:8,border:`1px solid ${G.border}`,background:(v.active??cfg.active??true)?G.greenL:G.gray100,color:(v.active??cfg.active??true)?G.green:G.textM,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {(v.active??cfg.active??true)?"Actif":"Inactif"}
                </button>
                <button onClick={()=>save(con.id)} disabled={saving[con.id]}
                  style={{padding:"9px 18px",borderRadius:8,border:"none",background:G.green,color:"#fff",fontSize:13,fontWeight:600,cursor:saving[con.id]?"not-allowed":"pointer",opacity:saving[con.id]?.7:1}}>
                  {saving[con.id]?"…":saved[con.id]?"✓ Sauvé":"Sauvegarder"}
                </button>
              </div>
            </div>

            {cfg.updated_at&&(
              <div style={{fontSize:11,color:G.textS,marginTop:10}}>
                Dernière modif : {new Date(cfg.updated_at).toLocaleString("fr-FR")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Parametres() {
  const [subTab, setSubTab] = useState("profil");
  const SUBTABS = ["Profil","Collecteurs","Médias","Notifications","Sécurité","Utilisateurs","Région","Avancé"];

  return (
    <div style={{padding:"32px 36px"}}>
      <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:"0 0 4px"}}>Paramètres</h1>
      <p style={{color:G.textM,fontSize:14,margin:"0 0 24px"}}>Configurez votre plateforme de veille digitale PNVD</p>

      {/* SUB TABS */}
      <div style={{display:"flex",gap:4,marginBottom:28,background:G.white,border:`1px solid ${G.border}`,borderRadius:10,padding:6,overflowX:"auto"}}>
        {SUBTABS.map(t=>(
          <button key={t} onClick={()=>setSubTab(t.toLowerCase())}
            style={{padding:"8px 18px",borderRadius:8,border:"none",background:subTab===t.toLowerCase()?G.green:"transparent",color:subTab===t.toLowerCase()?"#fff":G.textM,fontSize:13,fontWeight:subTab===t.toLowerCase()?600:400,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
            {t==="Profil"&&"👤"}
            {t==="Notifications"&&"🔔"}
            {t==="Sécurité"&&"🔒"}
            {t==="Utilisateurs"&&"👥"}
            {t==="Médias"&&"📰"}
            {t==="Sources"&&"🗄"}
            {t==="Région"&&"🌐"}
            {t==="Avancé"&&"⚙"}
            {t}
          </button>
        ))}
      </div>

      {/* PROFIL */}
      {subTab==="collecteurs"&&(
        <div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:18}}>Collecteurs & API Keys</div>
          <CollecteursTab/>
        </div>
      )}

      {subTab==="profil"&&(
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"32px"}}>
          <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 24px"}}>Informations du profil</h2>
          <div style={{display:"flex",gap:32}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,minWidth:200}}>
              <div style={{width:96,height:96,borderRadius:"50%",background:G.green,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:32,color:"#fff"}}>👤</span>
              </div>
              <button style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 18px",fontSize:13,cursor:"pointer"}}>Changer la photo</button>
              <span style={{fontSize:11,color:G.textS,textAlign:"center"}}>JPG, PNG ou GIF (max. 2 MB)</span>
            </div>
            <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[{l:"Prénom",v:"Amadou"},{l:"Nom",v:"Diallo"},{l:"Email",v:"amadou.diallo@gouv.sn",span:2},{l:"Téléphone",v:"+221 77 123 45 67"},{l:"Organisation",v:"Ministère de la Communication"}].map(f=>(
                <div key={f.l} style={{gridColumn:f.span?"span 2":"auto"}}>
                  <label style={{fontSize:13,fontWeight:600,color:G.gray700,display:"block",marginBottom:6}}>{f.l}</label>
                  <div style={{display:"flex",alignItems:"center",gap:8,border:`1px solid ${G.border}`,borderRadius:8,padding:"10px 14px",background:G.white}}>
                    {f.l==="Email"&&<span style={{color:G.textM}}>✉</span>}
                    {f.l==="Téléphone"&&<span style={{color:G.textM}}>📱</span>}
                    <input defaultValue={f.v} style={{border:"none",outline:"none",fontSize:13,color:G.text,flex:1,background:"transparent"}}/>
                  </div>
                </div>
              ))}
              <div>
                <label style={{fontSize:13,fontWeight:600,color:G.gray700,display:"block",marginBottom:6}}>Rôle</label>
                <div style={{position:"relative"}}>
                  <select defaultValue="Administrateur" style={{width:"100%",padding:"10px 36px 10px 14px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,color:G.text,background:G.white,appearance:"none",outline:"none",cursor:"pointer"}}>
                    <option>Administrateur</option><option>Analyste</option><option>Lecteur</option>
                  </select>
                  <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:G.textM}}>▾</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:28,paddingTop:20,borderTop:`1px solid ${G.border}`}}>
            <button style={{background:G.white,color:G.textM,border:`1px solid ${G.border}`,borderRadius:8,padding:"10px 24px",fontSize:14,cursor:"pointer"}}>Annuler</button>
            <button style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer"}}>💾 Enregistrer</button>
          </div>
        </div>
      )}

      {subTab==="médias"&&(
        <div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:18}}>Sources & Médias</div>
          <MediasTab/>
        </div>
      )}

      {subTab==="région"&&(
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"32px",maxWidth:500}}>
          <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 24px"}}>Paramètres régionaux</h2>
          {[{l:"Langue de l'interface",opts:["Français","English","Wolof"]},{l:"Fuseau horaire",opts:["GMT (Dakar, Sénégal)","GMT+1","GMT+2"]},{l:"Format de date",opts:["JJ/MM/AAAA","MM/JJ/AAAA","AAAA-MM-JJ"]},{l:"Région par défaut",opts:["Dakar","Thiès","Saint-Louis","Ziguinchor"]}].map(f=>(
            <div key={f.l} style={{marginBottom:20}}>
              <label style={{fontSize:13,fontWeight:600,color:G.gray700,display:"block",marginBottom:8}}>{f.l}</label>
              <div style={{position:"relative"}}>
                <select style={{width:"100%",padding:"10px 36px 10px 14px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,color:G.text,background:G.white,appearance:"none",outline:"none",cursor:"pointer"}}>
                  {f.opts.map(o=><option key={o}>{o}</option>)}
                </select>
                <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:G.textM}}>▾</span>
              </div>
            </div>
          ))}
          <button style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            💾 Enregistrer les paramètres
          </button>
        </div>
      )}

      {!["profil","collecteurs","médias","région"].includes(subTab)&&(
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"48px",textAlign:"center",color:G.textM}}>
          <div style={{fontSize:32,marginBottom:12}}>⚙</div>
          <div style={{fontWeight:600,marginBottom:6}}>Section en cours de développement</div>
          <div style={{fontSize:13}}>Cette section sera disponible prochainement.</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("flux"); // default to flux live as in video
  const [now, setNow]   = useState(new Date());

  useEffect(()=>{
    const t = setInterval(()=>setNow(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);

  const sidebarToPage = {dashboard:"dashboard",flux:"flux",hashtag:"hashtags",alertes:"alertes",users:"auteurs",map:"map",rapports:"rapports",wifi:"sources",globe:"nlp",parametres:"parametres",ministeres:"ministeres"};

  const renderPage = () => {
    switch(page) {
      case "dashboard":  return <DashboardHome/>;
      case "flux":       return <FluxLive/>;
      case "alertes":    return <Alertes/>;
      case "map":        return <Cartographie/>;
      case "rapports":   return <Rapports/>;
      case "hashtags":   return <MotsCles/>;
      case "auteurs":    return <Auteurs/>;
      case "sources":    return <Sources/>;
      case "nlp":        return <NLPPage/>;
      case "parametres":  return <Parametres/>;
      case "ministeres":  return <Ministeres/>;
      default: return <FluxLive/>;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:G.bg,display:"flex",flexDirection:"column",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif",fontSize:14}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
        button{font-family:inherit}
        input,select,textarea{font-family:inherit}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{background:G.white,borderBottom:`1px solid ${G.border}`,height:56,display:"flex",alignItems:"center",padding:"0 20px",gap:16,position:"sticky",top:0,zIndex:100}}>
        {/* LOGO */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:G.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13}}>SN</div>
          <span style={{fontWeight:800,fontSize:16,color:G.text}}>PNVD</span>
          <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:4}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:G.green}}/>
            <span style={{fontSize:11,color:G.green,fontWeight:500}}>En direct</span>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginLeft:"auto"}}>
          <button onClick={()=>setPage("ministeres")} style={{background:page==="ministeres"?G.green:"none",border:`1px solid ${page==="ministeres"?G.green:G.border}`,borderRadius:8,padding:"5px 14px",fontSize:12,color:page==="ministeres"?"#fff":G.green,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>🏛️ Ministères</button>
          <button style={{background:"none",border:"none",color:G.textM,fontSize:12,cursor:"pointer"}}>Accès thématique</button>
          <button style={{background:"none",border:"none",cursor:"pointer",position:"relative",padding:4}}>
            <span style={{fontSize:20}}>🔔</span>
            <span style={{position:"absolute",top:0,right:0,width:8,height:8,borderRadius:"50%",background:G.red,border:"2px solid #fff"}}/>
          </button>
          <div style={{width:34,height:34,borderRadius:"50%",background:G.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>FS</div>
          <button style={{background:"none",border:"none",cursor:"pointer",color:G.textM,fontSize:18}}>↗</button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{display:"flex",flex:1}}>
        {/* SIDEBAR */}
        <div style={{width:60,background:G.white,borderRight:`1px solid ${G.border}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 0",gap:2,position:"sticky",top:56,height:"calc(100vh - 56px)",overflowY:"auto",flexShrink:0}}>
          {SIDEBAR_ICONS.map(s=>{
            const isActive = sidebarToPage[s.id]===page || s.id===page;
            return (
              <button key={s.id} onClick={()=>setPage(sidebarToPage[s.id]||s.id)}
                title={s.label}
                style={{
                  width:44, height:44, borderRadius:12, border:"none",
                  background:isActive ? G.greenL : "transparent",
                  color: isActive ? G.green : G.gray400,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all .15s", margin:"2px 0", flexShrink:0,
                  position:"relative",
                }}
                onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background=G.gray100;e.currentTarget.style.color=G.gray600;}}}
                onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color=G.gray400;}}}>
                {isActive && (
                  <div style={{position:"absolute",left:-8,top:"50%",transform:"translateY(-50%)",width:4,height:24,borderRadius:"0 3px 3px 0",background:G.green}}/>
                )}
                {s.svg}
              </button>
            );
          })}
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflow:page==="ministeres"?"hidden":"auto",background:G.bg,...(page==="ministeres"&&{display:"flex",flexDirection:"column"})}}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
