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
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pick = arr => arr[rand(0,arr.length-1)];
const fmt  = n => Number(n).toLocaleString("fr-FR");
const clamp= (v,a,b) => Math.min(b,Math.max(a,v));

/* ─── API ─── */
const API = "http://localhost:8100/api/v1";

/* ─── STATIC DATA ─── */
const PLATFORMS_FILTER = ["Toutes","Twitter X","TikTok","LinkedIn","Web/Presse","Presse"];
const SORT_OPTIONS = ["Date","Retweets","Impressions"];

const AUTHORS_DATA = [
  {name:"Amadou Diallo", handle:"@amadou_diallo", platform:"twitter", ago:"Il y a 15 min",
   text:"Le nouveau projet d'infrastructure à Dakar promet de transformer la région. Un grand pas en avant pour le développement économique du pays. Les investissements dans les routes et ponts sont cruciaux.",
   rt:2450, cmt:340, likes:8920, views:45600, sentiment:"positif"},
  {name:"Fatou Sall", handle:"Fatou Sall", platform:"linkedin", ago:"Il y a 32 min",
   text:"Les initiatives en matière d'éducation numérique marquent un tournant décisif pour notre jeunesse. Investir dans la formation digitale, c'est investir dans l'avenir.",
   rt:156, cmt:89, likes:1240, views:12400, sentiment:"positif"},
  {name:"Moussa Kane", handle:"@moussak", platform:"tiktok", ago:"Il y a 1 heure",
   text:"La transition énergétique au Sénégal : un modèle pour l'Afrique de l'Ouest. Fier de notre progression ! 🇸🇳 #CleanEnergy",
   rt:890, cmt:234, likes:15600, views:89000, sentiment:"positif"},
  {name:"Le Soleil", handle:"Journal Le Soleil", platform:"presse", ago:"Il y a 2 heures",
   text:"Nouvelle politique agricole : le gouvernement annonce un plan de soutien aux producteurs locaux avec un budget de 50 milliards FCFA.",
   rt:567, cmt:123, likes:2340, views:28000, sentiment:"neutre"},
  {name:"Aïssatou Diop", handle:"@aissatou_d", platform:"twitter", ago:"Il y a 3 heures",
   text:"Les nouvelles réformes éducatives peinent à convaincre. Les enseignants demandent plus de concertation et des moyens concrets.",
   rt:312, cmt:178, likes:890, views:15200, sentiment:"negatif"},
  {name:"Ousmane Ba", handle:"@ousmane_ba", platform:"tiktok", ago:"Il y a 4 heures",
   text:"Grand débat sur la souveraineté alimentaire au Sénégal. Nos agriculteurs méritent mieux. #Agriculture #Sénégal",
   rt:445, cmt:98, likes:3200, views:41000, sentiment:"neutre"},
];

const ALERTS_DATA = [
  {id:1, title:"Pic d'activité détecté", tag:"Critique", tagColor:"red",
   desc:"Augmentation de 350% des mentions sur les réseaux sociaux concernant les prix du carburant",
   region:"Dakar", ago:"Il y a 5 minutes", pct:"+350%", border:"red"},
  {id:2, title:"Tendance émergente", tag:"Avertissement", tagColor:"yellow",
   desc:"Hausse significative des discussions sur l'éducation nationale",
   region:"Saint-Louis", ago:"Il y a 23 minutes", pct:"+180%", border:"yellow"},
  {id:3, title:"Sentiment négatif en hausse", tag:"Info", tagColor:"green",
   desc:"Le sentiment négatif augmente sur les publications concernant la santé publique",
   region:"Thiès", ago:"Il y a 1 heure", pct:"+65%", border:"gray"},
  {id:4, title:"Nouvelle tendance identifiée", tag:"Info", tagColor:"blue",
   desc:"Augmentation des discussions autour du tourisme et des nouvelles infrastructures.",
   region:"Ziguinchor", ago:"Il y a 2 heures", pct:"+42%", border:"gray"},
];

const REGIONS_DATA = [
  {rank:1, name:"Dakar",       pct:"38.5%", trend:"+", trendColor:"green", mentions:8940, sentiment:68},
  {rank:2, name:"Thiès",       pct:"14.7%", trend:"+", trendColor:"green", mentions:3420, sentiment:62},
  {rank:3, name:"Saint-Louis", pct:"12.4%", trend:"-", trendColor:"red",   mentions:2890, sentiment:55},
  {rank:4, name:"Kaolack",     pct:"9.3%",  trend:"+", trendColor:"green", mentions:2150, sentiment:58},
  {rank:5, name:"Ziguinchor",  pct:"7.1%",  trend:"+", trendColor:"green", mentions:1670, sentiment:49},
  {rank:6, name:"Diourbel",    pct:"5.8%",  trend:"-", trendColor:"red",   mentions:1340, sentiment:61},
];

const MAP_REGIONS = [
  {name:"Dakar",       mentions:8940, size:"large"},
  {name:"Thiès",       mentions:3420, size:"medium"},
  {name:"Saint-Louis", mentions:2890, size:"medium"},
  {name:"Kaolack",     mentions:2150, size:"medium"},
  {name:"Ziguinchor",  mentions:1670, size:"small"},
  {name:"Diourbel",    mentions:1340, size:"small"},
  {name:"Louga",       mentions:980,  size:"small"},
  {name:"Tambacounda", mentions:760,  size:"small"},
  {name:"Kédougou",    mentions:430,  size:"xsmall"},
];

const KEYWORDS_DATA = [
  {id:1, kw:"#Senegal2024", mentions:45678, trend:"+23%", sentiment:"positif", alertOn:true},
  {id:2, kw:"education",    mentions:34521, trend:"+18%", sentiment:"neutre",  alertOn:true},
  {id:3, kw:"sante",        mentions:28934, trend:"-5%",  sentiment:"negatif", alertOn:false},
  {id:4, kw:"#Teranga",     mentions:23456, trend:"+45%", sentiment:"positif", alertOn:true},
  {id:5, kw:"emploi",       mentions:19876, trend:"+12%", sentiment:"neutre",  alertOn:false},
  {id:6, kw:"jeunesse",     mentions:17654, trend:"+8%",  sentiment:"positif", alertOn:true},
];

const SOURCES_DATA = [
  {name:"Twitter X",   type:"Réseau social",  icon:"𝕏",  color:"#000",   mentions:6721, ago:"Il y a 3 minutes",  status:"actif"},
  {name:"Facebook",    type:"Réseau social",  icon:"f",  color:"#1877F2",mentions:4832, ago:"Il y a 5 minutes",  status:"actif"},
  {name:"TikTok",      type:"Réseau social",  icon:"♪",  color:"#FF0050",mentions:3291, ago:"Il y a 8 minutes",  status:"actif"},
  {name:"LinkedIn",    type:"Réseau social",  icon:"in", color:"#0077B5",mentions:892,  ago:"Il y a 10 minutes", status:"actif"},
  {name:"Instagram",   type:"Réseau social",  icon:"◉",  color:"#E1306C",mentions:1543, ago:"Il y a 2 heures",   status:"actif"},
  {name:"Seneweb",     type:"Presse en ligne",icon:"◈",  color:"#16A34A",mentions:0,    ago:"Il y a 3 heures",   status:"erreur"},
  {name:"Le Soleil",   type:"Presse en ligne",icon:"☀",  color:"#F59E0B",mentions:342,  ago:"Il y a 15 minutes", status:"actif"},
  {name:"Dakaractu",   type:"Presse en ligne",icon:"◈",  color:"#16A34A",mentions:267,  ago:"Il y a 8 minutes",  status:"actif"},
];

const AUTHORS_TABLE = [
  {name:"Amadou Diallo",  posts:342, pct:14.7},
  {name:"Awa Ndiaye",     posts:198, pct:8.5},
  {name:"Mariama Thiam",  posts:167, pct:7.2},
  {name:"Ousmane Ba",     posts:145, pct:6.2},
  {name:"Fatou Sall",     posts:134, pct:5.8},
];

const RAPPORTS_DATA = [
  {name:"Rapport Mensuel – Janvier 2026", date:"01 Feb 2026", type:"Mensuel",      status:"publié",  size:"2.4 MB"},
  {name:"Analyse Trimestrielle Q4 2025",  date:"15 Jan 2026", type:"Trimestriel",  status:"publié",  size:"4.8 MB"},
  {name:"Rapport Hebdomadaire S08",       date:"25 Feb 2026", type:"Hebdomadaire", status:"en cours",size:"1.2 MB"},
  {name:"Analyse d'Impact – Éducation",   date:"20 Feb 2026", type:"Spécial",      status:"publié",  size:"3.1 MB"},
  {name:"Rapport Mensuel – Décembre 2025",date:"05 Jan 2026", type:"Mensuel",      status:"publié",  size:"2.1 MB"},
];

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
function ArcGauge({score=0, size=160, label=""}) {
  const pct = clamp((score + 1) / 2, 0.01, 0.99);
  const r   = size * 0.38;
  const cx  = size / 2;
  const cy  = size * 0.56;
  const toXY = a => ({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
  const startPt = toXY(Math.PI);
  const bgEnd   = toXY(0);
  const endPt   = toXY(Math.PI - pct * Math.PI);
  const largeArc = pct > 0.5 ? 1 : 0;
  const color = score > 0.15 ? G.green : score < -0.15 ? G.red : G.yellow;
  const pctLabel = Math.round((score + 1) / 2 * 100);
  const sw = size * 0.075;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={cy + sw} viewBox={`0 0 ${size} ${cy + sw}`} style={{overflow:"visible"}}>
        {/* track */}
        <path d={`M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 0 ${bgEnd.x} ${bgEnd.y}`}
              fill="none" stroke={G.gray200} strokeWidth={sw} strokeLinecap="round"/>
        {/* fill */}
        <path d={`M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 0 ${endPt.x} ${endPt.y}`}
              fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>
        {/* score text */}
        <text x={cx} y={cy - r * 0.28} textAnchor="middle" fontSize={size*0.14} fontWeight="800"
              fill={color} fontFamily="Inter,-apple-system,sans-serif">
          {score >= 0 ? "+" : ""}{(score * 100).toFixed(0)}
        </text>
        {/* sous-label */}
        <text x={cx} y={cy - r * 0.28 + size*0.11} textAnchor="middle" fontSize={size*0.08}
              fill={G.textM} fontFamily="Inter,-apple-system,sans-serif">
          {score > 0.15 ? "Positif" : score < -0.15 ? "Négatif" : "Neutre"}
        </text>
        {/* left / right labels */}
        <text x={startPt.x - sw/2} y={cy + sw*0.8} textAnchor="end" fontSize={size*0.07} fill={G.red} fontFamily="inherit">−</text>
        <text x={bgEnd.x + sw/2}   y={cy + sw*0.8} textAnchor="start" fontSize={size*0.07} fill={G.green} fontFamily="inherit">+</text>
      </svg>
      {label && <div style={{fontSize:12,color:G.textM,fontWeight:500,textAlign:"center"}}>{label}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════ */

/* ── MINISTÈRES ── */
const MIN_IDS = ["interieur","telecoms","infrastructures"];
const MIN_META = {
  interieur:      {icon:"🏛️", color:"#4F46E5", label:"Ministère de l'Intérieur"},
  telecoms:       {icon:"📡", color:"#0891B2", label:"Télécommunications & Numérique"},
  infrastructures:{icon:"🛣️", color:"#7C3AED", label:"Infrastructures & Transports"},
};

function Ministeres() {
  const [sel,       setSel]      = useState(MIN_IDS[0]);
  const [summaries, setSummaries]= useState({});
  const [articles,  setArticles] = useState([]);
  const [keywords,  setKeywords] = useState([]);
  const [topics,    setTopics]   = useState([]);
  const [platFilter,setPlatFilter]= useState("Toutes");
  const [loadSum,   setLoadSum]  = useState(true);
  const [loadArt,   setLoadArt]  = useState(false);
  const [kwOpen,    setKwOpen]   = useState(false);

  /* Charger les résumés des 3 ministères */
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

  /* Charger articles + keywords + topics quand on change de ministère */
  useEffect(()=>{
    if(!sel) return;
    setLoadArt(true);
    setArticles([]); setKeywords([]); setTopics([]); setPlatFilter("Toutes");
    Promise.all([
      fetch(`${API}/ministries/${sel}/articles?days=30&limit=500`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/ministries/${sel}/keywords`).then(r=>r.ok?r.json():[]).catch(()=>[]),
      fetch(`${API}/ministries/${sel}/topics?days=30&limit=8`).then(r=>r.ok?r.json():[]).catch(()=>[]),
    ]).then(([arts, kws, tops])=>{
      // trier par date décroissante
      arts.sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
      setArticles(arts);
      setKeywords(kws);
      setTopics(tops);
      setLoadArt(false);
    });
  },[sel]);

  const meta   = MIN_META[sel]||{};
  const dash   = summaries[sel];
  const d7     = dash?.last_7_days||{};
  const agg    = dash?.latest_daily||{};
  const score  = agg.avg_score ?? d7.avg_sentiment_score ?? 0;
  const total  = d7.total_mentions||0;

  // plateformes disponibles dans les articles
  const platOptions = ["Toutes", ...new Set(articles.map(a=>a.platform))];
  const filtered = platFilter==="Toutes" ? articles : articles.filter(a=>a.platform===platFilter);

  const fmtDate = iso => new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
  const sentColor = s => s==="positif"?G.green:s==="negatif"?G.red:G.gray400;

  const maxTopVol = topics[0]?.vol||1;

  return (
    <div style={{display:"flex",height:"calc(100vh - 56px)",overflow:"hidden"}}>

      {/* ── SIDEBAR MINISTÈRES ── */}
      <div style={{width:220,borderRight:`1px solid ${G.border}`,background:G.white,display:"flex",flexDirection:"column",padding:"20px 12px",gap:8,flexShrink:0,overflowY:"auto"}}>
        <div style={{fontSize:11,fontWeight:700,color:G.textS,letterSpacing:.8,textTransform:"uppercase",paddingLeft:8,marginBottom:4}}>Ministères</div>
        {MIN_IDS.map(id=>{
          const m   = MIN_META[id]||{};
          const s   = summaries[id];
          const sc  = s?.latest_daily?.avg_score ?? s?.last_7_days?.avg_sentiment_score ?? 0;
          const col = sc>0.15?G.green:sc<-0.15?G.red:G.yellow;
          const isActive = sel===id;
          return (
            <button key={id} onClick={()=>setSel(id)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${isActive?m.color||G.green:G.border}`,background:isActive?`${m.color||G.green}0D`:"transparent",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <span style={{fontSize:20,flexShrink:0}}>{m.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:isActive?700:500,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label||id}</div>
                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0}}/>
                  <span style={{fontSize:11,color:col,fontWeight:600}}>{sc>=0?"+":""}{(sc*100).toFixed(0)}</span>
                  <span style={{fontSize:11,color:G.textS}}>· {s?.last_7_days?.total_mentions||0}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── PANNEAU DÉTAIL ── */}
      <div style={{flex:1,overflowY:"auto",background:G.bg,display:"flex",flexDirection:"column",gap:20,padding:"28px 28px"}}>

        {/* Header + Gauge */}
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:16,padding:"24px 28px",display:"flex",alignItems:"center",gap:28}}>
          <div style={{width:60,height:60,borderRadius:16,background:`${meta.color||G.green}18`,border:`1px solid ${meta.color||G.green}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>
            {meta.icon}
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:18,color:G.text,marginBottom:4}}>{dash?.ministry?.name||meta.label}</div>
            <div style={{fontSize:13,color:G.textM}}>{total} mentions · 30 derniers jours · {articles.length} articles collectés</div>
          </div>
          {loadSum
            ? <Spinner size={20}/>
            : <ArcGauge score={score} size={150}/>
          }
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,minWidth:240}}>
            {[
              {l:"Positif", v:agg.positive||0, c:G.green},
              {l:"Neutre",  v:agg.neutral||0,  c:G.gray400},
              {l:"Négatif", v:agg.negative||0, c:G.red},
            ].map(k=>(
              <div key={k.l} style={{background:G.gray50,borderRadius:10,padding:"10px 14px",textAlign:"center",border:`1px solid ${G.border}`}}>
                <div style={{fontSize:11,color:G.textM,marginBottom:3}}>{k.l}</div>
                <div style={{fontSize:22,fontWeight:800,color:k.c}}>{k.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sujets tendance */}
        {topics.length>0&&(
          <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"20px 24px"}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              🔥 Sujets tendance <Tag label={`${topics.length}`} color="blue"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {topics.map((t,i)=>(
                <div key={i} style={{padding:"10px 12px",background:G.gray50,borderRadius:8,border:`1px solid ${G.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:12,fontWeight:600,color:G.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"75%"}}>{t.topic}</span>
                    <span style={{fontSize:11,color:G.textM,fontWeight:700,flexShrink:0}}>{t.vol}</span>
                  </div>
                  <div style={{height:4,borderRadius:999,background:G.gray200,overflow:"hidden"}}>
                    <div style={{display:"flex",height:"100%"}}>
                      <div style={{width:`${Math.round(t.pos/maxTopVol*100)}%`,background:G.green}}/>
                      <div style={{width:`${Math.round(t.neu/maxTopVol*100)}%`,background:G.gray300}}/>
                      <div style={{width:`${Math.round(t.neg/maxTopVol*100)}%`,background:G.red}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Articles */}
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"20px 24px",flex:1}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{fontWeight:700,fontSize:14}}>
              Articles récents
              <span style={{fontSize:12,color:G.textM,fontWeight:400,marginLeft:8}}>{filtered.length} résultats</span>
            </div>
            {/* Filtres plateforme */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {platOptions.map(p=>(
                <button key={p} onClick={()=>setPlatFilter(p)}
                  style={{padding:"5px 14px",borderRadius:20,border:`1px solid ${platFilter===p?G.green:G.border}`,background:platFilter===p?G.green:"transparent",color:platFilter===p?"#fff":G.textM,fontSize:12,fontWeight:platFilter===p?600:400,cursor:"pointer",transition:"all .15s"}}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {loadArt
            ? <div style={{display:"flex",justifyContent:"center",padding:40}}><Spinner size={28}/></div>
            : filtered.length===0
              ? <div style={{textAlign:"center",padding:"32px 0",color:G.textM,fontSize:13}}>Aucun article sur cette période</div>
              : <div style={{display:"flex",flexDirection:"column"}}>
                  {filtered.map((a,i)=>(
                    <div key={a.id} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:i<filtered.length-1?`1px solid ${G.border}`:"none",alignItems:"flex-start"}}>
                      {/* Sentiment dot */}
                      <div style={{width:8,height:8,borderRadius:"50%",background:sentColor(a.sentiment),marginTop:5,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:G.textM,flexShrink:0}}>{fmtDate(a.published_at)}</span>
                          <span style={{fontSize:11,background:G.gray100,borderRadius:4,padding:"1px 7px",color:G.textM,flexShrink:0}}>{a.platform}</span>
                          {a.source_name&&<span style={{fontSize:11,color:G.textS,flexShrink:0}}>{a.source_name}</span>}
                          <span style={{marginLeft:"auto",flexShrink:0}}><SentBadge s={a.sentiment}/></span>
                        </div>
                        <a href={a.url} target="_blank" rel="noreferrer"
                          style={{fontSize:13,fontWeight:600,color:G.text,textDecoration:"none",lineHeight:1.4,display:"block",marginBottom:a.topics?.length?6:0}}
                          onMouseEnter={e=>e.currentTarget.style.color=G.green}
                          onMouseLeave={e=>e.currentTarget.style.color=G.text}>
                          {a.title}
                        </a>
                        {a.topics?.length>0&&(
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            {a.topics.slice(0,4).map((t,j)=><Tag key={j} label={t} color="gray"/>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
          }
        </div>

        {/* Mots-clés — discrets, repliables */}
        <div style={{borderRadius:10,border:`1px solid ${G.border}`,background:G.gray50,overflow:"hidden"}}>
          <button onClick={()=>setKwOpen(p=>!p)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"none",border:"none",cursor:"pointer",fontSize:12,color:G.textS,fontWeight:500}}>
            <span>Mots-clés suivis ({keywords.length})</span>
            <span style={{fontSize:10,transition:"transform .2s",display:"inline-block",transform:kwOpen?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
          </button>
          {kwOpen&&(
            <div style={{padding:"0 16px 14px",display:"flex",flexWrap:"wrap",gap:6}}>
              {keywords.map((k,i)=>(
                <span key={i} style={{fontSize:11,color:G.textS,background:G.gray100,border:`1px solid ${G.border}`,borderRadius:12,padding:"2px 10px"}}>{k.term}</span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── FLUX LIVE ── */
function FluxLive() {
  const [platFilter, setPlatFilter] = useState("Toutes");
  const [sortBy, setSortBy] = useState("Date");
  const [items, setItems] = useState(AUTHORS_DATA);
  const [count, setCount] = useState(AUTHORS_DATA.length);
  const [now] = useState(new Date());

  const filtered = platFilter==="Toutes" ? items
    : items.filter(m=>{
        if(platFilter==="Twitter X") return m.platform==="twitter";
        if(platFilter==="TikTok")    return m.platform==="tiktok";
        if(platFilter==="LinkedIn")  return m.platform==="linkedin";
        if(platFilter==="Web/Presse"||platFilter==="Presse") return m.platform==="presse";
        return true;
      });

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Flux Live</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>{filtered.length} publications · Surveillance en temps réel</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,background:G.white,border:`1px solid ${G.border}`,borderRadius:8,padding:"6px 14px",cursor:"pointer"}}>
          <span style={{fontSize:13,color:G.textM}}>Last 30 days</span>
          <span style={{color:G.textM}}>▾</span>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"16px 20px",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
          <button style={{display:"flex",alignItems:"center",gap:6,background:G.green,color:"#fff",border:"none",borderRadius:20,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ▼ ADD FILTER
          </button>
          <span style={{fontSize:13,color:G.textM}}>Plateformes :</span>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {PLATFORMS_FILTER.filter(p=>p!=="Presse").map(p=>(
              <button key={p} onClick={()=>setPlatFilter(p)}
                style={{padding:"6px 16px",borderRadius:20,border:`1px solid ${platFilter===p?G.green:G.border}`,background:platFilter===p?G.green:"transparent",color:platFilter===p?"#fff":G.textM,fontSize:13,fontWeight:platFilter===p?600:400,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
                {p==="Twitter X"&&<span style={{fontSize:10}}>𝕏</span>}
                {p==="TikTok"&&<span style={{fontSize:10}}>♪</span>}
                {p==="LinkedIn"&&<span style={{fontSize:10,fontWeight:900}}>in</span>}
                {p==="Web/Presse"&&<span style={{fontSize:10}}>◈</span>}
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:13,color:G.textM}}>Trier par :</span>
          {SORT_OPTIONS.map(s=>(
            <button key={s} onClick={()=>setSortBy(s)}
              style={{padding:"4px 16px",borderRadius:20,border:`1px solid ${sortBy===s?G.green:G.border}`,background:sortBy===s?G.green:"transparent",color:sortBy===s?"#fff":G.textM,fontSize:13,fontWeight:sortBy===s?600:400,cursor:"pointer",transition:"all .15s"}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* POSTS */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((m,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"20px 24px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <Avatar name={m.name} size={44}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontWeight:700,fontSize:14,color:G.text}}>{m.name}</span>
                  <div style={{width:7,height:7,borderRadius:"50%",background:G.green}}/>
                  <span style={{fontSize:13,color:G.textM}}>{m.handle}</span>
                  <span style={{fontSize:13,color:G.textS}}>· {m.ago}</span>
                  <div style={{marginLeft:"auto"}}><PlatformBadge platform={m.platform}/></div>
                </div>
                <p style={{margin:"0 0 14px",fontSize:14,color:G.text,lineHeight:1.6}}>{m.text}</p>
                <div style={{display:"flex",alignItems:"center",gap:20}}>
                  <div style={{display:"flex",gap:20,fontSize:13,color:G.textM}}>
                    <span>↩ {fmt(m.rt)}</span>
                    <span>💬 {fmt(m.cmt)}</span>
                    <span>♥ {fmt(m.likes)}</span>
                    <span>👁 {fmt(m.views)}</span>
                  </div>
                  <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center"}}>
                    <SentBadge s={m.sentiment}/>
                    <button style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:G.green,fontSize:13,fontWeight:500}}>
                      Voir source ↗
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {filtered.length>0&&(
        <div style={{marginTop:20,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"}}>
          <span style={{fontSize:13,color:G.textM}}>Page <strong>1</strong> sur 1 ({filtered.length} éléments au total)</span>
          <div style={{display:"flex",gap:4}}>
            {["«","‹","1","›","»"].map((b,i)=>(
              <button key={i} style={{width:32,height:32,borderRadius:6,border:`1px solid ${b==="1"?G.green:G.border}`,background:b==="1"?G.green:"#fff",color:b==="1"?"#fff":G.textM,cursor:"pointer",fontSize:13,fontWeight:b==="1"?700:400}}>{b}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ALERTES ── */
function Alertes() {
  const [region, setRegion] = useState("Toutes les régions");
  const [period, setPeriod] = useState("Dernières 24h");

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Alertes</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>Surveillez les événements critiques en temps réel</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          {[region,period].map((v,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:G.white,border:`1px solid ${G.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,color:G.textM}}>
              {v} <span>▾</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
        {[
          {icon:"⚠",  iconBg:"#EF4444", label:"Critiques",        value:"12", sub:"+4",    subUp:false},
          {icon:"📈",  iconBg:"#F59E0B", label:"Avertissements",   value:"34", sub:"+12%",  subUp:false},
          {icon:"🕐",  iconBg:"#0EA5E9", label:"Temps de réponse", value:"8m", sub:"-2m",   subUp:true},
          {icon:"📍",  iconBg:"#16A34A", label:"Régions",          value:"7",  sub:"+2",    subUp:true},
        ].map((k,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            <div style={{width:52,height:52,borderRadius:14,background:k.iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
              {k.icon}
            </div>
            <div>
              <div style={{fontSize:12,color:G.textM,marginBottom:4,fontWeight:500}}>{k.label}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:28,fontWeight:800,color:G.text,lineHeight:1}}>{k.value}</span>
                <span style={{fontSize:13,fontWeight:600,color:k.subUp?G.green:G.red}}>
                  {k.subUp?"↑":"↓"} {k.sub}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ALERT CARDS */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {ALERTS_DATA.map(a=>{
          const borderColor = a.border==="red"?G.red:a.border==="yellow"?G.yellow:G.border;
          const iconColor   = a.border==="red"?G.red:a.border==="yellow"?G.yellow:G.green;
          const bgColor     = a.border==="red"?G.redL:a.border==="yellow"?G.yellowL:G.white;
          return (
            <div key={a.id} style={{background:bgColor,border:`1.5px solid ${borderColor}`,borderRadius:12,padding:"20px 24px",display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:40,height:40,borderRadius:10,background:`${iconColor}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                {a.border==="red"?"⚠":a.border==="yellow"?"⚠":"↗"}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:15,color:G.text}}>{a.title}</span>
                  <Tag label={a.tag} color={a.tagColor}/>
                </div>
                <p style={{margin:0,fontSize:13,color:G.textM,marginBottom:8}}>{a.desc}</p>
                <div style={{display:"flex",gap:16,fontSize:12,color:G.textS}}>
                  <span>📍 {a.region}</span>
                  <span>🕐 {a.ago}</span>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:800,color:G.red,marginBottom:8}}>{a.pct}</div>
                <button style={{background:G.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Analyser</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── CARTOGRAPHIE ── */
function Cartographie() {
  const [view, setView] = useState("Articles");
  const [sel, setSel]   = useState(null);

  return (
    <div style={{padding:"32px 36px"}}>
      <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Cartographie régionale</h1>
      <p style={{color:G.textM,fontSize:14,margin:"0 0 24px"}}>Distribution géographique de l'activité digitale au Sénégal</p>

      <div style={{display:"flex",gap:4,marginBottom:24}}>
        {["Articles","Tweets","Alertes"].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{padding:"8px 20px",borderRadius:8,border:"none",background:view===v?G.green:"transparent",color:view===v?"#fff":G.textM,fontSize:13,fontWeight:view===v?600:400,cursor:"pointer"}}>
            {v}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:20}}>
        {/* RANKING */}
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:G.text,margin:"0 0 16px",display:"flex",alignItems:"center",gap:8}}>
            📊 Classement régional
          </h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {REGIONS_DATA.map((r,i)=>(
              <div key={i} onClick={()=>setSel(r.name)} style={{background:sel===r.name?G.green:G.white,border:`1px solid ${sel===r.name?G.green:G.border}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:sel===r.name?"#fff":G.green}}>#{r.rank}</span>
                    <span style={{fontWeight:700,fontSize:14,color:sel===r.name?"#fff":G.text}}>{r.name}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:r.trendColor==="green"?sel===r.name?"#fff":G.green:sel===r.name?"#ffcccc":G.red}}>
                    {r.trend==="+"?"↗":"↘"} {r.pct}
                  </span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:12,color:sel===r.name?"rgba(255,255,255,.75)":G.textM}}>Mentions</span>
                  <span style={{fontSize:14,fontWeight:700,color:sel===r.name?"#fff":G.text}}>{fmt(r.mentions)}</span>
                </div>
                <div style={{background:sel===r.name?"rgba(255,255,255,.3)":G.gray200,borderRadius:999,height:5,overflow:"hidden"}}>
                  <div style={{width:`${r.sentiment}%`,height:"100%",background:sel===r.name?"#fff":G.green,borderRadius:999}}/>
                </div>
                <div style={{fontSize:11,color:sel===r.name?"rgba(255,255,255,.65)":G.textS,marginTop:5}}>Sentiment positif : {r.sentiment}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* MAP GRID (treemap-style) */}
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:G.text,margin:"0 0 16px"}}>Carte interactive du Sénégal</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {MAP_REGIONS.map((r,i)=>{
              const intensity = Math.min(100, (r.mentions/8940)*100);
              const alpha = 0.3 + (intensity/100)*0.7;
              const isSelected = sel===r.name;
              return (
                <div key={i} onClick={()=>setSel(r.name===sel?null:r.name)}
                  style={{
                    background:isSelected?G.greenD:`rgba(22,163,74,${alpha})`,
                    borderRadius:12,
                    padding:r.size==="large"?"24px 20px":"18px 16px",
                    cursor:"pointer",border:`2px solid ${isSelected?G.greenD:"transparent"}`,
                    transition:"all .2s",
                    gridColumn:r.size==="large"?"span 1":"span 1",
                  }}>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:4}}>{r.name}</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>{fmt(r.mentions)}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginTop:2}}>mentions</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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

      {/* KPI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
        {[
          {icon:"📄", iconBg:"#7C3AED", l:"Total",          v:"156",  sub:"+8%",  subUp:true},
          {icon:"📅", iconBg:"#0EA5E9", l:"Ce mois",        v:"12",   sub:"+4",   subUp:true},
          {icon:"📥", iconBg:"#16A34A", l:"Téléchargements",v:"2.4K", sub:"+22%", subUp:true},
          {icon:"📋", iconBg:"#F59E0B", l:"En cours",       v:"3",    sub:"-1",   subUp:false},
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

      {/* LIST */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {RAPPORTS_DATA.map((r,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"18px 24px",display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:44,height:44,borderRadius:10,background:G.greenL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:G.green,flexShrink:0}}>📄</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:G.text,marginBottom:6}}>{r.name}</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:12,color:G.textM}}>📅 {r.date}</span>
                <Tag label={r.type} color="gray"/>
                <Tag label={r.status==="publié"?"Publié":"En cours"} color={r.status==="publié"?"green":"yellow"}/>
                <span style={{fontSize:12,color:G.textS}}>{r.size}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <button style={{background:"none",border:"none",cursor:"pointer",color:G.textM,fontSize:18}}>👁</button>
              <button style={{background:"none",border:"none",cursor:"pointer",color:G.textM,fontSize:18}}>📥</button>
            </div>
          </div>
        ))}
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

function DashboardHome() {
  const [items, setItems] = useState(AUTHORS_DATA);
  const [mCnt, setMCnt]   = useState(24873);
  const [topics,setTopics] = useState([]);
  const [topLoading,setTopLoading] = useState(true);

  useEffect(()=>{
    const t = setInterval(()=>setMCnt(c=>c+rand(1,5)), 3500);
    return ()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    fetch(`${API}/stats/topics?hours=168&limit=12`)
      .then(r=>r.ok?r.json():[])
      .then(d=>{ setTopics(d); setTopLoading(false); })
      .catch(()=>setTopLoading(false));
  },[]);

  return (
    <div style={{padding:"32px 36px"}}>
      <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:"0 0 6px"}}>Dashboard</h1>
      <p style={{color:G.textM,fontSize:14,margin:"0 0 28px"}}>Vue d'ensemble · Surveillance nationale · Temps réel</p>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
        {[
          {
            iconBg:"#7C3AED",
            icon:(
              /* Document with lines — Articles collectés */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="2" width="12" height="16" rx="2" fill="rgba(255,255,255,0.25)"/>
                <path d="M4 6a2 2 0 0 1 2-2h8l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" fill="rgba(255,255,255,0.9)"/>
                <path d="M14 2v4a1 1 0 0 0 1 1h4" stroke="rgba(124,58,237,0.8)" strokeWidth="1.5" fill="none"/>
                <line x1="8" y1="10" x2="16" y2="10" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="13" x2="16" y2="13" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="16" x2="12" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ),
            l:"Mentions totales", v:fmt(mCnt), sub:"+314%", subUp:true
          },
          {
            iconBg:"#10B981",
            icon:(
              /* Chat bubble — Tweets & RT */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h3l3 3 3-3h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill="rgba(255,255,255,0.95)"/>
                <circle cx="8" cy="11" r="1.2" fill="#10B981"/>
                <circle cx="12" cy="11" r="1.2" fill="#10B981"/>
                <circle cx="16" cy="11" r="1.2" fill="#10B981"/>
              </svg>
            ),
            l:"Sentiment positif", v:"58.2%", sub:"+3202%", subUp:true
          },
          {
            iconBg:"#3B82F6",
            icon:(
              /* LinkedIn "in" logo */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="4" fill="rgba(255,255,255,0.95)"/>
                <rect x="5" y="9" width="3" height="9" fill="#3B82F6"/>
                <circle cx="6.5" cy="6.5" r="1.8" fill="#3B82F6"/>
                <path d="M11 9h3v1.5s1-1.5 3-1.5c2.5 0 3 1.5 3 4v5h-3v-4.5c0-1-.5-1.5-1.5-1.5S14 13 14 14v4h-3V9z" fill="#3B82F6"/>
              </svg>
            ),
            l:"Alertes actives", v:"12", sub:"+516%", subUp:true
          },
          {
            iconBg:"#16A34A",
            icon:(
              /* Video camera — TikTok / Posts */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="13" height="12" rx="2.5" fill="rgba(255,255,255,0.95)"/>
                <path d="M15 9.5l5-2.5v10l-5-2.5V9.5z" fill="rgba(255,255,255,0.95)"/>
              </svg>
            ),
            l:"Régions actives", v:"14", sub:"+825%", subUp:true
          },
        ].map((k,i)=>(
          <div key={i} style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:16,padding:"20px 22px",display:"flex",alignItems:"center",gap:18,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
            <div style={{width:58,height:58,borderRadius:16,background:k.iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {k.icon}
            </div>
            <div>
              <div style={{fontSize:12,color:G.textM,marginBottom:5,fontWeight:500}}>{k.l}</div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:30,fontWeight:800,color:G.text,lineHeight:1,letterSpacing:"-1px"}}>{k.v}</span>
                <span style={{display:"flex",alignItems:"center",gap:3,fontSize:13,fontWeight:600,color:k.subUp?"#16A34A":"#DC2626"}}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d={k.subUp?"M6.5 10V3M3.5 6l3-3 3 3":"M6.5 3v7M3.5 7l3 3 3-3"} stroke={k.subUp?"#16A34A":"#DC2626"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {k.sub}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TRENDING TOPICS — pleine largeur */}
      <div style={{marginBottom:20}}>
        <TrendingTopics topics={topics} loading={topLoading} title="Sujets tendance — 7 jours"/>
      </div>

      {/* CHART + SENTIMENT */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,marginBottom:20}}>
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Volume de mentions — 7 jours</div>
          <div style={{fontSize:12,color:G.textM,marginBottom:20}}>Toutes plateformes · Mise à jour temps réel</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,marginBottom:8}}>
            {[42,55,38,68,52,80,65].map((v,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                <div style={{fontSize:10,color:v===80?G.green:G.textS,fontWeight:v===80?700:400}}>{v}K</div>
                <div style={{width:"100%",borderRadius:"4px 4px 0 0",height:`${v}%`,background:v===80?G.green:`${G.green}44`}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d=>(
              <span key={d} style={{flex:1,textAlign:"center",fontSize:11,color:G.textS}}>{d}</span>
            ))}
          </div>
        </div>

        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Sentiment global</div>
          {[{l:"Positif",p:58,c:G.green},{l:"Neutre",p:20,c:G.gray400},{l:"Négatif",p:22,c:G.red}].map(s=>(
            <div key={s.l} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,color:G.textM}}>{s.l}</span>
                <span style={{fontSize:13,fontWeight:700,color:s.c}}>{s.p}%</span>
              </div>
              <GreenBar pct={s.p} height={8}/>
            </div>
          ))}
          <div style={{marginTop:16,padding:"12px 16px",background:G.greenL,borderRadius:8}}>
            <div style={{fontSize:11,color:G.textM,marginBottom:2}}>Part de voix État</div>
            <div style={{fontSize:24,fontWeight:800,color:G.green}}>34.7%</div>
            <div style={{fontSize:11,color:G.red}}>↓ -1.2% vs hier</div>
          </div>
        </div>
      </div>

      {/* LATEST POSTS */}
      <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Publications récentes</div>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {items.slice(0,4).map((m,i)=>(
            <div key={i} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:i<3?`1px solid ${G.border}`:"none",alignItems:"flex-start"}}>
              <Avatar name={m.name} size={36}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:13}}>{m.name}</span>
                  <span style={{fontSize:12,color:G.textS}}>{m.ago}</span>
                  <div style={{marginLeft:"auto"}}><SentBadge s={m.sentiment}/></div>
                </div>
                <p style={{margin:0,fontSize:13,color:G.textM,lineHeight:1.5}}>{m.text.slice(0,100)}…</p>
              </div>
            </div>
          ))}
        </div>
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
  const [platFilter, setPlatFilter] = useState("Tous");
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);

  const filtered = platFilter==="Tous" ? AUTHORS_TABLE
    : AUTHORS_TABLE.filter(()=>Math.random()>.3);

  return (
    <div style={{padding:"32px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:G.text,margin:0,marginBottom:4}}>Auteurs & Influenceurs</h1>
          <p style={{color:G.textM,fontSize:14,margin:0}}>{filtered.length} auteurs identifiés</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setView("list")} style={{width:36,height:36,border:`1px solid ${G.border}`,borderRadius:8,background:view==="list"?G.green:G.white,color:view==="list"?"#fff":G.textM,cursor:"pointer",fontSize:14}}>≡</button>
          <button onClick={()=>setView("grid")} style={{width:36,height:36,border:`1px solid ${G.border}`,borderRadius:8,background:view==="grid"?G.green:G.white,color:view==="grid"?"#fff":G.textM,cursor:"pointer",fontSize:14}}>⊞</button>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <button style={{display:"flex",alignItems:"center",gap:6,background:G.green,color:"#fff",border:"none",borderRadius:20,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>▼ ADD FILTER</button>
        <span style={{fontSize:13,color:G.textM}}>Plateformes :</span>
        {["Tous","Presse","Twitter","TikTok","LinkedIn"].map(p=>(
          <button key={p} onClick={()=>setPlatFilter(p)}
            style={{padding:"6px 16px",borderRadius:20,border:`1px solid ${platFilter===p?G.green:G.border}`,background:platFilter===p?G.green:"transparent",color:platFilter===p?"#fff":G.textM,fontSize:13,fontWeight:platFilter===p?600:400,cursor:"pointer"}}>
            {p}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
        {/* TABLE */}
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 160px 160px",gap:0,background:G.gray100,padding:"12px 20px",fontSize:11,fontWeight:700,color:G.textM,letterSpacing:.5,textTransform:"uppercase"}}>
            <span>AUTEURS</span>
            <span>NOMBRE DE POSTS ↕</span>
            <span>% DE POSTS ↕</span>
          </div>
          {filtered.map((a,i)=>(
            <div key={i} onClick={()=>setSel(a)} style={{display:"grid",gridTemplateColumns:"1fr 160px 160px",gap:0,padding:"14px 20px",borderBottom:`1px solid ${G.border}`,cursor:"pointer",background:sel?.name===a.name?G.greenL:"transparent",transition:"background .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background=sel?.name===a.name?G.greenL:G.gray50}
              onMouseLeave={e=>e.currentTarget.style.background=sel?.name===a.name?G.greenL:"transparent"}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar name={a.name} size={32}/>
                <span style={{fontWeight:600,fontSize:14,color:G.text}}>{a.name}</span>
              </div>
              <span style={{fontSize:14,color:G.text,display:"flex",alignItems:"center"}}>{a.posts}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <GreenBar pct={a.pct*4} height={6}/>
                <span style={{fontSize:13,fontWeight:700,color:G.text,minWidth:40}}>{a.pct}%</span>
              </div>
            </div>
          ))}
          {/* PAGINATION */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderTop:`1px solid ${G.border}`}}>
            <span style={{fontSize:12,color:G.textM}}>Page <strong>1</strong> sur 1 ({filtered.length} éléments au total)</span>
            <div style={{display:"flex",gap:4}}>
              {["«","‹","1","›","»"].map((b,i)=>(
                <button key={i} style={{width:30,height:30,borderRadius:6,border:`1px solid ${b==="1"?G.green:G.border}`,background:b==="1"?G.green:"#fff",color:b==="1"?"#fff":G.textM,cursor:"pointer",fontSize:12}}>{b}</button>
              ))}
            </div>
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:"24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          {sel ? (
            <div style={{width:"100%"}}>
              <Avatar name={sel.name} size={56}/>
              <div style={{fontWeight:700,fontSize:18,marginTop:12,marginBottom:4}}>{sel.name}</div>
              <div style={{fontSize:13,color:G.textM,marginBottom:20}}>{sel.posts} publications · {sel.pct}% du total</div>
              <GreenBar pct={sel.pct*4} height={8}/>
            </div>
          ):(
            <>
              <div style={{width:56,height:56,borderRadius:"50%",background:G.gray100,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
                <span style={{fontSize:26,color:G.gray400}}>👥</span>
              </div>
              <p style={{fontSize:13,color:G.textM,textAlign:"center",margin:0}}>Sélectionnez un auteur pour voir ses détails</p>
            </>
          )}
        </div>
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
  const [loading,   setLoading]  = useState(true);
  const [showForm,  setShowForm] = useState(false);
  const [form, setForm] = useState({name:"",url:"",platform:"presse",lang:"FR"});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const fetchSources = () => {
    setLoading(true);
    fetch(`${API}/collect/status`)
      .then(r=>r.ok?r.json():[])
      .then(data=>{ setSources(data); setLoading(false); })
      .catch(()=>setLoading(false));
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
        )
      }
    </div>
  );
}

/* ── PARAMÈTRES ── */
const CONNECTORS_DEF = [
  {id:"yt",       label:"YouTube",        icon:"▶", color:"#FF0000", desc:"Clé API Data v3",   field:"API Key"},
  {id:"x",        label:"Twitter / X",    icon:"𝕏", color:"#000",    desc:"Bearer Token",      field:"Bearer Token"},
  {id:"reddit",   label:"Reddit",         label2:"Client ID / Secret", icon:"👾", color:"#FF4500", desc:"App credentials", field:"Client ID", field2:"Client Secret"},
  {id:"anthropic",label:"Anthropic (NLP)",icon:"✦", color:"#7C3AED", desc:"Claude API Key",    field:"API Key"},
];

function CollecteursTab() {
  const [configs, setConfigs]   = useState({});
  const [vals,    setVals]      = useState({});
  const [saving,  setSaving]    = useState({});
  const [saved,   setSaved]     = useState({});

  useEffect(()=>{
    fetch(`${API}/connectors/config`)
      .then(r=>r.ok?r.json():{}).then(d=>{ setConfigs(d); })
      .catch(()=>{});
  },[]);

  const save = async(id) => {
    setSaving(p=>({...p,[id]:true})); setSaved(p=>({...p,[id]:false}));
    const payload = {};
    if(vals[id]?.api_key!==undefined)   payload.api_key   = vals[id].api_key;
    if(vals[id]?.rate_limit!==undefined) payload.rate_limit = Number(vals[id].rate_limit);
    if(vals[id]?.active!==undefined)     payload.active    = vals[id].active;
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

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"flex-end"}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>
                  {con.field} {cfg.has_api_key&&<span style={{color:G.green}}>✓ défini</span>}
                </label>
                <input
                  type="password"
                  value={v.api_key ?? ""}
                  onChange={e=>set("api_key",e.target.value)}
                  placeholder={cfg.has_api_key?"••••••••••••••••••••":"Entrez la clé…"}
                  style={{width:"100%",padding:"9px 12px",border:`1px solid ${G.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:G.gray700,display:"block",marginBottom:5}}>Rate limit (req/min)</label>
                <input
                  type="number" min={1} max={1000}
                  value={v.rate_limit ?? cfg.rate_limit ?? 60}
                  onChange={e=>set("rate_limit",e.target.value)}
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
  const SUBTABS = ["Profil","Collecteurs","Notifications","Sécurité","Utilisateurs","Région","Avancé"];

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

      {!["profil","collecteurs","région"].includes(subTab)&&(
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
        <div style={{flex:1,overflowY:"auto",background:G.bg}}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
