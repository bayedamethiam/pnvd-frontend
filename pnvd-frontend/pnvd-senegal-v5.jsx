import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

/* ═══════════════════════════ DESIGN TOKENS ═══════════════════════════ */
const THEME_DARK = {
  bg:"#04070F", bg2:"#080D1C", bg3:"#0C1225",
  card:"#0C1220", cardH:"#101A2E",
  border:"#182030", borderH:"#243A5A",
  gold:"#C8A94B", goldL:"#E8CA6B", goldD:"#7A6020",
  green:"#0FBA7D", greenD:"#062815",
  red:"#F04050",  redD:"#3A0810",
  orange:"#F5A020", orangeD:"#3A2200",
  blue:"#2A7AFF", blueD:"#081840",
  purple:"#9B6DFF", purpleD:"#1A0840",
  teal:"#0DCFCF",
  text:"#E0EAF8", textM:"#607898", textS:"#2A4060",
  sn1:"#009A44", sn2:"#FDEF42", sn3:"#E31B23",
};

const THEME_LIGHT = {
  bg:"#F0F4FA", bg2:"#E8EEF8", bg3:"#DDE5F0",
  card:"#FFFFFF", cardH:"#F5F8FF",
  border:"#C8D4E8", borderH:"#A0B4D0",
  gold:"#B08A20", goldL:"#8A6A10", goldD:"#F5E4A0",
  green:"#0A8A5A", greenD:"#D0F5E8",
  red:"#D02030",  redD:"#FFE0E4",
  orange:"#C07810", orangeD:"#FFF0D0",
  blue:"#1A5ACC", blueD:"#DCE8FF",
  purple:"#6A40D0", purpleD:"#EDE0FF",
  teal:"#0090A0",
  text:"#0A1428", textM:"#4A6080", textS:"#8AA0C0",
  sn1:"#009A44", sn2:"#FDEF42", sn3:"#E31B23",
};


/* ═══════════════════════════ HELPERS ═══════════════════════════ */
const rand  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pick  = arr   => arr[rand(0,arr.length-1)];
const fmtN  = n     => Number(n).toLocaleString("fr-FR");
const clamp = (v,a,b)=> Math.min(b,Math.max(a,v));

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)   return `Il y a ${diff}s`;
  if (diff < 3600) return `Il y a ${Math.floor(diff/60)}min`;
  if (diff < 86400)return `Il y a ${Math.floor(diff/3600)}h`;
  return d.toLocaleDateString("fr-FR");
}

const ALERTS_INIT = [
  {id:1, title:"Pic de volume anormal — Grève transport",        desc:"Volume ×4 en 2h sur Dakar, Thiès et Diourbel. Coordination recommandée.",             level:"critique", time:new Date(Date.now()-31*60000),   read:false},
  {id:2, title:"Désinformation détectée — Score 91/100",         desc:"Fausse déclaration ministérielle relayée de manière coordonnée. Démenti urgent.",      level:"critique", time:new Date(Date.now()-31*60000),   read:false},
  {id:3, title:"Sentiment négatif en hausse — Carburant",        desc:"+23 points en 6h. Concentration : Dakar et Ziguinchor.",                               level:"warning",  time:new Date(Date.now()-2*3600000),  read:false},
  {id:4, title:"Influenceur critique actif — 1.2M abonnés",      desc:"@alioune_ndiaye relaye un contenu négatif à forte portée nationale.",                  level:"warning",  time:new Date(Date.now()-3*3600000),  read:true },
  {id:5, title:"Part de voix État sous le seuil — 22%",          desc:"En dessous du seuil configuré de 25%. Renforcement communication suggéré.",             level:"warning",  time:new Date(Date.now()-5*3600000),  read:true },
  {id:6, title:"Nouveau connecteur RSS actif",                    desc:"feeds.collector.sn opérationnel. 847 nouveaux articles ingérés.",                      level:"info",     time:new Date(Date.now()-6*3600000),  read:true },
  {id:7, title:"Rapport hebdomadaire généré",                     desc:"Rapport du 17-23 Fév 2026 disponible. Envoyé à Présidence et Primature.",              level:"info",     time:new Date(Date.now()-7*3600000),  read:true },
  {id:8, title:"Pic wolof détecté — Louga & Diourbel",           desc:"Augmentation de 38% des mentions en langue wolof sur deux régions.",                   level:"info",     time:new Date(Date.now()-9*3600000),  read:true },
];

/* ═══════════════════════════ STATIC DATA ═══════════════════════════ */
const PLATFORMS = [
  {id:"rss", name:"Médias / RSS",color:"#F5A020",icon:"⚡", endpoint:"feeds.rss.sn",           status:"connected",rateLimit:999},
  {id:"yt",  name:"YouTube",     color:"#FF0000",icon:"▶",  endpoint:"youtube.googleapis.com", status:"connected",rateLimit:300},
  {id:"x",   name:"X / Twitter", color:"#E2E8F0",icon:"𝕏",  endpoint:"api.twitter.com",        status:"connected",rateLimit:500},
  {id:"rd",  name:"Reddit",      color:"#FF4500",icon:"🤖", endpoint:"reddit.com/search.json", status:"connected",rateLimit:100},
  {id:"gd",  name:"GDELT",       color:"#00BCD4",icon:"🌐", endpoint:"api.gdeltproject.org",   status:"connected",rateLimit:999},
  {id:"fb",  name:"Facebook",    color:"#1877F2",icon:"f",  endpoint:"graph.facebook.com",     status:"connected",rateLimit:200},
  {id:"ig",  name:"Instagram",   color:"#E1306C",icon:"◉",  endpoint:"graph.instagram.com",    status:"warning",  rateLimit:150},
  {id:"tt",  name:"TikTok",      color:"#FF0050",icon:"♪",  endpoint:"open.tiktokapis.com",    status:"connected",rateLimit:100},
];

const REGIONS_BASE = [
  {name:"Dakar",        lat:14.7167,  lon:-17.4677, vol:11240,pct:45,  pos:58,neg:18,wol:28, top:"Politique, Transport",   hot:true },
  {name:"Thiès",        lat:14.7833,  lon:-16.9333, vol:3720, pct:15,  pos:52,neg:22,wol:18, top:"Agriculture, Économie",  hot:false},
  {name:"Diourbel",     lat:14.6500,  lon:-16.2333, vol:2490, pct:10,  pos:61,neg:14,wol:42, top:"Éducation, Santé",       hot:false},
  {name:"Saint-Louis",  lat:16.0167,  lon:-16.4833, vol:2000, pct:8,   pos:55,neg:20,wol:22, top:"Pêche, Agriculture",     hot:false},
  {name:"Ziguinchor",   lat:12.5667,  lon:-16.2667, vol:1740, pct:7,   pos:44,neg:31,wol:10, top:"Sécurité, Tourisme",     hot:true },
  {name:"Kaolack",      lat:14.1500,  lon:-16.0667, vol:1490, pct:6,   pos:60,neg:16,wol:35, top:"Commerce, Agriculture",  hot:false},
  {name:"Tambacounda",  lat:13.7667,  lon:-13.6667, vol:870,  pct:3.5, pos:63,neg:12,wol:20, top:"Mines, Agriculture",     hot:false},
  {name:"Matam",        lat:15.6667,  lon:-13.2667, vol:620,  pct:2.5, pos:58,neg:15,wol:30, top:"Élevage, Diaspora",      hot:false},
  {name:"Fatick",       lat:14.3333,  lon:-16.4167, vol:510,  pct:2,   pos:65,neg:10,wol:38, top:"Pêche, Agriculture",     hot:false},
  {name:"Louga",        lat:15.6167,  lon:-16.2167, vol:500,  pct:2,   pos:56,neg:18,wol:45, top:"Élevage, Agriculture",   hot:false},
  {name:"Kolda",        lat:12.9000,  lon:-14.9500, vol:410,  pct:1.6, pos:48,neg:25,wol:12, top:"Agriculture, Santé",     hot:false},
  {name:"Sédhiou",      lat:12.7000,  lon:-15.5500, vol:380,  pct:1.5, pos:50,neg:22,wol:8,  top:"Agriculture, Forêt",    hot:false},
  {name:"Kédougou",     lat:12.5500,  lon:-12.1833, vol:290,  pct:1.2, pos:55,neg:16,wol:5,  top:"Mines, Tourisme",        hot:false},
  {name:"Kaffrine",     lat:14.1000,  lon:-15.5500, vol:280,  pct:1.1, pos:60,neg:14,wol:40, top:"Agriculture",            hot:false},
];

const TOPICS_INIT = [
  {topic:"Plan Sénégal 2050",     sentiment:"positif",base:4800},
  {topic:"Pétrole Sangomar",      sentiment:"neutre", base:3200},
  {topic:"Hausse prix carburant", sentiment:"negatif",base:2900},
  {topic:"BFEM résultats",        sentiment:"positif",base:2400},
  {topic:"Grève transport Dakar", sentiment:"negatif",base:2000},
  {topic:"Budget national 2026",  sentiment:"neutre", base:1700},
  {topic:"Sonko / Politique",     sentiment:"neutre", base:1550},
  {topic:"Éducation supérieure",  sentiment:"positif",base:1100},
  {topic:"Énergie solaire SN",    sentiment:"positif",base:980 },
  {topic:"Sécurité Casamance",    sentiment:"neutre", base:890 },
];

const INFLUENCERS = [
  {name:"@alioune_ndiaye",  platform:"X",        followers:"1.2M",reach:"Très haut",topic:"Politique", sentiment:"negatif",verified:true },
  {name:"Seydou Diallo",    platform:"Facebook",  followers:"890K",reach:"Haut",     topic:"Éducation", sentiment:"positif",verified:true },
  {name:"TalkSénégal",      platform:"YouTube",   followers:"650K",reach:"Haut",     topic:"Général",   sentiment:"neutre", verified:true },
  {name:"@mariama_ba_sn",   platform:"X",        followers:"430K",reach:"Moyen",    topic:"Société",   sentiment:"positif",verified:false},
  {name:"DakarNews",        platform:"Facebook",  followers:"380K",reach:"Moyen",    topic:"Actualité", sentiment:"neutre", verified:true },
  {name:"@leral_sn",        platform:"Instagram", followers:"290K",reach:"Moyen",    topic:"People",    sentiment:"neutre", verified:false},
  {name:"Maguette Diop",    platform:"TikTok",    followers:"210K",reach:"Modéré",   topic:"Économie",  sentiment:"negatif",verified:false},
  {name:"@radio_futura_sn", platform:"X",        followers:"175K",reach:"Modéré",   topic:"Culture",   sentiment:"positif",verified:true },
];

const TEXTS_SAMPLE = [
  {label:"FR · Positif",        lang:"FR",  text:"Le projet Sangomar représente une opportunité historique pour notre pays. Le Sénégal entre dans une nouvelle ère de prospérité nationale."},
  {label:"FR · Critique",       lang:"FR",  text:"La hausse du carburant est inacceptable. Les citoyens n'en peuvent plus de ces décisions qui appauvrissent davantage les familles sénégalaises."},
  {label:"WOL · Positif",       lang:"WOL", text:"Gouvernement bi dafa liggeey bu baax ci kanam réew mi. Senegaal dafa am kanam yépp. Benn Senegaal, benn peuple."},
  {label:"FR · Désinformation", lang:"FR",  text:"RUMEUR : Le ministre des Finances n'a jamais déclaré que les subventions seraient supprimées. Cette information est inventée et diffusée de manière coordonnée."},
];

const AUTHORS    = ["@alioune_ndiaye","@mariama_ba_sn","Seydou Diallo","TalkSénégal","@infos_dakar","@le_temoin_sn","Maguette Diop","@actu_senegal","DakarNews","@leral_sn"];
const FEED_TEXTS = [
  "Le projet Sangomar représente une opportunité historique pour le Sénégal",
  "La grève des transporteurs paralyse Dakar ce matin, chaos total",
  "Résultats BFEM : taux de réussite record cette année !",
  "Le prix du carburant augmente encore, les ménages sous pression",
  "Sénégal 2050 : un plan ambitieux pour notre développement",
  "Bonne nouvelle pour la connectivité numérique au Sénégal",
  "Le gouvernement annonce de nouvelles mesures économiques",
  "Agriculture sénégalaise : les exportations en hausse de 12%",
  "Gouvernement bi dafa liggeey bu baax ci kanam réew mi",
  "Mbindaan Sangomar bi dafa am solo ci Senegaal",
];

function genMention(id) {
  const p = pick(PLATFORMS.filter(x=>x.status==="connected"));
  const isWol = Math.random()<0.18;
  return {id,pid:p.id,pname:p.name,pcolor:p.color,picon:p.icon,author:pick(AUTHORS),text:pick(FEED_TEXTS),lang:isWol?"WOL":"FR",sentiment:pick(["positif","positif","negatif","neutre"]),topic:pick(TOPICS_INIT).topic,likes:rand(5,5000),shares:rand(1,900),region:pick(REGIONS_BASE).name,time:new Date(),confidence:rand(72,99)};
}

/* ═══════════════════════════ MICRO COMPONENTS ═══════════════════════════ */
function SBadge({s,size=10,C}) {
  const neutreBg = C ? C.bg3 : "#111828";
  const m={positif:{bg:C?.greenD||"#062815",c:C?.green||"#0FBA7D",l:"Positif"},negatif:{bg:C?.redD||"#3A0810",c:C?.red||"#F04050",l:"Négatif"},neutre:{bg:neutreBg,c:C?.textM||"#607898",l:"Neutre"}};
  const d=m[s]||m.neutre;
  return <span style={{background:d.bg,color:d.c,fontSize:size,padding:`2px ${size}px`,borderRadius:20,fontWeight:700,letterSpacing:.3,whiteSpace:"nowrap"}}>{d.l}</span>;
}
function PIcon({color,icon,size=22}) {
  return <div style={{width:size,height:size,borderRadius:Math.round(size*.27),background:color+"20",border:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.44,color,fontWeight:900,flexShrink:0}}>{icon}</div>;
}
function Dot({status,pulse,C}) {
  const c=status==="connected"?(C?.green||"#0FBA7D"):status==="warning"?(C?.orange||"#F5A020"):(C?.textS||"#2A4060");
  return <div style={{position:"relative",width:8,height:8,flexShrink:0}}>
    <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>
    {pulse&&status==="connected"&&<div style={{position:"absolute",inset:-3,borderRadius:"50%",border:`2px solid ${c}`,opacity:.4,animation:"ping 1.6s infinite"}}/>}
  </div>;
}
function MBar({pct,color,h=5}) {
  const barColor = color || "#2A7AFF";
  return <div style={{background:"#06080E22",borderRadius:4,height:h,overflow:"hidden",flex:1}}>
    <div style={{width:`${clamp(pct,0,100)}%`,height:"100%",background:barColor,borderRadius:4,transition:"width .7s ease"}}/>
  </div>;
}
function Spin({size=18,color}) {
  const c = color || "#C8A94B";
  return <div style={{width:size,height:size,border:`2px solid ${c}33`,borderTop:`2px solid ${c}`,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>;
}
function Toggle({on,onChange,C}) {
  const onColor  = C?.green  || "#0FBA7D";
  const offColor = C?.textS  || "#2A4060";
  return <div onClick={onChange} style={{width:36,height:20,borderRadius:10,cursor:"pointer",background:on?onColor:offColor,position:"relative",transition:"background .2s",flexShrink:0}}>
    <div style={{position:"absolute",top:2,left:on?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
  </div>;
}

/* ═══════════════════════════ LEAFLET MAP COMPONENT ═══════════════════════════ */
function SenegalMap({regions, selectedRegion, onSelectRegion, C}) {
  const mapRef    = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef= useRef([]);
  const [mapMode, setMapMode]   = useState("heatmap"); // heatmap | sentiment | volume
  const [leafletReady, setLR]   = useState(false);
  const [mapError, setMapError] = useState(false);

  /* Load Leaflet CSS + JS once */
  useEffect(()=>{
    if(window.L){ setLR(true); return; }
    // CSS
    if(!document.getElementById("lf-css")){
      const css=document.createElement("link");
      css.id="lf-css"; css.rel="stylesheet";
      css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(css);
    }
    // JS
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload=()=>setLR(true);
    s.onerror=()=>setMapError(true);
    document.head.appendChild(s);
  },[]);

  /* Init / refresh map */
  useEffect(()=>{
    if(!leafletReady||!mapRef.current) return;
    const L=window.L;

    // Destroy previous instance
    if(mapObjRef.current){ mapObjRef.current.remove(); mapObjRef.current=null; markersRef.current=[]; }

    // Create map centred on Senegal
    const map=L.map(mapRef.current,{
      center:[14.4974,-14.4524], zoom:7,
      zoomControl:true, scrollWheelZoom:true,
      attributionControl:true,
    });
    mapObjRef.current=map;

    // Tile layer — dark CartoDB
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",{
      attribution:'&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains:"abcd", maxZoom:19,
    }).addTo(map);

    // Country outline (approximate bounding box overlay)
    // Region markers
    const maxVol = Math.max(...regions.map(r=>r.vol));
    markersRef.current=[];

    regions.forEach(r=>{
      const pct   = r.vol/maxVol;
      const radius= 8000+pct*60000;  // metres
      const sent  = r.pos>55?"positif":r.neg>28?"negatif":"neutre";
      const color = mapMode==="sentiment"
        ? (sent==="positif"?"#0FBA7D":sent==="negatif"?"#F04050":"#607898")
        : mapMode==="heatmap"
        ? (pct>0.6?"#F04050":pct>0.3?"#F5A020":pct>0.15?"#C8A94B":"#2A7AFF")
        : "#2A7AFF";

      // Pulse circle (halo)
      const halo=L.circle([r.lat,r.lon],{
        radius:radius*1.6, color:color, fillColor:color,
        fillOpacity:.08, weight:.5, opacity:.3,
      }).addTo(map);

      // Main circle
      const circle=L.circle([r.lat,r.lon],{
        radius, color:"#fff", fillColor:color,
        fillOpacity: mapMode==="heatmap"? 0.55+pct*.35 : 0.65,
        weight:1.5, opacity:.9,
      }).addTo(map);

      // Popup content
      const sentLabel=sent==="positif"?"🟢 Positif":sent==="negatif"?"🔴 Négatif":"🟡 Neutre";
      const popupHTML=`
        <div style="font-family:'Courier New',monospace;min-width:200px;">
          <div style="background:#0C1A30;color:#E8CA6B;padding:8px 12px;margin:-8px -12px 10px;font-weight:900;font-size:13px;letter-spacing:1px;border-radius:6px 6px 0 0;">
            📍 ${r.name}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
            <div style="background:#080D1C;border-radius:5px;padding:6px 8px;">
              <div style="font-size:9px;color:#607898;margin-bottom:2px;">MENTIONS</div>
              <div style="font-size:16px;font-weight:900;color:#E0EAF8;">${fmtN(r.vol)}</div>
            </div>
            <div style="background:#080D1C;border-radius:5px;padding:6px 8px;">
              <div style="font-size:9px;color:#607898;margin-bottom:2px;">PART</div>
              <div style="font-size:16px;font-weight:900;color:#C8A94B;">${r.pct}%</div>
            </div>
            <div style="background:#062815;border-radius:5px;padding:6px 8px;">
              <div style="font-size:9px;color:#607898;margin-bottom:2px;">POSITIF</div>
              <div style="font-size:14px;font-weight:900;color:#0FBA7D;">${r.pos}%</div>
            </div>
            <div style="background:#3A0810;border-radius:5px;padding:6px 8px;">
              <div style="font-size:9px;color:#607898;margin-bottom:2px;">NÉGATIF</div>
              <div style="font-size:14px;font-weight:900;color:#F04050;">${r.neg}%</div>
            </div>
          </div>
          <div style="background:#080D1C;border-radius:5px;padding:6px 8px;margin-bottom:8px;">
            <div style="font-size:9px;color:#607898;margin-bottom:2px;">MENTIONS WOLOF</div>
            <div style="font-size:12px;font-weight:700;color:#9B6DFF;">${r.wol}% du volume</div>
          </div>
          <div style="background:#080D1C;border-radius:5px;padding:6px 8px;margin-bottom:8px;">
            <div style="font-size:9px;color:#607898;margin-bottom:2px;">SUJETS DOMINANTS</div>
            <div style="font-size:11px;color:#E0EAF8;">${r.top}</div>
          </div>
          <div style="font-size:11px;color:${sent==="positif"?"#0FBA7D":sent==="negatif"?"#F04050":"#607898"};font-weight:700;">
            Sentiment : ${sentLabel}
          </div>
          ${r.hot?'<div style="margin-top:6px;background:#3A0810;border-radius:4px;padding:4px 8px;font-size:10px;color:#F04050;font-weight:700;">⚡ ZONE SENSIBLE</div>':""}
        </div>`;

      circle.bindPopup(L.popup({
        maxWidth:240, className:"pnvd-popup",
        closeButton:true,
      }).setContent(popupHTML));

      circle.on("click",()=>{ onSelectRegion(r); });
      circle.on("mouseover",()=>{ circle.setStyle({weight:3,fillOpacity:0.85}); });
      circle.on("mouseout", ()=>{ circle.setStyle({weight:1.5,fillOpacity:mapMode==="heatmap"?0.55+pct*.35:0.65}); });

      // Label
      const icon=L.divIcon({
        className:"",
        html:`<div style="font-family:'Courier New',monospace;font-size:${r.vol>5000?11:r.vol>2000?9.5:8.5}px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000,0 0 8px #000;white-space:nowrap;pointer-events:none;">${r.name}</div>`,
        iconAnchor:[0,0],
      });
      L.marker([r.lat+.18,r.lon],{icon,interactive:false}).addTo(map);
      markersRef.current.push({circle,halo});
    });

    // Popup style injection
    if(!document.getElementById("lf-popup-style")){
      const st=document.createElement("style");
      st.id="lf-popup-style";
      st.textContent=`.pnvd-popup .leaflet-popup-content-wrapper{background:#0C1220;border:1px solid #243A5A;border-radius:8px;padding:0;box-shadow:0 8px 40px #000C;}.pnvd-popup .leaflet-popup-content{margin:8px 12px;color:#E0EAF8;}.pnvd-popup .leaflet-popup-tip{background:#0C1220;}.leaflet-popup-close-button{color:#607898!important;font-size:16px!important;}.leaflet-control-zoom{border:1px solid #243A5A!important;}.leaflet-control-zoom a{background:#0C1220!important;color:#C8A94B!important;border-color:#243A5A!important;}.leaflet-control-attribution{background:rgba(4,7,15,.8)!important;color:#2A4060!important;}.leaflet-control-attribution a{color:#2A7AFF!important;}`;
      document.head.appendChild(st);
    }

    return ()=>{ if(mapObjRef.current){ mapObjRef.current.remove(); mapObjRef.current=null; } };
  },[leafletReady,mapMode,regions]);

  if(mapError) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:C.textM}}>
      <div style={{fontSize:40,marginBottom:12}}>🗺</div>
      <div style={{fontWeight:700}}>Carte non disponible</div>
      <div style={{fontSize:11,marginTop:6,color:C.textS}}>Vérifiez votre connexion réseau</div>
    </div>
  );

  return (
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      {/* MAP CONTROLS */}
      <div style={{position:"absolute",top:12,left:12,zIndex:1000,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{background:"rgba(4,7,15,.92)",border:`1px solid ${C.borderH}`,borderRadius:9,padding:"8px 10px",backdropFilter:"blur(8px)"}}>
          <div style={{fontSize:8.5,color:C.textS,letterSpacing:1,marginBottom:7,textTransform:"uppercase"}}>Mode carte</div>
          {[{id:"heatmap",l:"🌡 Heatmap volume"},{id:"sentiment",l:"🎯 Sentiment"},{id:"volume",l:"📊 Volume pur"}].map(({id,l})=>(
            <button key={id} onClick={()=>setMapMode(id)} style={{display:"block",width:"100%",textAlign:"left",background:mapMode===id?C.gold:"transparent",color:mapMode===id?"#000":C.textM,border:`1px solid ${mapMode===id?C.gold:C.border}`,borderRadius:6,padding:"5px 10px",fontSize:10.5,cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:mapMode===id?700:400,marginBottom:4,transition:"all .15s",whiteSpace:"nowrap"}}>{l}</button>
          ))}
        </div>
        {/* LEGEND */}
        <div style={{background:"rgba(4,7,15,.92)",border:`1px solid ${C.borderH}`,borderRadius:9,padding:"8px 10px",backdropFilter:"blur(8px)"}}>
          <div style={{fontSize:8.5,color:C.textS,letterSpacing:1,marginBottom:7,textTransform:"uppercase"}}>Légende</div>
          {(mapMode==="heatmap"
            ? [{c:"#F04050",l:"Très actif (>60%)"},{c:"#F5A020",l:"Actif (30-60%)"},{c:"#C8A94B",l:"Modéré (15-30%)"},{c:"#2A7AFF",l:"Faible (<15%)"}]
            : mapMode==="sentiment"
            ? [{c:C.green,l:"Positif"},{c:C.red,l:"Négatif"},{c:C.textM,l:"Neutre"}]
            : [{c:C.blue,l:"Volume relatif"}]
          ).map(({c,l})=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:c,flexShrink:0,boxShadow:`0 0 6px ${c}88`}}/>
              <span style={{fontSize:10,color:C.textM}}>{l}</span>
            </div>
          ))}
          <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:9.5,color:C.textS}}>
            ◉ Taille = volume mentions
          </div>
        </div>
        {/* LIVE BADGE */}
        <div style={{background:"rgba(6,40,21,.92)",border:`1px solid ${C.green}44`,borderRadius:9,padding:"7px 10px",backdropFilter:"blur(8px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`,animation:"pulse2 1.5s infinite"}}/>
            <span style={{fontSize:10,color:C.green,fontWeight:700}}>LIVE</span>
          </div>
          <div style={{fontSize:10,color:C.green}}>{fmtN(regions.reduce((s,r)=>s+r.vol,0))} mentions</div>
          <div style={{fontSize:9,color:C.textS}}>14 régions · MAJ 30s</div>
        </div>
      </div>
      {/* LOADING */}
      {!leafletReady&&(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,zIndex:999,flexDirection:"column",gap:12}}>
          <Spin size={36} color={C.gold}/>
          <div style={{color:C.textM,fontSize:12}}>Chargement de la carte…</div>
        </div>
      )}
      <div ref={mapRef} style={{width:"100%",height:"100%",borderRadius:12}}/>
    </div>
  );
}

/* ═══════════════════════════ NLP API ═══════════════════════════ */
async function callClaude(text,lang) {
  const r=await fetch(`${API_BASE}/nlp/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,title:""})});
  if(!r.ok) throw new Error(`NLP API error ${r.status}`);
  const d=await r.json();

  const score      = d.sentiment_score||0;
  const absScore   = Math.abs(score);
  const sentiment  = d.sentiment||"neutre";
  const langDet    = d.lang||lang;
  const confiance  = d.confidence_score!=null ? Math.round(d.confidence_score*100)
                   : d.nlp_source==="claude"  ? 92 : 72;
  const disinfoRaw = d.disinformation_score??d.disinfo_score??null;
  const disinfoScore = disinfoRaw!=null ? Math.round(disinfoRaw)
                     : d.is_disinformation    ? Math.round(65+absScore*20)
                     : Math.round(absScore*18);

  let recommandation;
  if(disinfoScore>60)        recommandation="⚠ Risque élevé de désinformation. Déclencher une procédure de vérification et préparer un démenti officiel si nécessaire.";
  else if(sentiment==="negatif"&&absScore>0.5) recommandation="Sentiment fortement négatif. Surveiller la propagation et envisager une réponse communication ciblée.";
  else if(sentiment==="negatif")               recommandation="Surveiller l'évolution. Renforcer la communication positive sur les thèmes concernés.";
  else if(sentiment==="positif"&&absScore>0.4) recommandation="Contenu favorable à forte intensité. Amplifier via les canaux officiels pour maximiser la portée.";
  else if(sentiment==="positif")               recommandation="Contenu favorable. Maintenir la veille standard.";
  else                                         recommandation="Sentiment neutre. Aucune action immédiate requise. Maintenir la veille standard.";

  return {
    langue_detectee : langDet,
    sentiment,
    score_sentiment : score,
    confiance,
    intensite       : absScore>0.5?"forte":absScore>0.2?"modérée":"faible",
    emotions        : d.emotions||[],
    themes          : d.topics||[],
    entites         : (d.entities||[]).map(e=>typeof e==="string"?{nom:e,type:"ENTITÉ",sentiment:"neutre"}:e),
    desinformation_score : disinfoScore,
    signaux_faibles : d.weak_signals||d.signaux_faibles||[],
    resume_analytique    : d.summary||`Analyse ${langDet} effectuée. Sentiment ${sentiment} détecté avec une intensité ${absScore>0.5?"forte":absScore>0.2?"modérée":"faible"}.`,
    recommandation_action: recommandation,
  };
}

/* ═══════════════════════════ REPORT HTML ═══════════════════════════ */
function buildReport({period,date,topics,mentionCnt,alertCount}) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport PNVD — ${period}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#F6F1E9;color:#1A1005;font-size:13px;line-height:1.65}.cover{background:linear-gradient(150deg,#04070F,#0C1A30 65%,#1A3050);color:white;padding:56px 50px;position:relative;overflow:hidden}.cover::after{content:'PNVD';position:absolute;right:-20px;bottom:-40px;font-size:140px;font-weight:900;opacity:.04;color:#C8A94B;line-height:1}.flags{display:flex;gap:5px;margin-bottom:26px}.flags div{height:5px;border-radius:3px}.logo{font-size:30px;font-weight:900;color:#E8CA6B;letter-spacing:3px;margin-bottom:4px}.logo-sub{font-size:9.5px;color:#5070A0;letter-spacing:2px;text-transform:uppercase;margin-bottom:28px}.sec{padding:26px 42px;border-bottom:1px solid #E2D9CC}.stitle{font-size:13.5px;font-weight:700;color:#0C1A30;border-left:4px solid #C8A94B;padding-left:12px;margin-bottom:16px}.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpi{background:#fff;border:1px solid #E0D8C8;border-radius:8px;padding:13px;text-align:center}.kval{font-size:24px;font-weight:700;color:#0C1A30;font-family:monospace}.klabel{font-size:9.5px;color:#8090A8;text-transform:uppercase;letter-spacing:.5px;margin-top:3px}.kdelta{font-size:10.5px;margin-top:4px;font-weight:700}.sbar{display:flex;height:18px;border-radius:5px;overflow:hidden;margin:10px 0}table{width:100%;border-collapse:collapse}th{background:#0C1A30;color:#E8CA6B;padding:7px 12px;font-size:10px;text-align:left}td{padding:8px 12px;font-size:11.5px;border-bottom:1px solid #EDE8E0}tr:nth-child(even) td{background:#FAF7F2}.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9.5px;font-weight:700}.bp{background:#E8FAF0;color:#0A7A50}.bn{background:#FEE;color:#C0000A}.bne{background:#EEF2F8;color:#4A6080}.alert-box{display:flex;gap:10px;padding:10px;background:#fff;border:1px solid #E0D8C8;border-left:4px solid;border-radius:6px;margin-bottom:8px}.footer{background:#0C1A30;color:#4060A0;padding:14px 42px;font-size:9.5px;display:flex;justify-content:space-between}</style></head><body>
<div class="cover"><div class="flags"><div style="width:28px;background:#009A44"></div><div style="width:28px;background:#FDEF42"></div><div style="width:28px;background:#E31B23"></div></div><div class="logo">PNVD</div><div class="logo-sub">Plateforme Nationale de Veille Digitale · République du Sénégal</div><div style="font-size:19px;color:#B0C8E0;margin-bottom:8px">Rapport de Veille Stratégique &amp; Médiatique</div><div style="font-size:14px;color:#E8CA6B;font-weight:700;margin-bottom:4px">Période : ${period}</div><div style="font-size:10.5px;color:#406080">Généré le ${date} · Niveau : RESTREINT</div><div style="display:inline-flex;align-items:center;gap:7px;margin-top:18px;background:rgba(200,169,75,.12);border:1px solid rgba(200,169,75,.28);border-radius:7px;padding:6px 14px;font-size:10.5px;color:#E8CA6B">🔒 Usage officiel exclusivement · Présidence / Primature / Ministères</div></div>
<div class="sec"><div class="stitle">I. INDICATEURS CLÉS DE PERFORMANCE</div><div class="kgrid"><div class="kpi"><div class="kval">${fmtN(mentionCnt)}</div><div class="klabel">Mentions totales</div><div class="kdelta" style="color:#0A7A50">↑ +12.4%</div></div><div class="kpi"><div class="kval">58.2%</div><div class="klabel">Sentiment positif</div><div class="kdelta" style="color:#0A7A50">↑ +3.1%</div></div><div class="kpi"><div class="kval">34.7%</div><div class="klabel">Part de voix État</div><div class="kdelta" style="color:#C0000A">↓ -1.2%</div></div><div class="kpi"><div class="kval">${alertCount}</div><div class="klabel">Alertes émises</div><div class="kdelta" style="color:#C0000A">2 critiques</div></div></div></div>
<div class="sec"><div class="stitle">II. ANALYSE DU SENTIMENT GLOBAL</div><div class="sbar"><div style="width:58%;background:#0FBA7D;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:700">58% Positif</div><div style="width:20%;background:#8090A8;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:700">20%</div><div style="width:22%;background:#F04050;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:700">22% Négatif</div></div><p style="margin-top:10px;font-size:12px;color:#3A4050;font-style:italic">Le climat général reste <strong>favorable</strong>. Le sentiment positif dépasse la majorité absolue. Les sujets économiques maintiennent une pression négative persistante.</p></div>
<div class="sec"><div class="stitle">III. SUJETS TENDANCE</div><table><tr><th>Rang</th><th>Sujet</th><th>Mentions</th><th>Évolution</th><th>Sentiment</th></tr>${topics.slice(0,8).map((t,i)=>`<tr><td style="font-weight:700;color:#C8A94B">${i+1}</td><td style="font-weight:600">${t.topic}</td><td style="font-family:monospace">${fmtN(t.vol||t.base)}</td><td style="color:${i%2?"#0A7A50":"#C0000A"};font-weight:700">${i%2?"↑ ":"↓ "}${rand(2,89)}%</td><td><span class="badge b${t.sentiment==="positif"?"p":t.sentiment==="negatif"?"n":"ne"}">${t.sentiment.charAt(0).toUpperCase()+t.sentiment.slice(1)}</span></td></tr>`).join("")}</table></div>
<div class="sec"><div class="stitle">IV. CARTOGRAPHIE DES CONVERSATIONS</div><table><tr><th>Région</th><th>Mentions</th><th>Part</th><th>Positif</th><th>Négatif</th><th>Wolof</th><th>Sujets dominants</th></tr>${REGIONS_BASE.slice(0,8).map(r=>`<tr><td style="font-weight:600">${r.name}</td><td style="font-family:monospace">${fmtN(r.vol)}</td><td style="font-weight:700;color:#C8A94B">${r.pct}%</td><td style="color:#0A7A50;font-weight:700">${r.pos}%</td><td style="color:#C0000A;font-weight:700">${r.neg}%</td><td style="color:#7B4FE0">${r.wol}%</td><td style="color:#5A6080;font-size:11px">${r.top}</td></tr>`).join("")}</table></div>
<div class="sec"><div class="stitle">V. ALERTES DÉTECTÉES</div><div class="alert-box" style="border-left-color:#F04050"><span style="font-size:18px">🚨</span><div><div style="font-weight:700;font-size:12px">Pic anormal — Grève transport Dakar</div><div style="font-size:11px;color:#6A8098">Volume ×4 en 2h · Dakar, Thiès, Diourbel · Action : Communication de crise immédiate</div></div></div><div class="alert-box" style="border-left-color:#F04050"><span style="font-size:18px">⚠️</span><div><div style="font-weight:700;font-size:12px">Désinformation détectée — Score 91/100</div><div style="font-size:11px;color:#6A8098">Fausse déclaration ministérielle · Diffusion coordonnée · Action : Démenti officiel</div></div></div><div class="alert-box" style="border-left-color:#F5A020"><span style="font-size:18px">📉</span><div><div style="font-weight:700;font-size:12px">Sentiment négatif — Carburant (+23pts/6h)</div><div style="font-size:11px;color:#6A8098">Concentration : Dakar, Ziguinchor · Action : Conférence de presse</div></div></div></div>
<div class="sec"><div class="stitle">VI. RECOMMANDATIONS STRATÉGIQUES</div><ol style="padding-left:18px;color:#2A3040;line-height:2"><li>Organiser une <strong>conférence de presse urgente</strong> sur le dossier carburant.</li><li>Activer le <strong>protocole de contre-désinformation</strong> sur tous les canaux institutionnels.</li><li>Renforcer la communication autour de <strong>Sénégal 2050</strong>.</li><li>Surveiller la <strong>situation à Ziguinchor</strong> (zone sensible, sentiment négatif élevé).</li><li>Produire des éléments de langage en <strong>wolof</strong> (Dakar 28%, Louga 45%, Diourbel 42%).</li></ol></div>
<div class="footer"><span>🇸🇳 PNVD · République du Sénégal · Hébergement Souverain · DPP</span><span>v5.0 · ${date}</span></div></body></html>`;
}


/* ═══════════════════════════ REAL DATA LAYER ═══════════════════════════ */

const RSS_SOURCES = [
  {id:"dakaractu",  name:"Dakaractu",      url:"https://www.dakaractu.com/feed/",            lang:"FR",  color:"#E31B23", icon:"📰", active:true },
  {id:"seneweb",    name:"Seneweb",         url:"https://www.seneweb.com/news/rss.php",       lang:"FR",  color:"#009A44", icon:"📰", active:true },
  {id:"leral",      name:"Leral.net",       url:"https://www.leral.net/feed/",               lang:"FR",  color:"#2A7AFF", icon:"📰", active:true },
  {id:"senenews",   name:"Senenews",        url:"https://www.senenews.com/feed/",            lang:"FR",  color:"#F5A020", icon:"📰", active:true },
  {id:"xibaaru",    name:"Xibaaru",         url:"https://xibaaru.com/feed/",                 lang:"WOL", color:"#9B6DFF", icon:"📰", active:true },
  {id:"pressafrik", name:"Pressafrik",      url:"https://www.pressafrik.com/feed/",          lang:"FR",  color:"#C8A94B", icon:"📰", active:true },
  {id:"rfisen",     name:"RFI Sénégal",     url:"https://www.rfi.fr/af/afrique/senegal/rss", lang:"FR",  color:"#E31B23", icon:"📻", active:true },
  {id:"actusen",    name:"Actusen",         url:"https://actusen.sn/feed/",                  lang:"FR",  color:"#0DCFCF", icon:"📰", active:false},
  {id:"sudquot",    name:"Sud Quotidien",   url:"https://www.sudquotidien.sn/feed/",         lang:"FR",  color:"#0077B5", icon:"📰", active:false},
];

const R2J   = "https://api.rss2json.com/v1/api.json";
const GDELT = "https://api.gdeltproject.org/api/v2/doc/doc";
const YT    = "https://www.googleapis.com/youtube/v3/search";
const RDT   = "https://www.reddit.com/search.json";

function inferSentiment(text="") {
  const t=text.toLowerCase();
  const pos=["bien","bon","succès","victoire","excellent","bravo","progrès","développement","croissance","espoir","réussi","record","avancée","accord","paix","investissement","bonne nouvelle","positif"];
  const neg=["crise","grève","violence","problème","danger","urgent","mort","attaque","corruption","scandale","fraude","pénurie","inflation","colère","protestation","condamné","conflit","tension","déficit","échec","polémique","alerte","négatif","critique","manifestation"];
  const p=pos.filter(w=>t.includes(w)).length;
  const n=neg.filter(w=>t.includes(w)).length;
  return p>n?"positif":n>p?"negatif":"neutre";
}

function inferRegion(text="") {
  const t=text.toLowerCase();
  const regs=[
    {name:"Dakar",       kw:["dakar","plateau","pikine","guédiawaye","rufisque","bargny"]},
    {name:"Thiès",       kw:["thiès","thies","mbour","tivaouane","saly","joal"]},
    {name:"Ziguinchor",  kw:["ziguinchor","casamance","bignona","oussouye"]},
    {name:"Saint-Louis", kw:["saint-louis","podor","dagana","richard-toll"]},
    {name:"Kaolack",     kw:["kaolack","nioro","guinguinéo","foundiougne"]},
    {name:"Diourbel",    kw:["diourbel","touba","mbacké","bambey"]},
    {name:"Tambacounda", kw:["tambacounda","bakel","goudiry","koumpentoum"]},
    {name:"Kédougou",    kw:["kédougou","kedougou","saraya","salemata"]},
    {name:"Louga",       kw:["louga","linguère","kébémer"]},
    {name:"Matam",       kw:["matam","kanel","ranérou"]},
  ];
  for(const reg of regs) if(reg.kw.some(k=>t.includes(k))) return reg.name;
  return "National";
}

function timeAgo(date) {
  const s=Math.floor((Date.now()-new Date(date))/1000);
  if(s<60) return `${s}s`;
  if(s<3600) return `${Math.floor(s/60)}min`;
  if(s<86400) return `${Math.floor(s/3600)}h`;
  return new Date(date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
}

function dedupeSort(items=[]) {
  const seen=new Set();
  return items
    .filter(m=>{ if(!m.url||m.url==="#"||seen.has(m.url)) return false; seen.add(m.url); return true; })
    .sort((a,b)=>new Date(b.time)-new Date(a.time));
}

async function fetchRSS(src, keywords=[]) {
  try {
    const res=await fetch(`${R2J}?rss_url=${encodeURIComponent(src.url)}&count=20`,{signal:AbortSignal.timeout(9000)});
    if(!res.ok) return {src:src.id, status:"error", items:[]};
    const d=await res.json();
    if(d.status!=="ok"||!d.items?.length) return {src:src.id, status:"vide", items:[]};
    const items=d.items.map((item,i)=>{
      const full=(item.title||"")+" "+(item.description||"").replace(/<[^>]+>/g,"");
      return {
        id:`${src.id}-${i}-${Date.now()}`,
        sourceId:src.id, sourceName:src.name, sourceColor:src.color, sourceIcon:src.icon,
        platform:"Presse",
        title:item.title?.trim()||"",
        text:item.description?.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,300)||item.title||"",
        url:item.link||"#",
        author:item.author||src.name,
        lang:src.lang,
        time:new Date(item.pubDate||Date.now()),
        thumbnail:item.thumbnail||item.enclosure?.link||null,
        region:inferRegion(full),
        sentiment:inferSentiment(full),
        matchedKW:keywords.filter(kw=>full.toLowerCase().includes(kw.toLowerCase())),
      };
    });
    return {src:src.id, status:"ok", items, count:items.length, lastFetch:new Date()};
  } catch(e){ return {src:src.id, status:"timeout", items:[], error:e.message}; }
}

async function fetchGDELT(keywords=[]) {
  try {
    const q=keywords.length?keywords.slice(0,3).join(" OR "):"Sénégal politique";
    const url=`${GDELT}?query=${encodeURIComponent(q+" country:senegal sourcelang:french")}&mode=ArtList&maxrecords=25&format=json`;
    const res=await fetch(url,{signal:AbortSignal.timeout(10000)});
    if(!res.ok) return {src:"gdelt", status:"error", items:[]};
    const d=await res.json();
    if(!d.articles?.length) return {src:"gdelt", status:"vide", items:[]};
    const items=d.articles.map((a,i)=>({
      id:`gdelt-${i}-${Date.now()}`,
      sourceId:"gdelt", sourceName:a.domain||"GDELT", sourceColor:"#C8A94B", sourceIcon:"🌐",
      platform:"Web",
      title:a.title?.trim()||"",
      text:a.title?.trim()||"",
      url:a.url||"#",
      author:a.domain||"",
      lang:"FR",
      time:new Date((a.seendate||"").replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,"$1-$2-$3T$4:$5:$6Z")||Date.now()),
      thumbnail:null,
      region:inferRegion(a.title||""),
      sentiment:inferSentiment(a.title||""),
      matchedKW:keywords.filter(kw=>(a.title||"").toLowerCase().includes(kw.toLowerCase())),
    }));
    return {src:"gdelt", status:"ok", items, count:items.length, lastFetch:new Date()};
  } catch(e){ return {src:"gdelt", status:"timeout", items:[], error:e.message}; }
}

async function fetchReddit(keywords=[]) {
  try {
    const q=(keywords.slice(0,2).join(" ")+" senegal").trim();
    const res=await fetch(`${RDT}?q=${encodeURIComponent(q)}&sort=new&limit=15&t=month`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok) return {src:"reddit", status:"error", items:[]};
    const d=await res.json();
    if(!d.data?.children?.length) return {src:"reddit", status:"vide", items:[]};
    const items=d.data.children.map((c,i)=>({
      id:`rdt-${c.data.id||i}`,
      sourceId:"reddit", sourceName:`r/${c.data.subreddit}`, sourceColor:"#FF4500", sourceIcon:"💬",
      platform:"Reddit",
      title:c.data.title?.trim()||"",
      text:c.data.selftext?.trim().slice(0,280)||c.data.title||"",
      url:`https://reddit.com${c.data.permalink}`,
      author:`u/${c.data.author}`,
      lang:"FR",
      time:new Date(c.data.created_utc*1000),
      thumbnail:c.data.thumbnail?.startsWith("http")?c.data.thumbnail:null,
      region:"National",
      sentiment:inferSentiment((c.data.title||"")+" "+(c.data.selftext||"")),
      matchedKW:keywords.filter(kw=>((c.data.title||"")+" "+(c.data.selftext||"")).toLowerCase().includes(kw.toLowerCase())),
    }));
    return {src:"reddit", status:"ok", items, count:items.length, lastFetch:new Date()};
  } catch(e){ return {src:"reddit", status:"timeout", items:[], error:e.message}; }
}

async function fetchYouTube(keywords=[], apiKey="") {
  if(!apiKey) return {src:"youtube", status:"no_key", items:[]};
  try {
    const q=keywords.slice(0,3).join(" ")+" Sénégal";
    const res=await fetch(`${YT}?part=snippet&q=${encodeURIComponent(q)}&regionCode=SN&maxResults=15&order=date&type=video&key=${apiKey}`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      return {src:"youtube", status:"api_error", items:[], error:err.error?.message||`HTTP ${res.status}`};
    }
    const d=await res.json();
    if(!d.items?.length) return {src:"youtube", status:"vide", items:[]};
    const items=d.items.map((item,i)=>({
      id:`yt-${item.id?.videoId||i}`,
      sourceId:"youtube", sourceName:item.snippet.channelTitle, sourceColor:"#FF0000", sourceIcon:"▶",
      platform:"YouTube",
      title:item.snippet.title?.trim()||"",
      text:item.snippet.description?.trim().slice(0,280)||item.snippet.title||"",
      url:`https://youtube.com/watch?v=${item.id?.videoId}`,
      author:item.snippet.channelTitle,
      lang:"FR",
      time:new Date(item.snippet.publishedAt),
      thumbnail:item.snippet.thumbnails?.medium?.url||null,
      region:"National",
      sentiment:inferSentiment((item.snippet.title||"")+" "+(item.snippet.description||"")),
      matchedKW:keywords.filter(kw=>((item.snippet.title||"")+" "+(item.snippet.description||"")).toLowerCase().includes(kw.toLowerCase())),
    }));
    return {src:"youtube", status:"ok", items, count:items.length, lastFetch:new Date()};
  } catch(e){ return {src:"youtube", status:"timeout", items:[], error:e.message}; }
}

export default function PNVD() {
  const [dayMode,setDayMode]   = useState(false);
  const C = dayMode ? THEME_LIGHT : THEME_DARK;

  const [tab,setTab]           = useState("dashboard");
  const [search,setSearch]     = useState("");
  const [sFocus,setSF]         = useState(false);
  const [now,setNow]           = useState(new Date());
  const [pulse,setPulse]       = useState(false);

  /* LIVE DATA */
  const [mentions,setMentions] = useState([]);
  const [mCnt,setMCnt]         = useState(0);
  const [totalIng,setTI]       = useState(0);
  const [liveCnt,setLC]        = useState(0);
  const [topics,setTopics]     = useState(TOPICS_INIT.map(t=>({...t,vol:t.base,delta:0})));
  const [regions,setRegions]   = useState(REGIONS_BASE.map(r=>({...r,vol:0,pct:0})));
  const [selRegion,setSelReg]  = useState(null);
  const midRef                 = useRef(300);

  /* CONNECTORS */
  const [conn,setConn]         = useState(PLATFORMS.map(p=>({...p,usage:0,latency:0,ingested:0,errors:0,status:"offline"})));

  /* KEYWORDS */
  const [kws,setKWS]           = useState(["Sénégal 2050","Sangomar","BFEM","grève","carburant","#SenPol","Sonko","UCAD","budget2026","#Sénégal"]);
  const [newKW,setNewKW]       = useState("");

  /* ALERTS */
  const [alertRules,setAR]     = useState([
    {id:1,name:"Pic de volume",       metric:"volume",   op:">",threshold:5000,  channel:"email",active:true, triggered:false},
    {id:2,name:"Sentiment négatif",   metric:"negatif",  op:">",threshold:40,    channel:"sms",  active:true, triggered:true },
    {id:3,name:"Désinformation",      metric:"disinfo",  op:">",threshold:70,    channel:"both", active:true, triggered:true },
    {id:4,name:"Part de voix état",   metric:"voix",     op:"<",threshold:25,    channel:"email",active:false,triggered:false},
    {id:5,name:"Influenceur critique",metric:"influence",op:">",threshold:500000,channel:"sms",  active:true, triggered:false},
  ]);
  const [contacts,setContacts] = useState([
    {id:1,name:"Cellule Communication",email:"com@presidence.sn",   phone:"+221 77 000 0001",role:"Primaire",  active:true },
    {id:2,name:"Conseiller Présidence",email:"conseil@presidence.sn",phone:"+221 77 000 0002",role:"Secondaire",active:true },
    {id:3,name:"Attaché presse",       email:"presse@primature.sn",  phone:"+221 77 000 0003",role:"Tertiaire", active:false},
  ]);
  const [testSend,setTS]       = useState(null);
  const [testSent,setTSent]    = useState({});

  /* ALERTS DISPLAY */
  const [alerts,setAlerts]     = useState(ALERTS_INIT);
  const [alertFilter,setAF]    = useState("Toutes");
  const markAlertRead = id => { setAlerts(p=>p.map(a=>a.id===id?{...a,read:true}:a)); if(!isNaN(id)) fetch(`${API_BASE}/alerts/${id}/read`,{method:"PATCH"}).catch(()=>{}); };

  /* NLP */
  const [nlpText,setNlpTxt]    = useState("");
  const [nlpLang,setNlpLang]   = useState("AUTO");
  const [nlpLoad,setNlpLoad]   = useState(false);
  const [nlpRes,setNlpRes]     = useState(null);
  const [nlpErr,setNlpErr]     = useState("");
  const [nlpHist,setNlpHist]   = useState([]);

  /* REPORTS */
  const [rPeriod,setRP]        = useState("Semaine du 17-23 Février 2026");
  const [rGen,setRGen]         = useState(false);
  const [rReady,setRReady]     = useState(false);
  const [rUrl,setRUrl]         = useState(null);
  const [rSec,setRSec]         = useState({sentiment:true,topics:true,alerts:true,influencers:true,regions:true,nlp:false});

  /* PIPELINE */
  const [pipe,setPipe]         = useState({stage:"idle",progress:0});
  const [collectT,setCT]       = useState(null);
  const [collectStatus,setCS]  = useState({});

  /* BENCHMARK */

  /* ── REAL DATA ── */
  const [liveItems,setLI]      = useState([]);
  const [srcStatus,setSS]      = useState({});
  const [fetchLoading,setFL]   = useState(false);
  const [lastFetch,setLF]      = useState(null);
  const [fetchErr,setFE]       = useState("");
  const [rssSrcs,setRssSrcs]   = useState(RSS_SOURCES);
  const [ytKey,setYtKey]       = useState("");
  const [ytKeyDraft,setYtKD]   = useState("");
  const [showYtKey,setShowYK]  = useState(false);
  const [configPlatform,setCfgPlat] = useState(null);
  const [cfgDraft,setCfgDraft]      = useState({});
  const [cfgSaving,setCfgSaving]    = useState(false);
  const [kwFilter,setKwF]      = useState("all");
  const [selPlatform,setSelPl] = useState(null); // null = toutes les plateformes
  const [selKW,setSelKW]       = useState(null);
  const [dashStats,setDashStats]= useState(null);
  const [kwStats,setKwStats]   = useState([]);
  const autoRef                = useRef(null);

  /* MINISTÈRES */
  const [ministries,setMinistries]       = useState([]);
  const [selMinistry,setSelMin]          = useState(null); // ministry object
  const [minDashboard,setMinDash]        = useState(null); // dashboard data
  const [minArticles,setMinArt]          = useState([]);
  const [minSentPeriod,setMinSentPeriod] = useState("monthly");
  const [minLoading,setMinLoading]       = useState(false);
  const [minKws,setMinKws]              = useState([]);
  const [minKwLoading,setMinKwLoading]  = useState(false);
  const [minNewKw,setMinNewKw]          = useState({term:"",type:"keyword",weight:3});
  const [minAggLoading,setMinAggLoad]   = useState(false);

  const unread   = alerts.filter(a=>!a.read).length;
  const connOK   = conn.filter(c=>c.status==="connected").length;
  const STAGE_LB = {idle:"En attente",connecting:"Connexion...",authenticating:"Auth OAuth...",fetching:"Récupération...",processing:"Traitement NLP...",indexing:"Indexation ES...",done:"✓ Terminé"};

  /* ── LIVE TICK (horloge uniquement) ── */
  useEffect(()=>{
    const t1=setInterval(()=>{ setNow(new Date()); setPulse(p=>!p); },1000);
    return ()=>{ clearInterval(t1); };
  },[]);

  /* ── REAL DATA FETCH ── */
  const fetchAll = useCallback(async(keywords)=>{
    const kwList = keywords ?? kws;
    setFL(true); setFE("");
    try {
      // Récupérer tous les articles sans filtre keyword pour voir toutes les sources
      const params=new URLSearchParams({limit:200,hours:24});
      const res=await fetch(`${API_BASE}/articles?${params}`);
      if(!res.ok) throw new Error(`API error ${res.status}`);
      const articles=await res.json();

      // Mapper plateforme → couleur/icône depuis PLATFORMS
      const platMeta={};
      PLATFORMS.forEach(p=>{ platMeta[p.name.toLowerCase()]={color:p.color,icon:p.icon,name:p.name}; });
      const getPlatMeta=(platform)=>{
        const key=(platform||"").toLowerCase();
        // Correspondances directes et aliases
        if(key==="presse"||key==="web"||key==="rss") return platMeta["médias / rss"]||{color:"#F5A020",icon:"⚡",name:"Presse"};
        if(key==="twitter")  return platMeta["x / twitter"]||{color:"#E2E8F0",icon:"𝕏",name:"X / Twitter"};
        if(key==="youtube")  return platMeta["youtube"]    ||{color:"#FF0000",icon:"▶",name:"YouTube"};
        if(key==="reddit")   return platMeta["reddit"]     ||{color:"#FF4500",icon:"🤖",name:"Reddit"};
        if(key==="gdelt")    return platMeta["gdelt"]      ||{color:"#00BCD4",icon:"🌐",name:"GDELT"};
        return platMeta[key]||{color:"#8090A8",icon:"●",name:platform||"Autre"};
      };

      const items=articles.map(a=>{
        const meta=getPlatMeta(a.platform);
        return {
          id:String(a.id),
          sourceId:a.source_id, sourceName:a.source_name,
          sourceColor:meta.color, sourceIcon:meta.icon,
          platform:a.platform, platformLabel:meta.name,
          title:a.title, text:a.text, url:a.url,
          author:a.author||a.source_name,
          lang:a.lang, time:new Date(a.published_at),
          thumbnail:a.thumbnail||null,
          region:a.region||"National",
          sentiment:a.sentiment,
          sentimentScore:a.sentiment_score||0,
          matchedKW:a.matched_keywords||[],
          isDisinfo:a.is_disinformation||false,
          likes:a.likes||0, shares:a.shares||0, comments:a.comments||0,
        };
      });
      setLI(items);
      setMentions(items.slice(0,120).map(a=>({
        id:a.id, pid:a.sourceId, pname:a.platformLabel||a.sourceName,
        pcolor:a.sourceColor, picon:a.sourceIcon,
        platform:a.platform,
        author:a.author, text:a.title||a.text.slice(0,200), lang:a.lang,
        sentiment:a.sentiment, topic:(a.matchedKW||[])[0]||a.platform||"",
        likes:a.likes, shares:a.shares, region:a.region, time:a.time, confidence:85,
      })));
      setLF(new Date());
      const statusRes=await fetch(`${API_BASE}/collect/status`);
      if(statusRes.ok){
        const srcs=await statusRes.json();
        const ns={};
        srcs.forEach(s=>{ns[s.id]={status:s.status,count:s.last_count||0,lastFetch:s.last_fetch?new Date(s.last_fetch):null,error:s.last_error};});
        setSS(p=>({...p,...ns}));

        // Mettre à jour ingested, errors et last_error depuis collect/status
        setConn(prev=>prev.map(c=>{
          const matchRss=srcs.find(s=>s.name&&c.name&&s.name.toLowerCase()===c.name.toLowerCase());
          if(matchRss) return {...c, ingested:matchRss.last_count||0, errors:matchRss.error_count||0, lastError:matchRss.last_error||null};
          return c;
        }));
      }
      const negCount=items.filter(m=>m.sentiment==="negatif").length;
      if(negCount>items.length*0.4&&items.length>5){
        setAlerts(p=>{
          const exists=p.find(a=>a.id==="auto-neg");
          if(exists) return p;
          return [{id:"auto-neg",title:`Sentiment négatif élevé — ${negCount} mentions`,desc:`${Math.round(negCount/items.length*100)}% des mentions récentes sont négatives sur les mots-clés surveillés.`,level:"warning",time:new Date(),read:false},...p];
        });
      }
    } catch(e){
      setFE(e.message);
    }
    setFL(false);
  },[kws]);

  // Auto-refresh toutes les 5 minutes
  useEffect(()=>{
    fetchAll(kws);
    autoRef.current=setInterval(()=>fetchAll(kws),5*60*1000);
    return()=>clearInterval(autoRef.current);
  },[]);

  // Re-fetch quand les mots-clés changent (debounced 2s)
  useEffect(()=>{
    const t=setTimeout(()=>fetchAll(kws),2000);
    return()=>clearTimeout(t);
  },[kws.join(",")]);

  /* ── DASHBOARD STATS (réelles) ── */
  const fetchDashboard = useCallback(async()=>{
    try {
      const [dashRes, topicsRes, kwRes, healthRes, connRes, cfgRes, srcRes] = await Promise.all([
        fetch(`${API_BASE}/stats/dashboard?hours=24`),
        fetch(`${API_BASE}/stats/topics?hours=24&limit=10`),
        fetch(`${API_BASE}/stats/keywords?hours=24`),
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/connectors/health`),
        fetch(`${API_BASE}/connectors/config`),
        fetch(`${API_BASE}/collect/status`),
      ]);
      if(dashRes.ok){
        const d = await dashRes.json();
        setDashStats({...d, disinfoCount: d.disinformation_count||0});
        setMCnt(d.total_mentions||0);
        const total = (d.regions||[]).reduce((s,r)=>s+r.count,0)||1;
        const rMap = {};
        (d.regions||[]).forEach(r=>{ rMap[r.name]=r.count; });
        setRegions(REGIONS_BASE.map(r=>({
          ...r,
          vol: rMap[r.name]!=null ? rMap[r.name] : 0,
          pct: rMap[r.name]!=null ? Math.round(rMap[r.name]/total*1000)/10 : 0,
        })));
      }
      if(topicsRes.ok){
        const t = await topicsRes.json();
        if(t.length) setTopics(t.map(t=>({
          topic:t.topic, vol:t.vol, base:t.vol,
          sentiment:t.neg>t.pos?"negatif":t.pos>t.neg?"positif":"neutre",
          delta:t.vol>0?Math.round((t.pos-t.neg)/Math.max(t.vol,1)*100):0,
        })));
      }
      if(kwRes.ok){
        const kd=await kwRes.json();
        if(kd.length) setKwStats(kd.map(k=>({
          ...k,
          vol:  k.vol??k.count??k.hits??0,
          delta: k.hits>0 ? Math.round((( k.positif||0)-(k.negatif||0))/Math.max(k.hits,1)*100) : 0,
        })));
      }
      if(healthRes.ok){ const h=await healthRes.json(); setTI(h.total_articles||0); }
      if(connRes.ok){
        const ch=await connRes.json();
        // Mapping : nom affiché (PLATFORMS.name.toLowerCase()) → infos backend
        const MAP={
          "médias / rss":  ch.presse,
          "youtube":       ch.youtube,
          "x / twitter":   ch.twitter,
          "reddit":        ch.reddit,
          "gdelt":         ch.gdelt,
          "facebook":      null,   // pas de collecteur backend
          "instagram":     null,
          "tiktok":        null,
        };
        const toStatus=s=>{
          if(!s) return "offline";
          if(s.status==="ok")            return "connected";
          if(s.status==="warning")       return "warning";
          if(s.status==="unconfigured")  return "offline";
          return "offline";
        };
        setConn(prev=>prev.map(c=>{
          const key=c.name.toLowerCase();
          const info=MAP[key]??null;
          if(info===undefined||info===null) return {...c, status:"offline"};
          return {
            ...c,
            status:   toStatus(info),
            latency:  info.latency_ms??0,
            errors:   info.status!=="ok"?1:0,
          };
        }));
      }
      if(cfgRes.ok){
        const cfgData = await cfgRes.json();
        setConn(prev=>prev.map(c=>{
          const cfg = cfgData[c.id];
          if(!cfg) return c;
          return {
            ...c,
            hasApiKey: cfg.has_api_key,
            rateLimit: cfg.rate_limit ?? c.rateLimit,
            endpoint:  cfg.endpoint  ?? c.endpoint,
            status: cfg.active ? c.status : "offline",
          };
        }));
      }
      if(srcRes.ok){
        const sources = await srcRes.json();
        const PMAP = {rss:["presse","rss","web","news"],yt:["youtube"],x:["twitter"],reddit:["reddit"],gdelt:["gdelt"]};
        const st = {};
        for(const [cid, plats] of Object.entries(PMAP)){
          const rel = sources.filter(s=>plats.includes((s.platform||"").toLowerCase()));
          const ts  = rel.filter(s=>s.last_fetch).map(s=>new Date(s.last_fetch).getTime());
          st[cid] = { last_fetch: ts.length ? new Date(Math.max(...ts)) : null, last_count: rel.reduce((a,s)=>a+(s.last_count||0),0) };
        }
        setCS(st);
      }
    } catch(e){ console.error("fetchDashboard:",e); }
  },[]);

  useEffect(()=>{
    fetchDashboard();
    const t=setInterval(fetchDashboard,5*60*1000);
    return()=>clearInterval(t);
  },[]);

  // Charge les mots-clés depuis le backend au démarrage
  useEffect(()=>{
    fetch(`${API_BASE}/keywords`)
      .then(r=>r.ok?r.json():[])
      .then(data=>{ if(data.length) setKWS(data.map(k=>k.term)); })
      .catch(()=>{});
  },[]);

  // Charge les alertes depuis le backend au démarrage
  useEffect(()=>{
    fetch(`${API_BASE}/alerts?limit=20`)
      .then(r=>r.ok?r.json():[])
      .then(data=>{
        if(data.length) setAlerts(data.map(a=>({id:String(a.id),title:a.title,desc:a.description,level:a.level,time:new Date(a.created_at),read:a.read})));
      })
      .catch(()=>{});
  },[]);

  // Charge la liste des ministères
  useEffect(()=>{
    fetch(`${API_BASE}/ministries`)
      .then(r=>r.ok?r.json():[])
      .then(data=>{ setMinistries(data); if(data.length&&!selMinistry){ const m=data.find(x=>x.level==="ministry")||data[0]; setSelMin(m); } })
      .catch(()=>{});
  },[]);

  // Charge le dashboard d'un ministère sélectionné
  const fetchMinistryDashboard = useCallback(async(m)=>{
    if(!m) return;
    setMinLoading(true);
    try {
      const [dashRes, artRes, kwRes] = await Promise.all([
        fetch(`${API_BASE}/ministries/${m.id}/dashboard`),
        fetch(`${API_BASE}/ministries/${m.id}/articles?days=30&limit=20`),
        fetch(`${API_BASE}/ministries/${m.id}/keywords`),
      ]);
      if(dashRes.ok) setMinDash(await dashRes.json());
      if(artRes.ok)  setMinArt(await artRes.json());
      if(kwRes.ok)   setMinKws(await kwRes.json());
    } catch(e){ console.error("fetchMinistryDashboard:",e); }
    setMinLoading(false);
  },[]);

  useEffect(()=>{ if(selMinistry) fetchMinistryDashboard(selMinistry); },[selMinistry]);

  const addMinKw = async()=>{
    if(!minNewKw.term.trim()||!selMinistry) return;
    setMinKwLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ministries/${selMinistry.id}/keywords`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(minNewKw)});
      if(res.ok){ setMinNewKw({term:"",type:"keyword",weight:3}); fetchMinistryDashboard(selMinistry); }
    } catch(e){}
    setMinKwLoading(false);
  };

  const deleteMinKw = async(kwId)=>{
    if(!selMinistry) return;
    await fetch(`${API_BASE}/ministries/${selMinistry.id}/keywords/${kwId}`,{method:"DELETE"}).catch(()=>{});
    fetchMinistryDashboard(selMinistry);
  };

  const triggerMinAggregate = async()=>{
    if(!selMinistry) return;
    setMinAggLoad(true);
    try {
      await fetch(`${API_BASE}/ministries/${selMinistry.id}/aggregate`,{method:"POST"});
      await fetchMinistryDashboard(selMinistry);
    } catch(e){}
    setMinAggLoad(false);
  };

  /* ── ACTIONS ── */
  const toggleConn = id => setConn(p=>p.map(c=>c.id!==id?c:{...c,status:c.status==="connected"?"offline":"connected"}));
  const updateRule = (id,k,v) => setAR(p=>p.map(r=>r.id!==id?r:{...r,[k]:v}));
  const addKW      = () => { if(!newKW.trim()) return; const t=newKW.trim(); setKWS(p=>[t,...p]); setNewKW(""); fetch(`${API_BASE}/keywords`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({term:t})}).catch(()=>{}); };
  const removeKW   = kw => { setKWS(p=>p.filter(k=>k!==kw)); fetch(`${API_BASE}/keywords/${encodeURIComponent(kw)}`,{method:"DELETE"}).catch(()=>{}); };
  const testAlert  = id => { setTS(id); setTimeout(()=>{ setTS(null); setTSent(p=>({...p,[id]:true})); setTimeout(()=>setTSent(p=>({...p,[id]:false})),3000); },1800); };
  const simCollect = id => {
    setCT(id); setPipe({stage:"connecting",progress:8});
    fetch(`${API_BASE}/collect/trigger`,{method:"POST"}).catch(()=>{});
    [["authenticating",25],["fetching",52],["processing",76],["indexing",93],["done",100]].forEach(([s,p],i)=>setTimeout(()=>setPipe({stage:s,progress:p}),(i+1)*800));
    setTimeout(()=>{ setCT(null); setTimeout(()=>{ setPipe({stage:"idle",progress:0}); fetchDashboard(); },1400); },5*800+600);
  };

  const runNLP = useCallback(async()=>{
    if(!nlpText.trim()) return;
    setNlpLoad(true); setNlpRes(null); setNlpErr("");
    try{
      const lang=nlpLang==="AUTO"?(nlpText.match(/[àâäéèêëïîôùûüç]/i)?"FR":"WOL"):nlpLang;
      const res=await callClaude(nlpText,lang);
      if(res){ setNlpRes(res); setNlpHist(h=>[{text:nlpText.slice(0,55)+"…",result:res,time:new Date()},...h.slice(0,9)]); }
      else setNlpErr("Erreur de parsing.");
    }catch{ setNlpErr("Erreur de connexion à l'API Claude."); }
    setNlpLoad(false);
  },[nlpText,nlpLang]);

  const generateReport = useCallback(()=>{
    setRGen(true); setRReady(false);
    if(rUrl) URL.revokeObjectURL(rUrl);
    setTimeout(()=>{
      const html=buildReport({period:rPeriod,date:now.toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),topics,mentionCnt:mCnt,alertCount:alertRules.filter(r=>r.triggered).length});
      const url=URL.createObjectURL(new Blob([html],{type:"text/html"}));
      setRUrl(url); setRGen(false); setRReady(true);
    },2800);
  },[rPeriod,topics,mCnt,alertRules,now,rUrl]);

  /* ── FILTERS ── */
  const ftTop  = topics.filter(t=>!search||t.topic.toLowerCase().includes(search.toLowerCase()));
  const ftMent = mentions.filter(m=>{
    if(selPlatform){
      const pl=PLATFORMS.find(p=>p.name===selPlatform);
      // Comparer le platform de l'article au name du connecteur sélectionné
      const mPl=(m.platform||"").toLowerCase();
      const pName=(selPlatform||"").toLowerCase();
      const match=mPl===pName
        ||(pName.includes("twitter")&&mPl==="twitter")
        ||(pName.includes("rss")&&(mPl==="presse"||mPl==="web"||mPl==="rss"))
        ||(pName==="gdelt"&&mPl==="web");
      if(!match) return false;
    }
    if(!search) return true;
    return m.text.toLowerCase().includes(search.toLowerCase())||m.author.toLowerCase().includes(search.toLowerCase())||m.region.toLowerCase().includes(search.toLowerCase());
  });
  const ftKW   = kws.filter(k=>!search||k.toLowerCase().includes(search.toLowerCase()));

  /* ── INFLUENCEURS dérivés des articles collectés (réseaux sociaux uniquement) ── */
  const SOCIAL_PLATFORMS=["twitter","x","facebook","instagram","tiktok","reddit","youtube"];
  const inflMap={};
  liveItems.forEach(a=>{
    if(!SOCIAL_PLATFORMS.includes((a.platform||"").toLowerCase())) return;
    const key=a.author||a.sourceName;
    if(!key||key.length<2) return;
    if(!inflMap[key]) inflMap[key]={name:key,platform:a.platform||a.platformLabel||"Autre",mentions:0,engagement:0,sentiments:{},topics:{},lang:a.lang||""};
    const inf=inflMap[key];
    inf.mentions+=1;
    inf.engagement+=(a.likes||0)+(a.shares||0);
    inf.sentiments[a.sentiment||"neutre"]=(inf.sentiments[a.sentiment||"neutre"]||0)+1;
    (a.matchedKW||[]).forEach(kw=>{inf.topics[kw]=(inf.topics[kw]||0)+1;});
  });
  const inflList=Object.values(inflMap).map(inf=>({
    ...inf,
    sentiment:Object.entries(inf.sentiments).sort((a,b)=>b[1]-a[1])[0]?.[0]||"neutre",
    topic:Object.entries(inf.topics).sort((a,b)=>b[1]-a[1])[0]?.[0]||inf.platform,
    reach:inf.engagement>1000?"Très haut":inf.engagement>200?"Haut":inf.engagement>50?"Moyen":"Faible",
  })).sort((a,b)=>b.engagement-a.engagement);
  const ftInfl=inflList.filter(i=>!search||i.name.toLowerCase().includes(search.toLowerCase())||i.topic.toLowerCase().includes(search.toLowerCase()));

  const ftReg  = regions.filter(r=>!search||r.name.toLowerCase().includes(search.toLowerCase()));

  /* ── TABS ── */
  const TABS=[
    {id:"dashboard",   label:"Tableau de bord",icon:"▦"},
    {id:"flux",        label:"Flux live",       icon:"📡"},
    {id:"influenceurs",label:"Influenceurs",    icon:"👥"},
    {id:"connecteurs", label:"Connecteurs",     icon:"⚙️"},
    {id:"mots_cles",   label:"Mots-clés",       icon:"🔑"},
    {id:"alertes",     label:"Alertes",         icon:"⚡",badge:unread},
    {id:"nlp",         label:"Analyse NLP IA",  icon:"🧠"},
    {id:"themes",      label:"Thèmes",          icon:"🔍"},
    {id:"regions",     label:"Régions",         icon:"🗺"},
    {id:"ministeres",  label:"Ministères",      icon:"🏛️"},
    {id:"rapports",    label:"Rapports PDF",    icon:"📄"},
  ];

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Courier New',monospace",fontSize:13,transition:"background .3s,color .3s"}}>
      <style>{`
        @keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.2);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideIn{from{transform:translateY(-6px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:${C.border} transparent;transition:background-color .25s,border-color .25s,color .2s}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        .hov:hover{background:${C.cardH}!important;border-color:${C.borderH}!important}
        .btn{border:none;border-radius:8px;cursor:pointer;font-family:'Courier New',monospace;font-weight:700;transition:all .15s}
        .btn:hover{filter:brightness(1.1)}.btn:active{transform:scale(.97)}
        .btn-gold{background:linear-gradient(135deg,${C.gold},${C.goldD});color:${dayMode?"#fff":"#000"}}
        .btn-ghost{background:${C.bg3};border:1px solid ${C.border};color:${C.textM}}
        .inp{background:${C.bg3};border:1.5px solid ${C.border};border-radius:8px;padding:8px 12px;color:${C.text};font-family:'Courier New',monospace;font-size:12px;outline:none;transition:border-color .2s;width:100%}
        .inp:focus{border-color:${C.gold}}
        textarea.inp{resize:vertical;line-height:1.6}
        select.inp option{background:${C.bg3}}
        .tb{background:transparent;border:none;border-top:2px solid transparent;padding:8px 11px;cursor:pointer;font-size:11px;font-family:'Courier New',monospace;border-radius:6px 6px 0 0;transition:all .12s;display:flex;align-items:center;gap:5px;white-space:nowrap;color:${C.textM}}
        .tb.on{background:${C.card};border-top-color:${C.gold};color:${dayMode?C.gold:C.goldL};font-weight:700}
        .tb:not(.on):hover{color:${C.text}}
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{background:`linear-gradient(180deg,${C.bg3},${C.bg2})`,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:200}}>
        <div style={{maxWidth:1600,margin:"0 auto",padding:"0 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,height:54}}>
            {/* LOGO */}
            <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {[C.sn1,C.sn2,C.sn3].map((c,i)=><div key={i} style={{width:4,height:10,background:c,borderRadius:2}}/>)}
              </div>
              <div>
                <div style={{fontWeight:900,fontSize:15,letterSpacing:2,color:C.goldL}}>PNVD<span style={{color:C.textM,fontSize:9,marginLeft:4,fontWeight:400}}>v5.0</span></div>
                <div style={{fontSize:8,color:C.textS,letterSpacing:1.5}}>VEILLE DIGITALE · SÉNÉGAL</div>
              </div>
            </div>
            {/* SEARCH */}
            <div style={{flex:1,maxWidth:460,position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,background:sFocus?C.bg3:C.bg2,border:`1.5px solid ${sFocus?C.gold:C.border}`,borderRadius:9,padding:"0 12px",height:36,transition:"all .2s",boxShadow:sFocus?`0 0 20px ${C.goldD}44`:"none"}}>
                <span style={{color:sFocus?C.gold:C.textM}}>⌕</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setSF(true)} onBlur={()=>setTimeout(()=>setSF(false),200)}
                  placeholder="Rechercher sujet, auteur, région, mot-clé…"
                  style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:12,fontFamily:"'Courier New',monospace"}}/>
                {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",color:C.textM,cursor:"pointer",fontSize:15,padding:0,lineHeight:1}}>&times;</button>}
              </div>
              {search&&sFocus&&(
                <div style={{position:"absolute",top:42,left:0,right:0,background:C.card,border:`1px solid ${C.borderH}`,borderRadius:10,boxShadow:"0 24px 60px #000C",zIndex:300,overflow:"hidden",animation:"slideIn .15s ease"}}>
                  {ftTop.slice(0,3).map((t,i)=>(<div key={i} onClick={()=>{setTab("themes");setSF(false);}} className="hov" style={{display:"flex",alignItems:"center",gap:9,padding:"8px 13px",cursor:"pointer",borderBottom:`1px solid ${C.border}22`}}><span>🔍</span><span style={{flex:1,fontSize:12}}>{t.topic}</span><SBadge s={t.sentiment} C={C}/><span style={{fontSize:10,color:C.textM,fontFamily:"monospace"}}>{fmtN(t.vol)}</span></div>))}
                  {ftReg.slice(0,3).map((r,i)=>(<div key={i} onClick={()=>{setTab("regions");setSelReg(r);setSF(false);}} className="hov" style={{display:"flex",alignItems:"center",gap:9,padding:"8px 13px",cursor:"pointer",borderBottom:`1px solid ${C.border}22`}}><span>📍</span><span style={{flex:1,fontSize:12}}>{r.name}</span><span style={{fontSize:10,color:C.gold,fontFamily:"monospace"}}>{fmtN(r.vol)} mentions</span></div>))}
                  {ftKW.slice(0,3).map((k,i)=>(<div key={i} onClick={()=>{setTab("mots_cles");setSF(false);}} className="hov" style={{display:"flex",alignItems:"center",gap:9,padding:"7px 13px",cursor:"pointer",borderBottom:`1px solid ${C.border}22`}}><span style={{color:C.gold}}>🔑</span><span style={{fontSize:12,color:C.goldL}}>{k}</span></div>))}
                  {ftTop.length===0&&ftReg.length===0&&ftKW.length===0&&<div style={{padding:16,textAlign:"center",color:C.textM,fontSize:12}}>Aucun résultat pour « {search} »</div>}
                </div>
              )}
            </div>
            {/* META */}
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <Dot status="connected" pulse={pulse} C={C}/><span style={{fontSize:10,color:C.green,fontWeight:900,letterSpacing:1}}>LIVE</span>
                <span style={{fontSize:10,color:C.textM,marginLeft:3,fontFamily:"monospace"}}>{now.toLocaleTimeString("fr-FR")}</span>
              </div>
              <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 11px",fontSize:10,color:C.textM}}>{connOK}/{PLATFORMS.length} connecteurs</div>
              <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 11px",fontSize:10,color:C.textM,cursor:"pointer"}}>🔒 Présidence · ADMIN</div>
              {/* MODE TOGGLE */}
              <button
                onClick={()=>setDayMode(d=>!d)}
                title={dayMode?"Passer en mode nuit":"Passer en mode jour"}
                style={{display:"flex",alignItems:"center",gap:6,background:dayMode?"#FFF8E0":"#0C1225",border:`1.5px solid ${dayMode?"#C8A94B44":"#243A5A"}`,borderRadius:20,padding:"3px 10px 3px 4px",cursor:"pointer",transition:"all .25s",boxShadow:dayMode?"0 0 12px #C8A94B22":"none"}}
              >
                {/* TRACK */}
                <div style={{position:"relative",width:34,height:18,background:dayMode?"linear-gradient(90deg,#FDE68A,#FBBF24)":"linear-gradient(90deg,#0C1A30,#1A2E4A)",borderRadius:10,transition:"all .3s",border:`1px solid ${dayMode?"#F59E0B44":"#243A5A"}`}}>
                  {/* KNOB */}
                  <div style={{position:"absolute",top:2,left:dayMode?18:2,width:12,height:12,borderRadius:"50%",background:dayMode?"#fff":"#C8A94B",transition:"left .25s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}>
                    {dayMode?"☀":"🌙"}
                  </div>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:dayMode?"#8A6A10":"#607898",whiteSpace:"nowrap"}}>{dayMode?"MODE JOUR":"MODE NUIT"}</span>
              </button>
            </div>
          </div>
          {/* TABS */}
          <div style={{display:"flex",gap:1,overflowX:"auto"}}>
            {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`tb${tab===t.id?" on":""}`}>{t.icon} {t.label}{t.badge>0&&<span style={{background:C.red,color:"#fff",fontSize:8.5,fontWeight:900,padding:"1px 5px",borderRadius:10,marginLeft:1}}>{t.badge}</span>}</button>))}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div style={{maxWidth:1600,margin:"0 auto",padding:16}}>
        {/* KPI ROW */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
          {[{l:"Mentions totales",v:fmtN(mCnt),d:dashStats?`${fmtN(liveItems.length)} collectées`:"Chargement…",up:true,c:C.blue,i:"📡"},{l:"Sentiment positif",v:dashStats?`${dashStats.sentiment.positif_pct}%`:"—",d:dashStats?`${dashStats.sentiment.negatif_pct}% négatif`:"—",up:true,c:C.green,i:"✅"},{l:"Alertes actives",v:String(unread),d:dashStats?.disinfoCount>0?`${dashStats.disinfoCount} désinformation détectée${dashStats.disinfoCount>1?"s":""}`:`${unread} non lues`,up:false,c:C.red,i:"⚡"},{l:"Articles en base",v:fmtN(totalIng),d:`${fmtN(liveItems.length)} dans la fenêtre 24h`,up:true,c:C.gold,i:"🗄"}].map((s,i)=>(
            <div key={i} className="hov" style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",borderBottom:`3px solid ${s.c}`,animation:`fadeUp ${.08*i}s ease`,cursor:"default"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}><span style={{fontSize:9,color:C.textM,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</span><span style={{fontSize:18}}>{s.i}</span></div>
              <div style={{fontSize:26,fontWeight:900,letterSpacing:-1,marginBottom:3}}>{s.v}</div>
              <div style={{fontSize:10.5,color:s.up?C.green:C.red,fontWeight:700}}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* ══ TABLEAU DE BORD ══ */}
        {tab==="dashboard"&&(
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div><div style={{fontWeight:700,fontSize:13}}>Volume de mentions — 24h</div><div style={{fontSize:10,color:C.textM,marginTop:1}}>Toutes sources · Temps réel</div></div>
                  <div style={{display:"flex",gap:5}}>{["24h","7j","30j"].map(p=><button key={p} className="btn" style={{padding:"3px 10px",fontSize:10,background:p==="24h"?C.gold:"transparent",color:p==="24h"?"#000":C.textM,border:`1px solid ${p==="24h"?C.gold:C.border}`}}>{p}</button>)}</div>
                </div>
                <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80,marginBottom:5}}>
                  {(()=>{const hrs=(dashStats?.hourly_volume||[]).map(h=>h.count);const mx=Math.max(...hrs,1);return (hrs.length?hrs:[0]).map((v,i)=>(
                    <div key={i} style={{flex:1,height:"100%",display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:`${(v/mx)*100}%`,background:i===hrs.length-1?`linear-gradient(180deg,${C.red},${C.redD})`:i===Math.floor(hrs.length*0.6)||i===Math.floor(hrs.length*0.85)?`linear-gradient(180deg,${C.gold},${C.goldD})`:`linear-gradient(180deg,${C.blue}88,${C.blue}33)`,position:"relative",cursor:"pointer"}}>
                        {v===mx&&v>0&&<div style={{position:"absolute",top:-15,left:"50%",transform:"translateX(-50%)",fontSize:8,color:C.gold,fontWeight:700,whiteSpace:"nowrap"}}>{v}</div>}
                      </div>
                    </div>
                  ));})()}
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {["00h","02h","04h","06h","08h","10h","12h","14h","16h","18h","20h","22h","24h"].map((h,i)=><span key={i} style={{flex:1,textAlign:"center",fontSize:8,color:C.textS}}>{h}</span>)}
                </div>
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,marginBottom:10,fontSize:13}}>🔥 Sujets tendance</div>
                {topics.slice(0,8).map((t,i)=>(
                  <div key={i} className="hov" style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:i%2===0?C.bg2:"transparent",borderRadius:7,marginBottom:2,cursor:"pointer"}}>
                    <span style={{color:C.textS,fontWeight:900,fontSize:10,width:16,textAlign:"center"}}>{i+1}</span>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{t.topic}</div><div style={{fontSize:9.5,color:C.textM}}>{fmtN(t.vol)} mentions</div></div>
                    <SBadge s={t.sentiment} C={C}/>
                    <span style={{fontSize:10.5,fontWeight:700,minWidth:44,textAlign:"right",color:t.delta>0?C.green:C.red}}>{t.delta>0?"↑":"↓"}{Math.abs(t.delta)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,marginBottom:12,fontSize:13}}>🎯 Sentiment global</div>
                {(dashStats?[{l:"Positif",p:dashStats.sentiment.positif_pct,c:C.green},{l:"Neutre",p:dashStats.sentiment.neutre_pct,c:C.textM},{l:"Négatif",p:dashStats.sentiment.negatif_pct,c:C.red}]:[{l:"Positif",p:0,c:C.green},{l:"Neutre",p:0,c:C.textM},{l:"Négatif",p:0,c:C.red}]).map(({l,p,c})=>(
                  <div key={l} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:C.textM}}>{l}</span><span style={{fontSize:12,fontWeight:700,color:c,fontFamily:"monospace"}}>{p}%</span></div><MBar pct={p} color={c} h={6}/></div>
                ))}
                {dashStats&&<div style={{marginTop:10,padding:"8px 12px",background:dashStats.sentiment.negatif_pct>40?C.redD:C.greenD,border:`1px solid ${dashStats.sentiment.negatif_pct>40?C.red:C.green}44`,borderRadius:8,textAlign:"center",fontSize:11,color:dashStats.sentiment.negatif_pct>40?C.red:C.green,fontWeight:700}}>{dashStats.sentiment.negatif_pct>40?"🔴 Climat global : TENDU":"🟢 Climat global : FAVORABLE"}</div>}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,marginBottom:10,fontSize:13}}>📡 Connecteurs</div>
                {conn.map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                    <Dot status={p.status} pulse={pulse&&i<5}/><PIcon color={p.color} icon={p.icon} size={18}/>
                    <span style={{flex:1,fontSize:11,color:C.textM}}>{p.name}</span>
                    <span style={{fontSize:9,color:p.status==="connected"?C.green:p.status==="warning"?C.orange:C.textS,fontWeight:700}}>{p.status==="connected"?"ACTIF":p.status==="warning"?"DÉGR.":"OFF"}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.purple}44`,borderRadius:12,padding:16,cursor:"pointer"}} onClick={()=>setTab("nlp")}>
                <div style={{fontWeight:700,fontSize:13,color:C.purple,marginBottom:8}}>🧠 Module NLP IA</div>
                {(()=>{
                  const nFR    = nlpHist.filter(h=>h.result.langue_detectee==="FR").length;
                  const nWOL   = nlpHist.filter(h=>h.result.langue_detectee==="WOL").length;
                  const avgConf= nlpHist.length?Math.round(nlpHist.reduce((s,h)=>s+(h.result.confiance||0),0)/nlpHist.length):null;
                  const nDis   = nlpHist.filter(h=>h.result.desinformation_score>60).length;
                  const has    = nlpHist.length>0;
                  return [
                    {l:"Analyses FR",      v:has?fmtN(nFR):"—"},
                    {l:"Analyses WOL",     v:has?fmtN(nWOL):"—"},
                    {l:"Confiance moy.",   v:has?`${avgConf}%`:"—"},
                    {l:"Désinformation",   v:has?`${nDis} détectée${nDis>1?"s":""}`:"—"},
                  ];
                })().map(({l,v},i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11,color:C.textM}}>{l}</span><span style={{fontSize:11,fontWeight:700,color:C.purple,fontFamily:"monospace"}}>{v}</span></div>
                ))}
                <div style={{marginTop:8,fontSize:10.5,color:C.purple,textAlign:"center",borderTop:`1px solid ${C.purple}33`,paddingTop:8}}>Ouvrir l'analyse →</div>
              </div>
            </div>
          </div>
        )}

        {/* ══ FLUX LIVE ══ */}
        {tab==="flux"&&(
          <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:14}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><Dot status="connected" pulse={pulse} C={C}/><span style={{fontWeight:700,fontSize:13}}>Flux de mentions — Temps réel</span></div>
                <span style={{fontSize:10,color:C.textM}}>{ftMent.length} résultats{search?` · "${search}"`:""}{selPlatform?` · ${selPlatform}`:""}</span>
              </div>
              {/* Filtre par plateforme */}
              <div style={{padding:"8px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:6,flexWrap:"wrap"}}>
                {[{label:"Toutes",value:null},...PLATFORMS.filter(p=>p.status!=="offline"&&conn.find(c=>c.id===p.id)?.status==="connected").map(p=>({label:p.name,value:p.name,color:p.color,icon:p.icon}))].map(({label,value,color,icon})=>{
                  const active=selPlatform===value;
                  const cnt=value?mentions.filter(m=>(m.platform||"").toLowerCase()===value.toLowerCase()||(m.pname||"").toLowerCase().includes((value||"").toLowerCase())).length:mentions.length;
                  return (
                    <button key={label} onClick={()=>setSelPl(value)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,border:`1px solid ${active?(color||C.gold):C.border}`,background:active?(color||C.gold)+"22":"transparent",cursor:"pointer",fontSize:10.5,fontWeight:active?700:400,color:active?(color||C.goldL):C.textM,whiteSpace:"nowrap"}}>
                      {icon&&<span style={{fontSize:11}}>{icon}</span>}
                      {label}
                      <span style={{fontSize:9,opacity:.7,marginLeft:2}}>({cnt})</span>
                    </button>
                  );
                })}
              </div>
              <div style={{maxHeight:"calc(100vh - 310px)",overflowY:"auto"}}>
                {ftMent.map((m,i)=>(
                  <div key={m.id} className="hov" style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}11`,display:"flex",gap:11,alignItems:"flex-start",animation:i<2?"fadeUp .25s ease":"none",background:i===0?C.bg3:undefined,cursor:"pointer"}}>
                    <PIcon color={m.pcolor} icon={m.picon} size={28}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:11.5,color:C.goldL}}>{m.author}</span>
                        <span style={{fontSize:9.5,color:m.pcolor}}>{m.pname}</span>
                        <span style={{fontSize:9,background:m.lang==="WOL"?C.purpleD:C.blueD,color:m.lang==="WOL"?C.purple:C.blue,padding:"1px 6px",borderRadius:8,fontWeight:700}}>{m.lang}</span>
                        <SBadge s={m.sentiment} size={9} C={C}/>
                        <span style={{fontSize:9,color:C.textS}}>· {m.region}</span>
                        {i===0&&<span style={{fontSize:8.5,background:C.green+"22",color:C.green,padding:"1px 6px",borderRadius:8,fontWeight:900}}>NOUVEAU</span>}
                      </div>
                      <div style={{fontSize:11.5,lineHeight:1.5,marginBottom:4}}>{m.text}</div>
                      <div style={{display:"flex",gap:12,fontSize:9.5,color:C.textS}}>
                        <span>🏷 {m.topic}</span><span>❤ {fmtN(m.likes)}</span><span>↗ {fmtN(m.shares)}</span><span style={{color:C.textM}}>NLP: {m.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>📊 Sources</div>
                {(()=>{
                  const total=liveItems.length||1;
                  const counts={};
                  liveItems.forEach(a=>{const key=(a.platformLabel||a.platform||"").toLowerCase();counts[key]=(counts[key]||0)+1;});
                  return conn.filter(p=>p.status!=="offline").map((p,i)=>{
                    const cnt=counts[p.name.toLowerCase()]||0;
                    const pct=Math.round(cnt/total*100);
                    return (
                      <div key={i} style={{marginBottom:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                          <PIcon color={p.color} icon={p.icon} size={15}/><span style={{flex:1,fontSize:10.5,color:C.textM}}>{p.name}</span><span style={{fontSize:10.5,fontWeight:700,color:p.color}}>{pct}%</span>
                        </div>
                        <MBar pct={pct} color={p.color} h={3}/>
                      </div>
                    );
                  });
                })()}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>🌍 Top régions</div>
                {regions.slice(0,6).map((r,i)=>(
                  <div key={i} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:10.5,color:C.textM,cursor:"pointer"}} onClick={()=>{setTab("regions");setSelReg(r);}}>{r.name}</span>
                      <span style={{fontSize:10.5,fontWeight:700,color:i===0?C.gold:C.text}}>{r.pct}%</span>
                    </div>
                    <MBar pct={r.pct*(100/45)} color={i===0?C.gold:C.blue} h={3}/>
                  </div>
                ))}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>🎯 Sentiments live</div>
                {(dashStats?[{l:"Positif",p:dashStats.sentiment.positif_pct,c:C.green},{l:"Neutre",p:dashStats.sentiment.neutre_pct,c:C.textM},{l:"Négatif",p:dashStats.sentiment.negatif_pct,c:C.red}]:[{l:"Positif",p:"—",c:C.green},{l:"Neutre",p:"—",c:C.textM},{l:"Négatif",p:"—",c:C.red}]).map(({l,p,c})=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:11,color:C.textM}}>{l}</span>
                    <span style={{fontSize:12,fontWeight:700,color:c,fontFamily:"monospace"}}>{typeof p==="number"?`${p}%`:p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ INFLUENCEURS ══ */}
        {tab==="influenceurs"&&(()=>{
          const inflNeg=ftInfl.filter(i=>i.sentiment==="negatif").length;
          const inflPortee=ftInfl.reduce((s,i)=>s+i.engagement,0);
          const hasInfl=ftInfl.length>0;
          return(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15}}>👥 Relais d'opinion identifiés</div>
              <span style={{fontSize:11,color:C.textM}}>{hasInfl?`${ftInfl.length} auteurs détectés`:"Aucune donnée — API déconnectée"}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
              {[
                {l:"Auteurs détectés",  v:hasInfl?fmtN(ftInfl.length):"—",        c:C.blue},
                {l:"Engagement cumulé", v:hasInfl?fmtN(inflPortee):"—",            c:C.purple},
                {l:"Ton négatif",       v:hasInfl?fmtN(inflNeg):"—",               c:C.red},
                {l:"Portée maximale",   v:hasInfl?(ftInfl[0]?.reach||"—"):"—",     c:C.green},
              ].map(({l,v,c},i)=>(
                <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:12,borderLeft:`3px solid ${c}`}}>
                  <div style={{fontSize:9,color:C.textM,marginBottom:5,textTransform:"uppercase",letterSpacing:.7}}>{l}</div>
                  <div style={{fontSize:20,fontWeight:900,color:c,fontFamily:"monospace"}}>{v}</div>
                </div>
              ))}
            </div>
            {!hasInfl?(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:60,gap:10}}>
                <div style={{fontSize:40,opacity:.2}}>👥</div>
                <div style={{fontWeight:700,color:C.textM}}>Aucun auteur détecté</div>
                <div style={{fontSize:11,color:C.textS}}>Les relais d'opinion apparaissent dès que des articles sont collectés via l'API.</div>
              </div>
            ):(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:0}}>
                {["Auteur","Plateforme","Mentions","Engagement","Sujet","Sentiment"].map(h=>(
                  <div key={h} style={{padding:"9px 14px",fontSize:9.5,color:C.textM,fontWeight:700,letterSpacing:.5,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase"}}>{h}</div>
                ))}
              </div>
              {ftInfl.map((inf,i)=>(
                <div key={i} className="hov" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",borderBottom:`1px solid ${C.border}22`,background:i%2===0?C.bg2:"transparent",cursor:"pointer"}}>
                  <div style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontWeight:600,fontSize:12}}>{inf.name}</span>
                  </div>
                  <div style={{padding:"11px 14px",fontSize:11,color:C.textM}}>{inf.platform}</div>
                  <div style={{padding:"11px 14px",fontSize:12,fontWeight:700,fontFamily:"monospace",color:C.blue}}>{fmtN(inf.mentions)}</div>
                  <div style={{padding:"11px 14px",fontSize:12,fontWeight:700,fontFamily:"monospace",color:inf.reach==="Très haut"||inf.reach==="Haut"?C.green:C.textM}}>{fmtN(inf.engagement)}</div>
                  <div style={{padding:"11px 14px",fontSize:11,color:C.textM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inf.topic||"—"}</div>
                  <div style={{padding:"11px 14px"}}><SBadge s={inf.sentiment} C={C}/></div>
                </div>
              ))}
            </div>
            )}
          </div>
        );})()}

        {/* ══ CONNECTEURS (unifié Sources + Connecteurs) ══ */}
        {tab==="connecteurs"&&(()=>{
          const now1h = Date.now()-3600000;
          const mentionsH = liveItems.filter(a=>new Date(a.time).getTime()>=now1h).length;
          const langs = [...new Set(liveItems.map(a=>a.lang).filter(Boolean))];
          const couverture = conn.length ? Math.round(connOK/conn.length*100) : 0;
          const fmtFetch = dt => {
            if(!dt) return "Jamais";
            const diff = Date.now()-dt.getTime();
            if(diff<60000)   return "À l'instant";
            if(diff<3600000) return `Il y a ${Math.round(diff/60000)} min`;
            if(diff<86400000)return `Il y a ${Math.round(diff/3600000)}h`;
            return dt.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
          };
          return(
          <div>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[
                {l:"Connecteurs actifs", v:`${connOK}/${conn.length}`,       c:C.green},
                {l:"Mentions / heure",   v:liveItems.length?fmtN(mentionsH):"—", c:C.blue},
                {l:"Langues détectées",  v:langs.length?langs.join(" · "):"—",   c:C.purple},
                {l:"Couverture",         v:`${couverture}%`,                      c:C.gold},
              ].map(({l,v,c},i)=>(
                <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14,borderTop:`3px solid ${c}`}}>
                  <div style={{fontSize:9.5,color:C.textM,marginBottom:6,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
                  <div style={{fontSize:20,fontWeight:900,color:c,fontFamily:"monospace"}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Header + bouton global */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:C.textM}}>{connOK}/{PLATFORMS.length} actifs · Pipeline de collecte automatique toutes les 15 min</div>
              <button onClick={()=>simCollect("all")} disabled={collectT==="all"} className="btn btn-gold" style={{padding:"8px 18px",fontSize:12}}>
                {collectT==="all"?<span style={{display:"flex",alignItems:"center",gap:6}}><Spin size={12}/>{STAGE_LB[pipe.stage]}</span>:"▶ Lancer la collecte"}
              </button>
            </div>
            {/* Barre de progression pipeline */}
            {pipe.stage!=="idle"&&(
              <div style={{background:C.card,border:`1px solid ${C.borderH}`,borderRadius:10,padding:14,marginBottom:14,animation:"fadeUp .3s ease"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.goldL}}>Pipeline en cours</span>
                  <span style={{fontSize:12,color:pipe.stage==="done"?C.green:C.gold,fontWeight:700}}>{STAGE_LB[pipe.stage]}</span>
                </div>
                <MBar pct={pipe.progress} color={pipe.stage==="done"?C.green:C.gold} h={8}/>
                <div style={{fontSize:9.5,color:C.textS,marginTop:5,textAlign:"right"}}>{pipe.progress}%</div>
              </div>
            )}
            {/* Cartes connecteurs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
              {conn.map((c,i)=>{
                const platItems=liveItems.filter(a=>{
                  const m=(a.platform||"").toLowerCase(), n=(c.name||"").toLowerCase();
                  return m===n||(n.includes("rss")&&(m==="presse"||m==="web"||m==="rss"))||(n.includes("twitter")&&m==="twitter")||(n==="gdelt"&&m==="web");
                });
                const platLangs=[...new Set(platItems.map(a=>a.lang).filter(Boolean))];
                const cs = collectStatus[c.id];
                return(
                <div key={i} className="hov" style={{background:C.card,border:`1.5px solid ${c.status==="connected"?c.color+"33":C.border}`,borderRadius:12,padding:16,borderLeft:`4px solid ${c.status==="connected"?c.color:c.status==="warning"?C.orange:C.textS}`}}>
                  {/* Titre + toggle */}
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <PIcon color={c.color} icon={c.icon} size={34}/>
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{c.name}</div>
                        <div style={{fontSize:9,color:C.textS,fontFamily:"monospace"}}>{c.endpoint}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:9.5,fontWeight:700,padding:"3px 9px",borderRadius:6,background:c.status==="connected"?C.greenD:c.status==="warning"?"#2A1A00":C.bg3,color:c.status==="connected"?C.green:c.status==="warning"?C.orange:C.textS,border:`1px solid ${c.status==="connected"?C.green+"44":c.status==="warning"?C.orange+"44":C.border}`}}>
                        {c.status==="connected"?"EN LIGNE":c.status==="warning"?"DÉGRADÉ":"HORS LIGNE"}
                      </span>
                      <Toggle on={c.status==="connected"} onChange={()=>toggleConn(c.id)} C={C}/>
                    </div>
                  </div>
                  {/* Métriques */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:10}}>
                    {[
                      {l:"Latence",  v:`${c.latency}ms`, b:c.latency/4,   col:c.latency>200?C.orange:C.green},
                      {l:"Erreurs",  v:c.errors,          b:c.errors*20,   col:c.errors>3?C.red:C.green},
                      {l:"Ingérés",  v:c.ingested>0?fmtN(c.ingested):"—", b:0, col:C.blue},
                    ].map(({l,v,b,col},j)=>(
                      <div key={j} style={{background:C.bg3,borderRadius:6,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:C.textS,marginBottom:3}}>{l}</div>
                        <div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:"monospace",marginBottom:b>0?4:0}}>{v}</div>
                        {b>0&&<MBar pct={b} color={col} h={3}/>}
                      </div>
                    ))}
                  </div>
                  {/* Dernière collecte + infos */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,fontSize:10,color:C.textM,background:C.bg3,borderRadius:6,padding:"6px 10px"}}>
                    <span>🕐 {fmtFetch(cs?.last_fetch)}</span>
                    <span style={{color:C.textS}}>
                      {platLangs.length?platLangs.join(" · "):"—"} · {c.rateLimit} req/min
                    </span>
                  </div>
                  {/* Boutons */}
                  <div style={{display:"flex",gap:7}}>
                    <button onClick={()=>simCollect(c.id)} disabled={c.status!=="connected"||collectT===c.id||collectT==="all"} className="btn btn-ghost" style={{flex:1,padding:"7px",fontSize:10.5,color:c.status!=="connected"?C.textS:C.textM}}>
                      {collectT===c.id?<span style={{display:"flex",alignItems:"center",gap:5,justifyContent:"center"}}><Spin size={12}/>{STAGE_LB[pipe.stage]}</span>:"🔄 Collecter"}
                    </button>
                    <button onClick={()=>{setCfgPlat(c);setCfgDraft({rateLimit:c.rateLimit,endpoint:c.endpoint,active:c.status!=="offline",apiKey:c.apiKey||"",showKey:false});}} className="btn btn-ghost" style={{padding:"7px 12px",fontSize:10.5}}>⚙️</button>
                  </div>
                </div>
              );})}
            </div>
          </div>
        );})()}

        {/* ══ MOTS-CLÉS ══ */}
        {tab==="mots_cles"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔑 Mots-clés & Hashtags surveillés</div>
                <div style={{display:"flex",gap:8,marginBottom:16}}>
                  <input className="inp" value={newKW} onChange={e=>setNewKW(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKW()} placeholder="Ajouter un mot-clé ou #hashtag…"/>
                  <button onClick={addKW} className="btn btn-gold" style={{padding:"8px 16px",fontSize:11,whiteSpace:"nowrap"}}>+ AJOUTER</button>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {ftKW.map((kw,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:5,background:C.bg3,border:`1px solid ${kw.startsWith("#")?C.blue+"55":C.gold+"44"}`,borderRadius:8,padding:"5px 10px",animation:`fadeUp ${.03*i}s ease`}}>
                      <span style={{fontSize:12,fontWeight:600,color:kw.startsWith("#")?C.blue:C.goldL}}>{kw}</span>
                      <button onClick={()=>removeKW(kw)} style={{background:"none",border:"none",color:C.red,fontSize:14,cursor:"pointer",padding:0,lineHeight:1,opacity:.6}}>&times;</button>
                    </div>
                  ))}
                </div>
                {ftKW.length===0&&<div style={{padding:20,textAlign:"center",color:C.textM,fontSize:12}}>Aucun mot-clé. Ajoutez-en ci-dessus.</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,marginBottom:12,fontSize:13}}>📊 Performance des mots-clés</div>
                {kws.slice(0,8).map((kw,i)=>{
                  const stat=kwStats.find(k=>k.term===kw||k.keyword===kw);
                  const vol=stat?.vol??stat?.count??0;
                  const delta=stat?.delta??0;
                  const maxVol=Math.max(...kwStats.map(k=>k.vol??k.count??1),1);
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
                      <span style={{fontSize:11.5,fontWeight:600,color:kw.startsWith("#")?C.blue:C.goldL,minWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kw}</span>
                      <MBar pct={maxVol>0?Math.round(vol/maxVol*100):0} color={kw.startsWith("#")?C.blue:C.gold} h={3}/>
                      <span style={{fontSize:11,fontWeight:700,minWidth:40,textAlign:"right",fontFamily:"monospace"}}>{fmtN(vol)}</span>
                      <span style={{fontSize:10,minWidth:38,textAlign:"right",color:delta>0?C.green:delta<0?C.red:C.textM,fontWeight:700}}>{delta>0?"+":""}{delta}%</span>
                    </div>
                  );
                })}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:700,marginBottom:12,fontSize:13}}>⚡ Alertes par mot-clé</div>
                {kws.slice(0,5).map((kw,i)=>{
                  const stat=kwStats.find(k=>k.term===kw||k.keyword===kw);
                  const vol=stat?.vol??stat?.count??0;
                  const avg=kwStats.reduce((s,k)=>s+(k.vol??k.count??0),0)/Math.max(kwStats.length,1);
                  const isAlert=vol>avg*1.8&&vol>10;
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",background:isAlert?"#1A0808":C.bg3,borderRadius:8,marginBottom:6,border:`1px solid ${isAlert?C.red+"33":C.border}`}}>
                      <span>{isAlert?"🚨":"🟢"}</span>
                      <span style={{flex:1,fontSize:11.5,color:isAlert?C.red:C.textM}}>{kw}</span>
                      <span style={{fontSize:9.5,fontWeight:700,color:isAlert?C.red:C.green}}>{isAlert?"PIC DÉTECTÉ":"Normal"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ ALERTES ══ */}
        {tab==="alertes"&&(()=>{
          const FILTERS = ["Toutes","Critiques","Avertissements","Info"];
          const filtered = alerts.filter(a=>{
            if(alertFilter==="Critiques")      return a.level==="critique";
            if(alertFilter==="Avertissements") return a.level==="warning";
            if(alertFilter==="Info")           return a.level==="info";
            return true;
          });
          const critCount = alerts.filter(a=>!a.read&&a.level==="critique").length;
          const warnCount = alerts.filter(a=>!a.read&&a.level==="warning").length;
          return (
            <div>
              {/* HEADER */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontWeight:700,fontSize:15}}>⚡ Centre des Alertes</div>
                  {unread>0&&(
                    <span style={{background:C.red,color:"#fff",fontSize:9.5,fontWeight:900,padding:"2px 9px",borderRadius:10}}>
                      {unread} non lues
                    </span>
                  )}
                </div>
                <button
                  onClick={()=>setAlerts(prev=>prev.map(a=>({...a,read:true})))}
                  className="btn btn-ghost"
                  style={{padding:"6px 14px",fontSize:11,fontWeight:600}}
                >
                  ✓ Tout marquer lu
                </button>
              </div>

              {/* KPI MINI ROW */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
                {[
                  {l:"Total alertes",  v:alerts.length,                                    c:C.textM},
                  {l:"Critiques",      v:alerts.filter(a=>a.level==="critique").length,    c:C.red  },
                  {l:"Avertissements", v:alerts.filter(a=>a.level==="warning").length,     c:C.orange},
                  {l:"Non lues",       v:unread,                                           c:C.gold },
                ].map(({l,v,c},i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px 14px",borderLeft:`3px solid ${c}`}}>
                    <div style={{fontSize:9,color:C.textM,marginBottom:4,textTransform:"uppercase",letterSpacing:.7}}>{l}</div>
                    <div style={{fontSize:22,fontWeight:900,color:c,fontFamily:"monospace"}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* FILTER TABS */}
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                {FILTERS.map((f,i)=>{
                  const isOn = alertFilter===f;
                  const cnt = f==="Critiques"?critCount:f==="Avertissements"?warnCount:0;
                  return (
                    <button key={f} onClick={()=>setAF(f)} style={{
                      background:isOn?C.gold:"transparent",
                      color:isOn?"#000":C.textM,
                      border:`1px solid ${isOn?C.gold:C.border}`,
                      padding:"6px 16px",borderRadius:7,cursor:"pointer",
                      fontSize:11,fontWeight:700,letterSpacing:.3,
                      display:"flex",alignItems:"center",gap:6,
                      fontFamily:"'Courier New',monospace",
                      transition:"all .15s",
                    }}>
                      {f}
                      {cnt>0&&<span style={{background:isOn?"#00000033":C.red,color:"#fff",fontSize:8.5,fontWeight:900,padding:"1px 5px",borderRadius:8}}>{cnt}</span>}
                    </button>
                  );
                })}
              </div>

              {/* ALERT CARDS */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filtered.length===0&&(
                  <div style={{padding:32,textAlign:"center",color:C.textM,background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
                    <div style={{fontSize:32,marginBottom:10,opacity:.4}}>✅</div>
                    <div style={{fontWeight:700,marginBottom:4}}>Aucune alerte dans cette catégorie</div>
                    <div style={{fontSize:11.5,color:C.textS}}>Le système surveille en temps réel</div>
                  </div>
                )}
                {filtered.map(a=>{
                  const lc   = a.level==="critique"?C.red:a.level==="warning"?C.orange:C.blue;
                  const icon = a.level==="critique"?"🚨":a.level==="warning"?"⚠️":"ℹ️";
                  return (
                    <div
                      key={a.id}
                      className="hov"
                      onClick={()=>markAlertRead(a.id)}
                      style={{
                        display:"flex",gap:14,padding:"14px 18px",borderRadius:10,
                        background:a.read?C.card:`${lc}08`,
                        border:`1px solid ${a.read?C.border:lc+"44"}`,
                        borderLeft:`4px solid ${a.read?C.textS:lc}`,
                        cursor:"pointer",opacity:a.read?.75:1,
                        transition:"all .2s",animation:"fadeUp .2s ease",
                      }}
                    >
                      <span style={{fontSize:22,marginTop:2,flexShrink:0}}>{icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:13,color:a.read?C.textM:C.text}}>{a.title}</span>
                          {!a.read&&(
                            <span style={{background:lc,color:"#fff",fontSize:9,padding:"1px 7px",borderRadius:8,fontWeight:700,flexShrink:0}}>
                              NON LU
                            </span>
                          )}
                        </div>
                        <div style={{fontSize:11.5,color:C.textM,lineHeight:1.55}}>{a.desc}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                        <span style={{fontSize:10,color:C.textS,whiteSpace:"nowrap"}}>{formatTime(a.time)}</span>
                        <span style={{
                          fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:6,
                          background:`${lc}22`,color:lc,whiteSpace:"nowrap",
                          border:`1px solid ${lc}33`,
                        }}>
                          {a.level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RULES SUMMARY (background state visible as mini section) */}
              <div style={{marginTop:20,padding:"12px 16px",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontSize:10.5,color:C.textM}}>
                  ⚙️ <span style={{fontWeight:700,color:C.text}}>{alertRules.filter(r=>r.active).length}</span> règles actives ·{" "}
                  <span style={{fontWeight:700,color:C.red}}>{alertRules.filter(r=>r.triggered&&r.active).length} déclenchées</span>
                </div>
                <div style={{display:"flex",gap:8,fontSize:9.5,color:C.textS}}>
                  <span>📧 {contacts.filter(c=>c.active).length} contacts actifs</span>
                  <span>·</span>
                  <span>📱 24 SMS envoyés</span>
                  <span>·</span>
                  <span>📧 47 emails envoyés</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ NLP IA ══ */}
        {tab==="nlp"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:900,fontSize:14,color:C.purple,marginBottom:4}}>🧠 Analyse NLP · Claude IA</div>
                <div style={{fontSize:11,color:C.textM,marginBottom:16}}>Analyse sémantique FR / WOL · Claude Sonnet</div>
                <div style={{marginBottom:11}}>
                  <div style={{fontSize:9.5,color:C.textS,marginBottom:5,letterSpacing:.5}}>LANGUE</div>
                  <div style={{display:"flex",gap:7}}>
                    {["AUTO","FR","WOL"].map(l=><button key={l} onClick={()=>setNlpLang(l)} className="btn" style={{padding:"5px 12px",fontSize:10.5,background:nlpLang===l?C.purple:C.bg3,color:nlpLang===l?"#fff":C.textM,border:`1px solid ${nlpLang===l?C.purple:C.border}`}}>{l==="AUTO"?"🔍 Auto":l==="FR"?"🇫🇷 FR":"🟢 WOL"}</button>)}
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9.5,color:C.textS,marginBottom:5,letterSpacing:.5}}>TEXTE À ANALYSER</div>
                  <textarea className="inp" rows={5} value={nlpText} onChange={e=>setNlpTxt(e.target.value)} placeholder="Collez ici un texte de réseau social, article, commentaire…"/>
                </div>
                <div style={{marginBottom:13}}>
                  <div style={{fontSize:9.5,color:C.textS,marginBottom:7,letterSpacing:.5}}>EXEMPLES RAPIDES</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {TEXTS_SAMPLE.map((s,i)=>(
                      <button key={i} onClick={()=>{setNlpTxt(s.text);setNlpLang(s.lang);}} className="btn btn-ghost" style={{textAlign:"left",padding:"7px 10px",lineHeight:1.4,height:"auto",whiteSpace:"normal"}}>
                        <div style={{fontSize:8.5,color:s.lang==="WOL"?C.purple:C.blue,fontWeight:700,marginBottom:2}}>{s.label}</div>
                        <div style={{fontSize:9.5,color:C.textM}}>{s.text.slice(0,44)}…</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={runNLP} disabled={!nlpText.trim()||nlpLoad} className="btn btn-gold" style={{width:"100%",padding:"11px",fontSize:12.5,background:nlpText.trim()&&!nlpLoad?`linear-gradient(135deg,${C.purple},${C.purpleD})`:"#1A1A2A",color:nlpText.trim()&&!nlpLoad?"#fff":C.textS,border:`1px solid ${nlpText.trim()&&!nlpLoad?C.purple:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
                  {nlpLoad?<><Spin size={15} color="#fff"/>Analyse Claude en cours…</>:<>🧠 ANALYSER AVEC CLAUDE</>}
                </button>
                {nlpErr&&<div style={{marginTop:8,padding:"8px 12px",background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,fontSize:11,color:C.red}}>{nlpErr}</div>}
              </div>
              {nlpHist.length>0&&(
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                  <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>📋 Historique ({nlpHist.length})</div>
                  {nlpHist.map((h,i)=>(
                    <div key={i} onClick={()=>setNlpRes(h.result)} className="hov" style={{padding:"7px 10px",borderRadius:7,cursor:"pointer",background:i===0?C.bg3:"transparent",marginBottom:4,border:`1px solid ${i===0?C.border:"transparent"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><SBadge s={h.result.sentiment} size={9} C={C}/><span style={{fontSize:9,color:C.textS}}>{h.time.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span></div>
                      <div style={{fontSize:10.5,color:C.textM}}>{h.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              {!nlpRes&&!nlpLoad&&(<div style={{background:C.card,border:`2px dashed ${C.border}`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400}}><div style={{fontSize:48,opacity:.3,marginBottom:14}}>🧠</div><div style={{fontWeight:700,color:C.textM,marginBottom:6}}>Résultats de l'analyse</div><div style={{fontSize:11.5,color:C.textS,textAlign:"center",maxWidth:220}}>Saisissez un texte et lancez l'analyse.</div></div>)}
              {nlpLoad&&(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400}}><Spin size={42} color={C.purple}/><div style={{marginTop:18,fontWeight:700,color:C.purple}}>Claude analyse…</div><div style={{fontSize:10.5,color:C.textM,marginTop:6}}>Langue · Sentiment · Entités · Signaux</div></div>)}
              {nlpRes&&!nlpLoad&&(
                <div style={{display:"flex",flexDirection:"column",gap:10,animation:"fadeUp .3s ease"}}>
                  <div style={{background:C.card,border:`1px solid ${C.purple}44`,borderRadius:12,padding:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div><div style={{marginBottom:6}}><SBadge s={nlpRes.sentiment} size={12} C={C}/></div><div style={{fontSize:11,color:C.textM}}>Score : <span style={{fontWeight:700,color:nlpRes.score_sentiment>0?C.green:nlpRes.score_sentiment<0?C.red:C.textM,fontFamily:"monospace"}}>{nlpRes.score_sentiment?.toFixed(2)}</span> · Intensité : <span style={{fontWeight:700,color:C.orange}}>{nlpRes.intensite}</span></div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:9.5,color:C.textS,marginBottom:2}}>Confiance</div><div style={{fontSize:26,fontWeight:900,color:C.purple,fontFamily:"monospace"}}>{nlpRes.confiance}%</div><span style={{fontSize:9,background:nlpRes.langue_detectee==="WOL"?C.purpleD:C.blueD,color:nlpRes.langue_detectee==="WOL"?C.purple:C.blue,padding:"2px 8px",borderRadius:8,fontWeight:700}}>{nlpRes.langue_detectee}</span></div>
                    </div>
                    <MBar pct={nlpRes.confiance||80} color={C.purple} h={5}/>
                  </div>
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:7}}>SYNTHÈSE</div><div style={{fontSize:12,color:C.text,lineHeight:1.7,fontStyle:"italic",borderLeft:`3px solid ${C.purple}`,paddingLeft:10}}>{nlpRes.resume_analytique}</div></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {nlpRes.emotions?.length>0&&(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:9}}>ÉMOTIONS</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{nlpRes.emotions.map((e,i)=><span key={i} style={{background:C.bg3,border:`1px solid ${C.purple}44`,borderRadius:14,padding:"3px 10px",fontSize:10.5,color:C.purple,fontWeight:600}}>{e}</span>)}</div></div>)}
                    {nlpRes.themes?.length>0&&(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:9}}>THÈMES</div>{nlpRes.themes.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,fontSize:11,color:C.textM}}><div style={{width:5,height:5,borderRadius:"50%",background:C.teal,flexShrink:0}}/>{t}</div>)}</div>)}
                  </div>
                  {nlpRes.entites?.length>0&&(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:9}}>ENTITÉS</div><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{nlpRes.entites.map((e,i)=><div key={i} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px"}}><div style={{fontWeight:700,fontSize:11.5,color:C.goldL}}>{e.nom}</div><div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:3}}><span style={{fontSize:9,color:C.textS}}>{e.type}</span><SBadge s={e.sentiment} size={8} C={C}/></div></div>)}</div></div>)}
                  <div style={{background:nlpRes.desinformation_score>60?C.redD:C.card,border:`1px solid ${nlpRes.desinformation_score>60?C.red+"44":C.border}`,borderRadius:12,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5}}>SCORE DÉSINFORMATION</div><span style={{fontWeight:900,fontSize:18,fontFamily:"monospace",color:nlpRes.desinformation_score>60?C.red:nlpRes.desinformation_score>30?C.orange:C.green}}>{nlpRes.desinformation_score}/100</span></div><MBar pct={nlpRes.desinformation_score} color={nlpRes.desinformation_score>60?C.red:nlpRes.desinformation_score>30?C.orange:C.green} h={7}/>{nlpRes.desinformation_score>60&&<div style={{fontSize:11,color:C.red,marginTop:7,fontWeight:700}}>⚠ Risque élevé — Action recommandée</div>}</div>
                  {nlpRes.signaux_faibles?.length>0&&(<div style={{background:C.orangeD,border:`1px solid ${C.orange}44`,borderRadius:12,padding:14}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:8}}>⚡ SIGNAUX FAIBLES</div>{nlpRes.signaux_faibles.map((s,i)=><div key={i} style={{display:"flex",gap:7,marginBottom:5}}><span style={{color:C.orange}}>→</span><span style={{fontSize:11.5}}>{s}</span></div>)}</div>)}
                  <div style={{background:C.blueD,border:`1px solid ${C.blue}44`,borderRadius:12,padding:14}}><div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:7}}>💡 RECOMMANDATION</div><div style={{fontSize:12,color:C.text,lineHeight:1.7}}>{nlpRes.recommandation_action}</div></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ THÈMES ══ */}
        {tab==="themes"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:15}}>🔍 Analyse thématique</div>
              {search&&<span style={{fontSize:11,color:C.gold}}>{ftTop.length} résultats pour « {search} »</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
              {[{icon:"💰",name:"Économie",vol:6840,sent:"neutre"},{icon:"📚",name:"Éducation",vol:4120,sent:"positif"},{icon:"🛡",name:"Sécurité",vol:3210,sent:"neutre"},{icon:"🏥",name:"Santé",vol:2890,sent:"positif"},{icon:"🚗",name:"Transport",vol:2876,sent:"negatif"},{icon:"⚡",name:"Énergie",vol:3420,sent:"neutre"},{icon:"💻",name:"Numérique",vol:1980,sent:"positif"},{icon:"🌾",name:"Agriculture",vol:1240,sent:"positif"},{icon:"🏛",name:"Politique",vol:5100,sent:"neutre"}].map((t,i)=>(
                <div key={i} className="hov" style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,cursor:"pointer",borderTop:`3px solid ${t.sent==="positif"?C.green:t.sent==="negatif"?C.red:C.textS}`}}>
                  <div style={{fontSize:28,marginBottom:8}}>{t.icon}</div>
                  <div style={{fontWeight:700,marginBottom:4}}>{t.name}</div>
                  <div style={{fontSize:20,fontWeight:900,fontFamily:"monospace",marginBottom:6}}>{fmtN(t.vol)}</div>
                  <div style={{marginBottom:7}}><MBar pct={t.vol/70} color={t.sent==="positif"?C.green:t.sent==="negatif"?C.red:C.textM} h={5}/></div>
                  <SBadge s={t.sent} C={C}/>
                </div>
              ))}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
              <div style={{fontWeight:700,marginBottom:12,fontSize:13}}>🔥 Sujets tendance détaillés</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {ftTop.map((t,i)=>(
                  <div key={i} className="hov" style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:C.bg3,borderRadius:9,cursor:"pointer",border:`1px solid ${C.border}`}}>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{t.topic}</div><div style={{fontSize:9.5,color:C.textM}}>{fmtN(t.vol)} mentions</div></div>
                    <SBadge s={t.sentiment} C={C}/>
                    <span style={{fontSize:11,fontWeight:700,color:t.delta>0?C.green:C.red,minWidth:40,textAlign:"right"}}>{t.delta>0?"↑":"↓"}{Math.abs(t.delta)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ RÉGIONS — CARTE LEAFLET ══ */}
        {tab==="regions"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:700,fontSize:15}}>🗺 Cartographie interactive du Sénégal</div><div style={{fontSize:11,color:C.textM,marginTop:2}}>Heatmap des conversations · 14 régions · Leaflet.js</div></div>
              <div style={{display:"flex",gap:8}}>
                <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",fontSize:10.5,color:C.textM}}>
                  📊 {fmtN(regions.reduce((s,r)=>s+r.vol,0))} mentions totales
                </div>
                {search&&<span style={{background:C.goldD,border:`1px solid ${C.gold}`,borderRadius:8,padding:"6px 12px",fontSize:10.5,color:C.gold}}>Filtre : « {search} »</span>}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:14}}>
              {/* MAP */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",height:560,position:"relative"}}>
                <SenegalMap regions={ftReg} selectedRegion={selRegion} onSelectRegion={setSelReg} C={C}/>
              </div>

              {/* SIDEBAR */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* SELECTED REGION PANEL */}
                {selRegion?(
                  <div style={{background:C.card,border:`1px solid ${C.gold}44`,borderRadius:12,padding:16,animation:"fadeUp .3s ease"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <div style={{fontWeight:900,fontSize:14,color:C.gold}}>📍 {selRegion.name}</div>
                      <button onClick={()=>setSelReg(null)} style={{background:"none",border:"none",color:C.textM,cursor:"pointer",fontSize:18,padding:0}}>&times;</button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                      {[{l:"Mentions",v:fmtN(selRegion.vol),c:C.text},{l:"Part nationale",v:`${selRegion.pct}%`,c:C.gold},{l:"Positif",v:`${selRegion.pos}%`,c:C.green},{l:"Négatif",v:`${selRegion.neg}%`,c:C.red}].map(({l,v,c},i)=>(
                        <div key={i} style={{background:C.bg3,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:9,color:C.textS,marginBottom:3}}>{l}</div>
                          <div style={{fontSize:16,fontWeight:900,color:c,fontFamily:"monospace"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{background:C.bg3,borderRadius:8,padding:"8px 10px",marginBottom:8}}>
                      <div style={{fontSize:9,color:C.textS,marginBottom:3}}>MENTIONS WOLOF</div>
                      <div style={{fontSize:14,fontWeight:700,color:C.purple,fontFamily:"monospace"}}>{selRegion.wol}%</div>
                      <MBar pct={selRegion.wol} color={C.purple} h={4}/>
                    </div>
                    <div style={{background:C.bg3,borderRadius:8,padding:"8px 10px",marginBottom:8}}>
                      <div style={{fontSize:9,color:C.textS,marginBottom:3}}>SUJETS DOMINANTS</div>
                      <div style={{fontSize:11.5,color:C.text}}>{selRegion.top}</div>
                    </div>
                    <div style={{display:"flex",gap:6,marginBottom:8}}>
                      <div style={{flex:1}}><MBar pct={selRegion.pos} color={C.green} h={6}/></div>
                      <div style={{flex:1}}><MBar pct={selRegion.neg} color={C.red} h={6}/></div>
                    </div>
                    {selRegion.hot&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 10px",fontSize:11,color:C.red,fontWeight:700}}>⚡ ZONE SENSIBLE — Surveillance renforcée</div>}
                  </div>
                ):(
                  <div style={{background:C.card,border:`2px dashed ${C.border}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:120}}>
                    <div style={{fontSize:24,opacity:.4,marginBottom:8}}>📍</div>
                    <div style={{fontSize:11,color:C.textS,textAlign:"center"}}>Cliquez sur une région pour voir les détails</div>
                  </div>
                )}

                {/* RANKING */}
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,flex:1,overflow:"hidden"}}>
                  <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>📊 Classement des régions</div>
                  <div style={{maxHeight:360,overflowY:"auto"}}>
                    {[...ftReg].sort((a,b)=>b.vol-a.vol).map((r,i)=>{
                      const maxV=ftReg[0]?.vol||1;
                      const sent=r.pos>55?"positif":r.neg>28?"negatif":"neutre";
                      return(
                        <div key={i} className="hov" onClick={()=>setSelReg(r)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 8px",borderRadius:8,marginBottom:4,cursor:"pointer",background:selRegion?.name===r.name?C.bg3:"transparent",border:`1px solid ${selRegion?.name===r.name?C.gold+"44":"transparent"}`}}>
                          <span style={{fontSize:10,fontWeight:900,color:i<3?C.gold:C.textS,width:18,textAlign:"center",flexShrink:0}}>{i+1}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                              <span style={{fontSize:11,fontWeight:600,color:r.hot?C.orange:C.text}}>{r.name}{r.hot?" ⚡":""}</span>
                              <span style={{fontSize:10.5,fontWeight:700,color:C.textM,fontFamily:"monospace"}}>{r.pct}%</span>
                            </div>
                            <MBar pct={(r.vol/maxV)*100} color={sent==="positif"?C.green:sent==="negatif"?C.red:C.blue} h={4}/>
                          </div>
                          <span style={{fontSize:10,color:C.textS,fontFamily:"monospace",minWidth:40,textAlign:"right"}}>{fmtN(r.vol)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* REGION STATS GRID */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {(()=>{
                const sorted=[...regions].sort((a,b)=>b.vol-a.vol);
                const topR=sorted[0];
                const hotZones=regions.filter(r=>r.hot);
                const topWol=[...regions].sort((a,b)=>(b.wol||0)-(a.wol||0))[0];
                return [
                  {l:"Région la plus active",v:topR?`${topR.name} · ${topR.pct}%`:"—",c:C.gold},
                  {l:"Volume le plus élevé",v:topR?`${topR.name} · ${fmtN(topR.vol)} mentions`:"—",c:C.green},
                  {l:"Zones sensibles",v:hotZones.length?`${hotZones.length} (${hotZones.map(r=>r.name).join(", ")})`:"Aucune",c:C.red},
                  {l:"Wolof le plus actif",v:topWol?`${topWol.name} · ${topWol.wol||0}%`:"—",c:C.purple},
                ].map(({l,v,c},i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:12,borderLeft:`3px solid ${c}`}}>
                    <div style={{fontSize:9,color:C.textM,marginBottom:5}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ));
              })()}
            </div>

            {/* SENTIMENT BY REGION */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
              <div style={{fontWeight:700,marginBottom:14,fontSize:13}}>🎯 Sentiment par région</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {regions.map((r,i)=>(
                  <div key={i} className="hov" onClick={()=>setSelReg(r)} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:C.bg3,borderRadius:9,cursor:"pointer",border:`1px solid ${selRegion?.name===r.name?C.gold+"55":C.border}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:11.5,fontWeight:600,color:r.hot?C.orange:C.text}}>{r.name}{r.hot?" ⚡":""}</span>
                        <span style={{fontSize:10,color:C.textM}}>{fmtN(r.vol)}</span>
                      </div>
                      <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",gap:.5}}>
                        <div style={{width:`${r.pos}%`,background:C.green,borderRadius:3}}/>
                        <div style={{width:`${100-r.pos-r.neg}%`,background:C.textS,borderRadius:3}}/>
                        <div style={{width:`${r.neg}%`,background:C.red,borderRadius:3}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:C.textS}}>
                        <span style={{color:C.green}}>{r.pos}% pos</span>
                        <span style={{color:C.purple}}>WOL {r.wol}%</span>
                        <span style={{color:C.red}}>{r.neg}% nég</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ MINISTÈRES ══ */}
        {tab==="ministeres"&&(()=>{
          const LEVEL_COLOR={presidence:"#1D4ED8",primature:"#7C3AED",pole:"#0891B2",ministry:"#059669"};
          const sData = minDashboard?.latest_daily;
          const pos = sData?.positive_count||0;
          const neg = sData?.negative_count||0;
          const neu = sData?.neutral_count||0;
          const tot = sData?.total_mentions||0;
          const avgScore = sData?.avg_sentiment_score||0;
          const trending = sData?.trending_score||0;
          const platBreak = sData?.platform_breakdown ? (typeof sData.platform_breakdown==="string"?JSON.parse(sData.platform_breakdown):sData.platform_breakdown) : {};
          const topTopics = sData?.top_topics ? (typeof sData.top_topics==="string"?JSON.parse(sData.top_topics):sData.top_topics) : [];
          const topTerms  = sData?.top_terms  ? (typeof sData.top_terms==="string"?JSON.parse(sData.top_terms):sData.top_terms)   : [];
          const posP = tot>0?Math.round(pos/tot*100):0;
          const negP = tot>0?Math.round(neg/tot*100):0;
          const neuP = tot>0?Math.round(neu/tot*100):0;
          const sentColor = avgScore>0.1?C.green:avgScore<-0.1?C.red:C.textM;

          return (
          <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:14}}>
            {/* Colonne gauche — liste des ministères */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
                <div style={{fontWeight:900,fontSize:12,color:C.textS,letterSpacing:.5,marginBottom:10}}>HIÉRARCHIE</div>
                {["presidence","primature","pole","ministry"].map(lvl=>(
                  <div key={lvl}>
                    {ministries.filter(m=>m.level===lvl).map(m=>(
                      <div key={m.id} onClick={()=>setSelMin(m)} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,marginBottom:4,cursor:"pointer",background:selMinistry?.id===m.id?`${LEVEL_COLOR[lvl]||C.blue}22`:C.bg2,border:`1px solid ${selMinistry?.id===m.id?(LEVEL_COLOR[lvl]||C.blue)+"44":C.border}`,paddingLeft:lvl==="presidence"?10:lvl==="primature"?18:lvl==="pole"?26:34}}>
                        <span style={{fontSize:14}}>{m.icon||"🏛️"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:selMinistry?.id===m.id?700:400,color:selMinistry?.id===m.id?(LEVEL_COLOR[lvl]||C.blue):C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.short_name}</div>
                          <div style={{fontSize:9,color:C.textS,textTransform:"uppercase",letterSpacing:.3}}>{lvl}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne droite — dashboard du ministère sélectionné */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {!selMinistry&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:32,textAlign:"center",color:C.textM,fontSize:13}}>Sélectionnez un ministère</div>}
              {selMinistry&&(
                <>
                  {/* En-tête ministère */}
                  <div style={{background:C.card,border:`1px solid ${LEVEL_COLOR[selMinistry.level]||C.blue}44`,borderRadius:12,padding:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:selMinistry.description?10:0}}>
                      <div style={{width:46,height:46,borderRadius:12,background:`${LEVEL_COLOR[selMinistry.level]||C.blue}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{selMinistry.icon||"🏛️"}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:900,fontSize:14}}>{selMinistry.name}</div>
                        {selMinistry.minister_name&&<div style={{fontSize:11,color:C.textM,marginTop:2}}>Ministre : {selMinistry.minister_name}</div>}
                      </div>
                      <button onClick={triggerMinAggregate} disabled={minAggLoading} className="btn" style={{padding:"6px 14px",fontSize:10.5,background:`${LEVEL_COLOR[selMinistry.level]||C.blue}22`,border:`1px solid ${LEVEL_COLOR[selMinistry.level]||C.blue}44`,color:LEVEL_COLOR[selMinistry.level]||C.blue}}>
                        {minAggLoading?"…":"⟳ Agréger"}
                      </button>
                    </div>
                    {selMinistry.description&&<div style={{fontSize:10.5,color:C.textM}}>{selMinistry.description}</div>}
                  </div>

                  {minLoading&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center",color:C.textM}}><Spin size={22} color={C.gold}/></div>}

                  {!minLoading&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

                      {/* KPIs sentiment */}
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🎯 Sentiment population</div>
                        {tot===0?(
                          <div style={{textAlign:"center",padding:"18px 0",color:C.textM,fontSize:12}}>Aucune donnée — déclencher une agrégation</div>
                        ):(
                          <>
                            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:12}}>
                              <span style={{fontSize:28,fontWeight:900,color:sentColor,fontFamily:"monospace"}}>{avgScore>=0?"+":""}{(avgScore*100).toFixed(0)}</span>
                              <span style={{fontSize:11,color:C.textM}}>score moyen</span>
                              <span style={{fontSize:11,fontWeight:700,color:trending>0?C.green:trending<0?C.red:C.textM,marginLeft:"auto"}}>{trending>0?"↑":trending<0?"↓":"→"} {Math.abs(trending*100).toFixed(0)}% vs période préc.</span>
                            </div>
                            <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10.5,color:C.textM}}>Positif</span><span style={{fontSize:11,fontWeight:700,color:C.green,fontFamily:"monospace"}}>{pos} ({posP}%)</span></div><MBar pct={posP} color={C.green} h={5}/></div>
                            <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10.5,color:C.textM}}>Neutre</span><span style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:"monospace"}}>{neu} ({neuP}%)</span></div><MBar pct={neuP} color={C.textM} h={5}/></div>
                            <div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10.5,color:C.textM}}>Négatif</span><span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"monospace"}}>{neg} ({negP}%)</span></div><MBar pct={negP} color={C.red} h={5}/></div>
                            <div style={{padding:"8px 12px",background:negP>50?C.redD:posP>40?C.greenD:C.bg3,border:`1px solid ${negP>50?C.red:posP>40?C.green:C.border}44`,borderRadius:8,textAlign:"center",fontSize:11,fontWeight:700,color:negP>50?C.red:posP>40?C.green:C.textM}}>
                              {negP>50?"🔴 Climat : TENDU":posP>40?"🟢 Climat : FAVORABLE":"🟡 Climat : MITIGÉ"}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Volume & répartition plateformes */}
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📊 Volume & sources</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                          {[{l:"Mentions 7j",v:fmtN(minDashboard?.last_7_days?.total_mentions||0),c:C.blue},{l:"Période",v:"DAILY",c:C.textM},{l:"Score moyen",v:avgScore>=0?`+${(avgScore*100).toFixed(0)}`:String((avgScore*100).toFixed(0)),c:sentColor},{l:"Tendance",v:trending>0?`+${(trending*100).toFixed(0)}%`:`${(trending*100).toFixed(0)}%`,c:trending>0?C.green:trending<0?C.red:C.textM}].map(({l,v,c})=>(
                            <div key={l} style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
                              <div style={{fontSize:9.5,color:C.textS,marginBottom:3}}>{l}</div>
                              <div style={{fontSize:16,fontWeight:900,color:c,fontFamily:"monospace"}}>{v||"—"}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:10.5,color:C.textS,letterSpacing:.3,marginBottom:7}}>PAR PLATEFORME</div>
                        {Object.keys(platBreak).length===0?(
                          <div style={{fontSize:11,color:C.textM}}>—</div>
                        ):(
                          Object.entries(platBreak).map(([pl,data])=>(
                            <div key={pl} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                              <span style={{fontSize:10,color:C.textM,width:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl}</span>
                              <div style={{flex:1,height:6,borderRadius:3,background:C.bg2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${tot>0?Math.round(data.count/tot*100):0}%`,background:C.blue,borderRadius:3}}/>
                              </div>
                              <span style={{fontSize:9.5,fontFamily:"monospace",color:C.textM,width:30,textAlign:"right"}}>{data.count}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Top termes */}
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>🔑 Termes les plus détectés</div>
                        {topTerms.length===0?<div style={{fontSize:11,color:C.textM,padding:"12px 0"}}>Aucune donnée</div>:topTerms.slice(0,8).map((t,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:i%2===0?C.bg2:"transparent",borderRadius:6,marginBottom:2}}>
                            <span style={{fontSize:9,color:C.textS,width:14,textAlign:"right",fontWeight:700}}>{i+1}</span>
                            <span style={{flex:1,fontSize:11.5,color:C.gold}}>{t.term}</span>
                            <span style={{fontSize:10,color:C.textM,fontFamily:"monospace"}}>{t.count}</span>
                          </div>
                        ))}
                      </div>

                      {/* Top sujets */}
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>🔥 Sujets tendance</div>
                        {topTopics.length===0?<div style={{fontSize:11,color:C.textM,padding:"12px 0"}}>Aucune donnée</div>:topTopics.slice(0,8).map((t,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:i%2===0?C.bg2:"transparent",borderRadius:6,marginBottom:2}}>
                            <span style={{fontSize:9,color:C.textS,width:14,textAlign:"right",fontWeight:700}}>{i+1}</span>
                            <span style={{flex:1,fontSize:11.5}}>{t.topic}</span>
                            <span style={{fontSize:10,color:C.textM,fontFamily:"monospace"}}>{t.count}</span>
                          </div>
                        ))}
                      </div>

                      {/* Articles récents liés */}
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,gridColumn:"1/-1"}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>📰 Articles récents liés (30 jours)</div>
                        {minArticles.length===0?<div style={{fontSize:11,color:C.textM,padding:"10px 0"}}>Aucun article lié</div>:(
                          <div style={{display:"flex",flexDirection:"column",gap:6}}>
                            {minArticles.slice(0,10).map((a,i)=>(
                              <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",background:C.bg2,borderRadius:8,textDecoration:"none",border:`1px solid ${C.border}`}} className="hov">
                                <span style={{fontSize:9,color:C.textS,width:16,textAlign:"right",paddingTop:2,fontWeight:700}}>{i+1}</span>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:11.5,color:C.text,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title||"(sans titre)"}</div>
                                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                    <span style={{fontSize:9.5,color:C.textM}}>{a.source_name}</span>
                                    <span style={{fontSize:9.5,color:C.textS}}>·</span>
                                    <span style={{fontSize:9.5,color:C.textS}}>{a.published_at?new Date(a.published_at).toLocaleDateString("fr-FR"):""}</span>
                                    <span style={{fontSize:9.5,color:C.textS}}>·</span>
                                    <span style={{fontSize:9.5,color:a.sentiment==="positif"?C.green:a.sentiment==="negatif"?C.red:C.textM,fontWeight:600}}>{a.sentiment||"neutre"}</span>
                                    {a.match_score&&<span style={{fontSize:9,color:C.blue,fontFamily:"monospace"}}>score:{(a.match_score*100).toFixed(0)}%</span>}
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Gestion des mots-clés */}
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,gridColumn:"1/-1"}}>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>🔑 Mots-clés & hashtags du ministère</div>
                        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                          <input className="inp" value={minNewKw.term} onChange={e=>setMinNewKw(p=>({...p,term:e.target.value}))} placeholder="Nouveau terme..." style={{flex:1,minWidth:140}} onKeyDown={e=>e.key==="Enter"&&addMinKw()}/>
                          <select value={minNewKw.type} onChange={e=>setMinNewKw(p=>({...p,type:e.target.value}))} className="inp" style={{width:120}}>
                            {["keyword","hashtag","institution","program","person"].map(t=><option key={t} value={t}>{t}</option>)}
                          </select>
                          <select value={minNewKw.weight} onChange={e=>setMinNewKw(p=>({...p,weight:Number(e.target.value)}))} className="inp" style={{width:70}}>
                            {[1,2,3,4,5].map(w=><option key={w} value={w}>W{w}</option>)}
                          </select>
                          <button onClick={addMinKw} disabled={minKwLoading} className="btn btn-gold" style={{padding:"8px 16px",fontSize:11}}>＋ Ajouter</button>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {minKws.map(kw=>(
                            <div key={kw.id} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",background:C.bg2,borderRadius:20,border:`1px solid ${kw.type==="hashtag"?C.blue+"55":kw.type==="institution"?C.purple+"55":C.border}`,fontSize:11}}>
                              <span style={{color:kw.type==="hashtag"?C.blue:kw.type==="institution"?C.purple:C.gold}}>{kw.term}</span>
                              <span style={{fontSize:9,color:C.textS}}>W{kw.weight}</span>
                              <button onClick={()=>deleteMinKw(kw.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.textS,fontSize:11,padding:"0 0 0 2px",lineHeight:1}} className="hov">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          );
        })()}

        {/* ══ RAPPORTS PDF ══ */}
        {tab==="rapports"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
                <div style={{fontWeight:900,fontSize:14,marginBottom:4}}>📄 Générateur de rapports officiels</div>
                <div style={{fontSize:11,color:C.textM,marginBottom:16}}>Rapports stratégiques · Présidence / Ministères</div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:5}}>PÉRIODE</div>
                  <input className="inp" value={rPeriod} onChange={e=>setRP(e.target.value)} placeholder="Ex: Semaine du 17-23 Février 2026"/>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:9}}>SECTIONS</div>
                  {[{k:"sentiment",l:"Analyse du sentiment",i:"🎯"},{k:"topics",l:"Sujets tendance",i:"🔥"},{k:"alerts",l:"Alertes détectées",i:"⚡"},{k:"influencers",l:"Influenceurs clés",i:"👥"},{k:"regions",l:"Cartographie régionale",i:"🗺"},{k:"nlp",l:"Résumé NLP / IA",i:"🧠"}].map(({k,l,i})=>(
                    <label key={k} style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",padding:"7px 11px",background:rSec[k]?C.bg3:C.bg2,border:`1px solid ${rSec[k]?C.gold+"44":C.border}`,borderRadius:8,marginBottom:6,transition:"all .15s"}}>
                      <input type="checkbox" checked={rSec[k]} onChange={e=>setRSec(p=>({...p,[k]:e.target.checked}))} style={{accentColor:C.gold,width:13,height:13}}/>
                      <span style={{fontSize:13}}>{i}</span><span style={{fontSize:12,color:rSec[k]?C.text:C.textM}}>{l}</span>
                    </label>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:8}}>TYPE</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>
                    {[{l:"Hebdo",i:"📅",a:true},{l:"Mensuel",i:"📆",a:false},{l:"Crise",i:"🚨",a:false},{l:"Thématique",i:"🔍",a:false}].map(({l,i,a})=>(
                      <button key={l} className="btn btn-ghost" style={{padding:"9px 4px",border:`1px solid ${a?C.gold:C.border}`,background:a?C.goldD+"33":"transparent",color:a?C.gold:C.textM}}>
                        <div style={{fontSize:16,marginBottom:2}}>{i}</div><div style={{fontSize:9.5,fontWeight:a?700:400}}>{l}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={generateReport} disabled={rGen} className="btn btn-gold" style={{width:"100%",padding:"12px",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
                  {rGen?<><Spin size={15} color="#000"/>Génération en cours…</>:<>📄 GÉNÉRER LE RAPPORT</>}
                </button>
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>⏰ Rapports planifiés</div>
                {[{t:"Hebdomadaire",next:"Lun. 24 Fév · 07h00",dest:"Présidence, Primature"},{t:"Mensuel",next:"01 Mars 2026 · 06h00",dest:"Tous les Ministères"},{t:"Alerte crise",next:"En temps réel",dest:"Cellules de crise"}].map(({t,next,dest},i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"9px 12px",background:C.bg3,borderRadius:8,marginBottom:7,border:`1px solid ${C.border}`}}>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12,marginBottom:2}}>{t}</div><div style={{fontSize:10,color:C.textM}}>Prochain : {next}</div><div style={{fontSize:9.5,color:C.textS}}>→ {dest}</div></div>
                    <span style={{fontSize:9,color:C.green,fontWeight:700,background:C.greenD,padding:"2px 8px",borderRadius:6,height:"fit-content",marginTop:2}}>ACTIF</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {!rReady&&!rGen&&(<div style={{background:C.card,border:`2px dashed ${C.border}`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:500}}><div style={{fontSize:56,opacity:.25,marginBottom:14}}>📄</div><div style={{fontWeight:700,color:C.textM,marginBottom:6}}>Aperçu du rapport</div><div style={{fontSize:11.5,color:C.textS,textAlign:"center",maxWidth:220}}>Configurez et cliquez sur "Générer" pour créer votre rapport officiel.</div></div>)}
              {rGen&&(<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:500}}><Spin size={46} color={C.gold}/><div style={{marginTop:18,fontWeight:700,color:C.gold}}>Génération du rapport…</div>{["Collecte des données","Calcul des KPIs","Analyse thématique","Cartographie régionale","Intégration NLP","Compilation finale"].map((s,i)=><div key={i} style={{fontSize:11,color:C.textM,marginTop:6,display:"flex",alignItems:"center",gap:7}}><span style={{color:C.green}}>✓</span>{s}</div>)}</div>)}
              {rReady&&rUrl&&(
                <div style={{display:"flex",flexDirection:"column",gap:11,animation:"fadeUp .3s ease"}}>
                  <div style={{background:C.greenD,border:`1px solid ${C.green}44`,borderRadius:12,padding:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{fontSize:24}}>✅</span><div><div style={{fontWeight:700,color:C.green}}>Rapport généré avec succès</div><div style={{fontSize:11,color:C.textM,marginTop:2}}>{rPeriod}</div></div></div>
                    <div style={{display:"flex",gap:8}}>
                      <a href={rUrl} download={`PNVD_${rPeriod.replace(/\s/g,"_")}.html`} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:`linear-gradient(135deg,${C.gold},${C.goldD})`,color:"#000",padding:"10px",borderRadius:8,textDecoration:"none",fontWeight:900,fontSize:12}}>⬇ TÉLÉCHARGER</a>
                      <a href={rUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 16px",borderRadius:8,textDecoration:"none",fontSize:12,background:C.bg3,border:`1px solid ${C.border}`,color:C.textM}}>👁 Aperçu</a>
                    </div>
                  </div>
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
                    <div style={{fontWeight:700,marginBottom:10,fontSize:13}}>📋 Contenu inclus</div>
                    {Object.entries(rSec).filter(([,v])=>v).map(([k],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,padding:"5px 8px",background:C.bg3,borderRadius:6}}><span style={{color:C.green}}>✓</span><span style={{fontSize:11.5,color:C.textM,textTransform:"capitalize"}}>{k}</span></div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ══ MODAL CONFIGURATION SOURCE ══ */}
        {configPlatform&&(
          <div onClick={()=>setCfgPlat(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeUp .2s ease"}}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1.5px solid ${configPlatform.color}55`,borderRadius:16,padding:24,width:480,maxWidth:"95vw",boxShadow:`0 0 80px ${configPlatform.color}22,0 32px 80px #000A`}}>

              {/* En-tête */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
                <PIcon color={configPlatform.color} icon={configPlatform.icon} size={44}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:15}}>⚙️ {configPlatform.name}</div>
                  <div style={{fontSize:10,color:C.textM,fontFamily:"monospace",marginTop:3}}>{cfgDraft.endpoint}</div>
                </div>
                <button onClick={()=>setCfgPlat(null)} className="btn btn-ghost" style={{padding:"4px 10px",fontSize:14,lineHeight:1}}>✕</button>
              </div>

              {/* Toggle actif */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"10px 14px",background:C.bg3,borderRadius:9,border:`1px solid ${C.border}`}}>
                <div>
                  <div style={{fontWeight:700,fontSize:12}}>Source active</div>
                  <div style={{fontSize:10,color:C.textM,marginTop:2}}>Activer / désactiver la collecte</div>
                </div>
                <div onClick={()=>setCfgDraft(d=>({...d,active:!d.active}))} style={{width:44,height:23,borderRadius:12,background:cfgDraft.active?C.green:C.textS,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,left:cfgDraft.active?22:3,width:17,height:17,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px #0006"}}/>
                </div>
              </div>

              {/* Clé API (uniquement pour les plateformes qui en ont besoin) */}
              {["yt","x","fb","ig","tt"].includes(configPlatform.id)&&(
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:.7}}>Clé API</div>
                    {configPlatform.hasApiKey&&!cfgDraft.apiKey&&(
                      <div style={{fontSize:9,color:C.green,fontWeight:700,background:C.green+"18",padding:"2px 7px",borderRadius:5}}>✓ Clé configurée</div>
                    )}
                  </div>
                  <div style={{position:"relative"}}>
                    <input type={cfgDraft.showKey?"text":"password"} className="inp" placeholder={configPlatform.hasApiKey?"••••••••••••••••••••":(`Clé API ${configPlatform.name}…`)} value={cfgDraft.apiKey||""} onChange={e=>setCfgDraft(d=>({...d,apiKey:e.target.value}))} style={{paddingRight:76}}/>
                    <button type="button" onClick={()=>setCfgDraft(d=>({...d,showKey:!d.showKey}))} className="btn btn-ghost" style={{position:"absolute",right:5,top:5,padding:"3px 9px",fontSize:10,border:"none",background:"transparent"}}>
                      {cfgDraft.showKey?"Masquer":"Afficher"}
                    </button>
                  </div>
                </div>
              )}

              {/* Rate limit */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:C.textM,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:.7}}>Rate limit (req/min)</div>
                <input type="number" className="inp" min={1} max={9999} value={cfgDraft.rateLimit||""} onChange={e=>setCfgDraft(d=>({...d,rateLimit:Number(e.target.value)}))}/>
              </div>

              {/* Endpoint */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,color:C.textM,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:.7}}>Endpoint</div>
                <input type="text" className="inp" value={cfgDraft.endpoint||""} onChange={e=>setCfgDraft(d=>({...d,endpoint:e.target.value}))}/>
              </div>

              {/* Statistiques actuelles */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
                {[
                  {l:"Statut",    v:configPlatform.status==="connected"?"EN LIGNE":configPlatform.status==="warning"?"DÉGRADÉ":"HORS LIGNE", c:configPlatform.status==="connected"?C.green:configPlatform.status==="warning"?C.orange:C.textS},
                  {l:"Ingérés",   v:fmtN(configPlatform.ingested||0),  c:C.blue},
                  {l:"Latence",   v:`${configPlatform.latency||0} ms`,  c:C.gold},
                ].map(({l,v,c},i)=>(
                  <div key={i} style={{background:C.bg3,borderRadius:7,padding:"9px 11px",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:9,color:C.textS,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{l}</div>
                    <div style={{fontSize:12,fontWeight:700,color:c,fontFamily:"monospace"}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Boutons d'action */}
              <div style={{display:"flex",gap:9}}>
                <button onClick={()=>setCfgPlat(null)} className="btn btn-ghost" style={{flex:1,padding:"10px",fontSize:12}}>Annuler</button>
                <button disabled={cfgSaving} onClick={async()=>{
                  setCfgSaving(true);
                  try {
                    const res = await fetch(`${API_BASE}/connectors/${configPlatform.id}/config`,{
                      method:"PATCH",
                      headers:{"Content-Type":"application/json"},
                      body: JSON.stringify({
                        api_key:    cfgDraft.apiKey  || null,
                        rate_limit: cfgDraft.rateLimit,
                        endpoint:   cfgDraft.endpoint,
                        active:     cfgDraft.active,
                      }),
                    });
                    const updated = res.ok ? await res.json() : null;
                    setConn(prev=>prev.map(c=>c.id===configPlatform.id ? {
                      ...c,
                      rateLimit: updated?.rate_limit ?? cfgDraft.rateLimit,
                      endpoint:  updated?.endpoint  ?? cfgDraft.endpoint,
                      status:    cfgDraft.active ? (c.status==="offline"?"connected":c.status) : "offline",
                      hasApiKey: updated?.has_api_key ?? (cfgDraft.apiKey ? true : c.hasApiKey),
                    } : c));
                    if(configPlatform.id==="yt"&&cfgDraft.apiKey) setYtKey(cfgDraft.apiKey);
                  } catch(e){ console.error("Configurer save:",e); }
                  setCfgSaving(false);
                  setCfgPlat(null);
                }} className="btn btn-gold" style={{flex:2,padding:"10px",fontSize:12,fontWeight:900}}>
                  {cfgSaving ? "⏳ Sauvegarde…" : "✓ Sauvegarder"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{marginTop:20,paddingTop:12,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,fontSize:9.5,color:C.textS}}>
            <div style={{display:"flex",gap:2}}>{[C.sn1,C.sn2,C.sn3].map((c,i)=><div key={i} style={{width:3,height:10,background:c,borderRadius:1}}/>)}</div>
            PNVD · République du Sénégal · Hébergement souverain · Données classifiées DPP
          </div>
          <div style={{display:"flex",gap:14,fontSize:9.5,color:C.textS}}>
            <span>🔒 AES-256</span><span>🗺 Leaflet.js</span><span>🧠 Claude Sonnet NLP</span><span style={{color:C.textM}}>v5.0-stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
