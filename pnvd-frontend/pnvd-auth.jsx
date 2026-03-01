import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════ DESIGN TOKENS ═══════════════════════════ */
const C = {
  bg:"#02050C", bg2:"#060A14", bg3:"#090E1A",
  card:"#0A1020", cardH:"#0E1628",
  border:"#14203A", borderH:"#1E3060",
  gold:"#C8A94B", goldL:"#E8CA6B", goldD:"#6A5018",
  green:"#0FBA7D", greenD:"#041A0E",
  red:"#F04050",  redD:"#2A0510",
  orange:"#F5A020",
  blue:"#2A7AFF", blueD:"#040E2A",
  cyan:"#00D4FF",
  text:"#D0DFF0", textM:"#4A6888", textS:"#1E3050",
  sn1:"#009A44", sn2:"#FDEF42", sn3:"#E31B23",
};

/* ═══════════════════════════ ACCESS LEVELS ═══════════════════════════ */
const LEVELS = [
  {
    id:"presidence",
    label:"Présidence de la République",
    abbr:"PRÉSIDENCE",
    clearance:"NIVEAU 1 · SOUVERAIN",
    icon:"🏛",
    color:"#C8A94B",
    colorD:"#3A2800",
    description:"Accès total · Toutes données · Rapports souverains",
    permissions:["Tableau de bord exécutif","Toutes sources & alertes","Rapports classifiés","Gestion des accès","NLP & Analyse IA","Cartographie nationale"],
    users:[
      {name:"Cabinet du Président",  id:"CAB-PR-001", role:"Directeur Cabinet"},
      {name:"Conseiller Sécurité",   id:"SEC-PR-002", role:"Conseiller Principal"},
    ],
    badge:"TOP SECRET",
    badgeColor:"#C8A94B",
  },
  {
    id:"ministeres",
    label:"Primature & Ministères",
    abbr:"MINISTÈRES",
    clearance:"NIVEAU 2 · RESTREINT",
    icon:"⚖️",
    color:"#2A7AFF",
    colorD:"#040E2A",
    description:"Accès sectoriel · Données thématiques · Alertes ministérielles",
    permissions:["Dashboard sectoriel","Sources du secteur","Alertes & rapports","Mots-clés sectoriels","Influenceurs","Régions concernées"],
    users:[
      {name:"Min. Économie & Finances", id:"MIN-ECO-003", role:"Chargé de veille"},
      {name:"Min. Communication",       id:"MIN-COM-004", role:"Directeur Communication"},
      {name:"Min. Intérieur",           id:"MIN-INT-005", role:"Analyste Senior"},
    ],
    badge:"RESTREINT",
    badgeColor:"#2A7AFF",
  },
  {
    id:"cellules",
    label:"Cellules Opérationnelles",
    abbr:"CELLULES",
    clearance:"NIVEAU 3 · CONFIDENTIEL",
    icon:"📡",
    color:"#0FBA7D",
    colorD:"#041A0E",
    description:"Accès opérationnel · Collecte & monitoring · Alertes terrain",
    permissions:["Flux live temps réel","Connecteurs API","Mots-clés opérationnels","Alertes de terrain","Flux par région"],
    users:[
      {name:"Cellule Médias Dakar",    id:"CEL-DAK-010", role:"Opérateur Veille"},
      {name:"Cellule Réseaux Sociaux", id:"CEL-RSX-011", role:"Analyste Social Media"},
      {name:"Cellule NLP/IA",          id:"CEL-NLP-012", role:"Data Scientist"},
    ],
    badge:"CONFIDENTIEL",
    badgeColor:"#0FBA7D",
  },
];

const DEMO_CREDS = {
  presidence: { id:"PR-2026-ALPHA", pass:"Sn@Gov2026!" },
  ministeres:  { id:"MIN-ECO-003",  pass:"Ministere#1" },
  cellules:    { id:"CEL-DAK-010",  pass:"Cellule@SN"  },
};

/* ═══════════════════════════ MICRO COMPONENTS ═══════════════════════════ */
function Scanline() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px)"}}/>
    </div>
  );
}

function GridBg() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${C.border}22 1px,transparent 1px),linear-gradient(90deg,${C.border}22 1px,transparent 1px)`,backgroundSize:"40px 40px",opacity:.6}}/>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 80% 60% at 50% 40%,${C.blue}08 0%,transparent 70%)`}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"40%",background:`linear-gradient(0deg,${C.bg} 0%,transparent 100%)`}}/>
    </div>
  );
}

function Spin({size=18,color=C.gold}) {
  return <div style={{width:size,height:size,border:`2px solid ${color}33`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>;
}

function OTPInput({value, onChange, length=6}) {
  const inputs = useRef([]);
  const digits  = (value+"").padEnd(length,"").split("").slice(0,length);

  const handleKey = (i, e) => {
    if(e.key==="Backspace") {
      const next = digits.map((d,j)=>j===i?"":d).join("").trimEnd();
      onChange(next);
      if(i>0) inputs.current[i-1]?.focus();
    } else if(/^\d$/.test(e.key)) {
      const next = digits.map((d,j)=>j===i?e.key:d).join("");
      onChange(next);
      if(i<length-1) inputs.current[i+1]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div style={{display:"flex",gap:10,justifyContent:"center"}}>
      {Array.from({length}).map((_,i)=>(
        <div key={i} style={{position:"relative"}}>
          <input
            ref={el=>inputs.current[i]=el}
            value={digits[i]||""}
            onKeyDown={e=>handleKey(i,e)}
            onChange={()=>{}}
            maxLength={1}
            style={{
              width:46,height:56,textAlign:"center",fontSize:22,fontWeight:900,
              fontFamily:"'Courier New',monospace",letterSpacing:0,
              background:digits[i]?`${C.gold}15`:C.bg3,
              border:`2px solid ${digits[i]?C.gold:C.border}`,
              borderRadius:10,color:C.gold,outline:"none",
              caretColor:"transparent",transition:"all .15s",cursor:"text",
              boxShadow:digits[i]?`0 0 16px ${C.goldD}66`:"none",
            }}
          />
          {i===2&&<div style={{position:"absolute",top:"50%",right:-14,transform:"translateY(-50%)",width:4,height:4,borderRadius:"50%",background:C.textM}}/>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════ MAIN AUTH COMPONENT ═══════════════════════════ */
export default function PNVDAuth({ onAuthenticated } = {}) {
  /* ── STATE ── */
  const [phase, setPhase]         = useState("level");   // level | login | otp | verify | success
  const [selLevel, setSelLevel]   = useState(null);
  const [userId, setUserId]       = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [otp, setOtp]             = useState("");
  const [loginErr, setLoginErr]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [now, setNow]             = useState(new Date());
  const [glitch, setGlitch]       = useState(false);
  const [verifySteps, setVSteps]  = useState([]);
  const [sessionUser, setSessUser]= useState(null);
  const [showLogout, setShowLogout]= useState(false);

  /* ── CLOCK ── */
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);

  /* ── GLITCH EFFECT ── */
  useEffect(()=>{
    const t=setInterval(()=>{ setGlitch(true); setTimeout(()=>setGlitch(false),120); }, rand(6000,14000));
    return()=>clearInterval(t);
  },[]);

  const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;

  /* ── LOGIN SUBMIT ── */
  const handleLogin = useCallback(()=>{
    setLoginErr("");
    if(!userId.trim()||!password.trim()){ setLoginErr("Identifiant et mot de passe requis."); return; }
    const demo=DEMO_CREDS[selLevel.id];
    if(userId!==demo.id||password!==demo.pass){ setLoginErr("Identifiant ou mot de passe incorrect."); return; }
    setLoading(true);
    setTimeout(()=>{
      setLoading(false); setPhase("verify");
      const steps=[
        {label:"Vérification identité biométrique",      time:700 },
        {label:"Validation certificat PKI gouvernemental",time:500 },
        {label:"Chargement des habilitations",           time:600 },
        {label:"Établissement tunnel chiffré AES-256",   time:500 },
        {label:"Connexion au cluster souverain Dakar",   time:700 },
        {label:"Initialisation de la session sécurisée", time:600 },
      ];
      let acc=0;
      steps.forEach(({label,time},i)=>{
        acc+=time;
        setTimeout(()=>{
          setVSteps(p=>[...p,{label,done:true}]);
          setProgress(Math.round(((i+1)/steps.length)*100));
          if(i===steps.length-1){
            setTimeout(()=>{ setPhase("success"); setSessUser({level:selLevel,userId}); },600);
          }
        },acc);
      });
    },1200);
  },[userId,password,selLevel]);

  /* ── OTP VERIFY ── */
  const handleOTP = useCallback(()=>{
    if(otp.length<6){ setLoginErr("Veuillez saisir le code à 6 chiffres complet."); return; }
    setLoginErr(""); setLoading(true); setPhase("verify");
    const steps=[
      {label:"Vérification identité biométrique",      time:700 },
      {label:"Validation certificat PKI gouvernemental",time:500 },
      {label:"Chargement des habilitations",           time:600 },
      {label:"Établissement tunnel chiffré AES-256",   time:500 },
      {label:"Connexion au cluster souverain Dakar",   time:700 },
      {label:"Initialisation de la session sécurisée", time:600 },
    ];
    let acc=0;
    steps.forEach(({label,time},i)=>{
      acc+=time;
      setTimeout(()=>{
        setVSteps(p=>[...p,{label,done:true}]);
        setProgress(Math.round(((i+1)/steps.length)*100));
        if(i===steps.length-1){
          setTimeout(()=>{ setLoading(false); setPhase("success"); setSessUser({level:selLevel,userId}); },600);
        }
      },acc);
    });
  },[otp,selLevel,userId]);

  /* ── LOGOUT ── */
  const handleLogout=()=>{ setPhase("level"); setSelLevel(null); setUserId(""); setPassword(""); setOtp(""); setVSteps([]); setProgress(0); setSessUser(null); setShowLogout(false); setLoginErr(""); };

  /* ── IF LOGGED IN, show dashboard shell ── */
  if(phase==="success"&&sessionUser){
    if(onAuthenticated){ onAuthenticated(sessionUser); return null; }
    return <DashboardShell user={sessionUser} onLogout={handleLogout} now={now}/>;
  }

  /* ═══════════════════════════════════════════════════
     AUTH UI
  ═══════════════════════════════════════════════════ */
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Courier New',monospace",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes glitch1{0%,100%{transform:none}20%{transform:translate(-2px,0) skewX(-2deg)}40%{transform:translate(2px,0) skewX(1deg)}60%{transform:translate(0,0)}}
        @keyframes scan{0%{top:-100%}100%{top:100%}}
        @keyframes borderPulse{0%,100%{box-shadow:0 0 0px transparent}50%{box-shadow:0 0 20px currentColor}}
        @keyframes countIn{from{opacity:0;transform:scale(1.3)}to{opacity:1;transform:scale(1)}}
        @keyframes slideRight{from{width:0}to{width:100%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#14203A transparent}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#14203A;border-radius:4px}
        .inp{background:#06090F;border:1.5px solid ${C.border};border-radius:10px;padding:12px 16px;color:${C.text};font-family:'Courier New',monospace;font-size:13px;outline:none;width:100%;transition:all .2s;letter-spacing:.5px}
        .inp:focus{border-color:${C.gold};box-shadow:0 0 24px ${C.goldD}55;background:#080C16}
        .inp::placeholder{color:${C.textM}}
        .level-card{border-radius:14px;padding:22px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
        .level-card:hover{transform:translateY(-3px)}
        .btn-main{border:none;border-radius:10px;cursor:pointer;font-family:'Courier New',monospace;font-weight:900;letter-spacing:1.5px;font-size:13px;padding:14px;width:100%;transition:all .2s;text-transform:uppercase}
        .btn-main:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn-main:active{transform:translateY(0)}
        .btn-main:disabled{opacity:.4;cursor:not-allowed;transform:none}
      `}</style>

      <GridBg/>
      <Scanline/>

      {/* ── TOP BAND ── */}
      <div style={{background:`linear-gradient(90deg,${C.bg2},${C.bg3})`,borderBottom:`1px solid ${C.border}`,padding:"10px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",gap:3}}>{[C.sn1,C.sn2,C.sn3].map((c,i)=><div key={i} style={{width:4,height:16,background:c,borderRadius:2}}/>)}</div>
          <div>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:2,color:C.goldL,animation:glitch?"glitch1 .12s ease":undefined}}>PNVD</div>
            <div style={{fontSize:7.5,color:C.textS,letterSpacing:1.5}}>VEILLE DIGITALE · SÉNÉGAL</div>
          </div>
        </div>
        <div style={{display:"flex",gap:24,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 8px ${C.green}`,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:9.5,color:C.green,fontWeight:700,letterSpacing:1}}>SYSTÈME OPÉRATIONNEL</span>
          </div>
          <div style={{fontSize:9.5,color:C.textM,fontFamily:"monospace"}}>{now.toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
          <div style={{fontSize:9.5,color:C.textS,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 10px"}}>🔒 TLS 1.3 · AES-256</div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",position:"relative",zIndex:10}}>

        {/* LOGO BLOCK */}
        <div style={{textAlign:"center",marginBottom:40,animation:"fadeUp .6s ease"}}>
          <div style={{fontSize:11,color:C.textM,letterSpacing:4,marginBottom:10,textTransform:"uppercase"}}>République du Sénégal</div>
          <div style={{fontSize:44,fontWeight:900,letterSpacing:8,color:C.goldL,textShadow:`0 0 60px ${C.goldD}`,marginBottom:4,lineHeight:1,animation:glitch?"glitch1 .12s":undefined}}>PNVD</div>
          <div style={{fontSize:10,color:C.textM,letterSpacing:3,marginBottom:16}}>PLATEFORME NATIONALE DE VEILLE DIGITALE</div>
          <div style={{display:"flex",justifyContent:"center",gap:6}}>
            <div style={{height:1,width:60,background:`linear-gradient(90deg,transparent,${C.gold})`}}/>
            <div style={{width:5,height:5,borderRadius:1,background:C.gold,transform:"rotate(45deg)",marginTop:-2}}/>
            <div style={{height:1,width:60,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>
          </div>
        </div>

        {/* ════════════ PHASE: LEVEL SELECT ════════════ */}
        {phase==="level"&&(
          <div style={{width:"100%",maxWidth:860,animation:"fadeUp .5s ease"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:14,color:C.textM,letterSpacing:1}}>Sélectionnez votre niveau d'habilitation</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              {LEVELS.map((lv,i)=>(
                <div key={lv.id} className="level-card" onClick={()=>{setSelLevel(lv);setPhase("login");setLoginErr("");}}
                  style={{background:`linear-gradient(145deg,${C.card},${lv.colorD}55)`,border:`1.5px solid ${lv.color}44`,animation:`fadeUp ${.1+i*.1}s ease`}}>
                  {/* Shimmer line */}
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${lv.color},transparent)`,borderRadius:"14px 14px 0 0"}}/>

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                    <div style={{fontSize:36,lineHeight:1}}>{lv.icon}</div>
                    <span style={{fontSize:8.5,fontWeight:900,letterSpacing:1,padding:"3px 8px",borderRadius:5,background:`${lv.badgeColor}22`,color:lv.badgeColor,border:`1px solid ${lv.badgeColor}44`}}>{lv.badge}</span>
                  </div>

                  <div style={{fontSize:9,color:lv.color,fontWeight:900,letterSpacing:2,marginBottom:6,textTransform:"uppercase"}}>{lv.clearance}</div>
                  <div style={{fontSize:14,fontWeight:900,color:C.text,marginBottom:8,lineHeight:1.3}}>{lv.label}</div>
                  <div style={{fontSize:10.5,color:C.textM,marginBottom:16,lineHeight:1.5}}>{lv.description}</div>

                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                    <div style={{fontSize:9,color:C.textS,letterSpacing:1,marginBottom:8}}>PERMISSIONS</div>
                    {lv.permissions.slice(0,4).map((p,j)=>(
                      <div key={j} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                        <div style={{width:4,height:4,borderRadius:1,background:lv.color,flexShrink:0,transform:"rotate(45deg)"}}/>
                        <span style={{fontSize:10,color:C.textM}}>{p}</span>
                      </div>
                    ))}
                    {lv.permissions.length>4&&<div style={{fontSize:9.5,color:lv.color,marginTop:4}}>+{lv.permissions.length-4} autres…</div>}
                  </div>

                  <button style={{marginTop:16,width:"100%",padding:"10px",background:`${lv.color}15`,border:`1px solid ${lv.color}44`,borderRadius:8,color:lv.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Courier New',monospace",letterSpacing:1,transition:"all .2s"}}
                    onMouseEnter={e=>{e.target.style.background=`${lv.color}25`;e.target.style.borderColor=lv.color;}}
                    onMouseLeave={e=>{e.target.style.background=`${lv.color}15`;e.target.style.borderColor=`${lv.color}44`;}}>
                    ACCÉDER →
                  </button>
                </div>
              ))}
            </div>

            <div style={{textAlign:"center",marginTop:28,fontSize:10,color:C.textS,lineHeight:1.7}}>
              🔒 Accès strictement réservé aux agents habilités de la République du Sénégal<br/>
              Toute tentative d'accès non autorisée est passible de poursuites judiciaires
            </div>
          </div>
        )}

        {/* ════════════ PHASE: LOGIN FORM ════════════ */}
        {phase==="login"&&selLevel&&(
          <div style={{width:"100%",maxWidth:440,animation:"fadeUp .4s ease"}}>
            {/* BACK */}
            <button onClick={()=>{setPhase("level");setLoginErr("");setUserId("");setPassword("");}} style={{background:"none",border:"none",color:C.textM,cursor:"pointer",fontSize:11.5,fontFamily:"'Courier New',monospace",marginBottom:24,display:"flex",alignItems:"center",gap:7,padding:0,letterSpacing:.5}}>
              ← Retour à la sélection
            </button>

            {/* LEVEL BANNER */}
            <div style={{background:`linear-gradient(135deg,${selLevel.colorD}88,${C.card})`,border:`1.5px solid ${selLevel.color}55`,borderRadius:14,padding:"16px 20px",marginBottom:28,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${selLevel.color},transparent)`}}/>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:28}}>{selLevel.icon}</div>
                <div>
                  <div style={{fontSize:8.5,color:selLevel.color,fontWeight:900,letterSpacing:2,marginBottom:3}}>{selLevel.clearance}</div>
                  <div style={{fontSize:13,fontWeight:900,color:C.text}}>{selLevel.label}</div>
                </div>
                <span style={{marginLeft:"auto",fontSize:8,fontWeight:900,padding:"3px 9px",borderRadius:5,background:`${selLevel.badgeColor}22`,color:selLevel.badgeColor,border:`1px solid ${selLevel.badgeColor}44`}}>{selLevel.badge}</span>
              </div>
            </div>

            <div style={{fontSize:13,fontWeight:700,color:C.textM,marginBottom:20,letterSpacing:.5}}>Connexion sécurisée</div>

            {/* ID FIELD */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9.5,color:C.textS,letterSpacing:1,marginBottom:7,textTransform:"uppercase"}}>Identifiant national</div>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.textM}}>👤</span>
                <input className="inp" value={userId} onChange={e=>setUserId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder={`Ex: ${DEMO_CREDS[selLevel.id].id}`} style={{paddingLeft:42}}/>
              </div>
            </div>

            {/* PASS FIELD */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9.5,color:C.textS,letterSpacing:1,marginBottom:7,textTransform:"uppercase"}}>Mot de passe</div>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.textM}}>🔑</span>
                <input className="inp" type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••••••••" style={{paddingLeft:42,paddingRight:46,letterSpacing:showPass?.5:4}}/>
                <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textM,fontSize:14,padding:0}}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>

            {/* ERROR */}
            {loginErr&&(
              <div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:9,padding:"10px 14px",fontSize:11.5,color:C.red,marginBottom:16,display:"flex",alignItems:"center",gap:8,animation:"fadeIn .2s ease"}}>
                <span>⚠</span>{loginErr}
              </div>
            )}

            {/* SUBMIT */}
            <button className="btn-main" onClick={handleLogin} disabled={loading} style={{background:loading?C.bg3:`linear-gradient(135deg,${selLevel.color},${selLevel.colorD})`,color:loading?C.textM:"#fff",borderColor:loading?C.border:selLevel.color,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:loading?"none":`0 4px 30px ${selLevel.color}33`}}>
              {loading?<><Spin size={15} color={selLevel.color}/> Vérification en cours…</>:<>🔐 CONNEXION SÉCURISÉE</>}
            </button>

            {/* DEMO HINT */}
            <div style={{marginTop:20,padding:"12px 16px",background:"#06090F",border:`1px solid ${C.border}`,borderRadius:9}}>
              <div style={{fontSize:9,color:C.textS,marginBottom:7,letterSpacing:1}}>ACCÈS DÉMO</div>
              <div style={{fontSize:10.5,color:C.textM,fontFamily:"monospace",display:"flex",gap:16}}>
                <span>ID: <span style={{color:C.gold}}>{DEMO_CREDS[selLevel.id].id}</span></span>
                <span>MDP: <span style={{color:C.gold}}>{DEMO_CREDS[selLevel.id].pass}</span></span>
              </div>
              <div style={{fontSize:9,color:C.textS,marginTop:6}}>OTP: tout code à 6 chiffres</div>
            </div>
          </div>
        )}

        {/* ════════════ PHASE: OTP ════════════ */}
        {phase==="otp"&&selLevel&&(
          <div style={{width:"100%",maxWidth:420,animation:"fadeUp .4s ease",textAlign:"center"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:`${selLevel.color}18`,border:`2px solid ${selLevel.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 20px"}}>📲</div>
            <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>Authentification à deux facteurs</div>
            <div style={{fontSize:11.5,color:C.textM,marginBottom:28,lineHeight:1.7}}>
              Un code OTP a été envoyé au téléphone enregistré<br/>
              pour l'identifiant <span style={{color:selLevel.color,fontWeight:700}}>{userId}</span>
            </div>

            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,marginBottom:16}}>
              <div style={{fontSize:9.5,color:C.textS,letterSpacing:1,marginBottom:18,textTransform:"uppercase"}}>Code de vérification à 6 chiffres</div>
              <OTPInput value={otp} onChange={setOtp} length={6}/>
              <div style={{marginTop:16,fontSize:9.5,color:C.textS}}>
                Le code expire dans <span style={{color:C.orange,fontWeight:700}}>04:58</span>
              </div>
            </div>

            {loginErr&&(
              <div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:9,padding:"10px 14px",fontSize:11.5,color:C.red,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <span>⚠</span>{loginErr}
              </div>
            )}

            <button className="btn-main" onClick={handleOTP} disabled={otp.length<6||loading} style={{background:otp.length===6?`linear-gradient(135deg,${selLevel.color},${selLevel.colorD})`:C.bg3,color:otp.length===6?"#fff":C.textM,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:otp.length===6?`0 4px 30px ${selLevel.color}33`:"none"}}>
              ✓ VALIDER LE CODE OTP
            </button>

            <button onClick={()=>{setPhase("login");setOtp("");setLoginErr("");}} style={{marginTop:12,background:"none",border:"none",color:C.textM,cursor:"pointer",fontSize:11,fontFamily:"'Courier New',monospace",letterSpacing:.5}}>← Retour à la connexion</button>
          </div>
        )}

        {/* ════════════ PHASE: VERIFY ════════════ */}
        {phase==="verify"&&selLevel&&(
          <div style={{width:"100%",maxWidth:440,animation:"fadeUp .4s ease"}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{position:"relative",width:80,height:80,margin:"0 auto 20px"}}>
                <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`3px solid ${selLevel.color}33`}}/>
                <div style={{position:"absolute",inset:4,borderRadius:"50%",border:`2px solid ${selLevel.color}88`,animation:"spin 2s linear infinite"}}/>
                <div style={{position:"absolute",inset:12,borderRadius:"50%",background:`${selLevel.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{selLevel.icon}</div>
              </div>
              <div style={{fontSize:14,fontWeight:900,marginBottom:6}}>Vérification en cours…</div>
              <div style={{fontSize:11,color:C.textM}}>Contrôle des habilitations · Niveau {selLevel.abbr}</div>
            </div>

            {/* PROGRESS BAR */}
            <div style={{background:C.bg3,borderRadius:4,height:3,marginBottom:28,overflow:"hidden"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${selLevel.color},${selLevel.color}88)`,borderRadius:4,transition:"width .4s ease",width:`${progress}%`,boxShadow:`0 0 12px ${selLevel.color}`}}/>
            </div>

            {/* STEPS */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
              {verifySteps.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<verifySteps.length-1?12:0,animation:"fadeIn .3s ease"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:`${selLevel.color}22`,border:`1.5px solid ${selLevel.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:selLevel.color}}/>
                  </div>
                  <span style={{fontSize:11.5,color:C.textM}}>{s.label}</span>
                  <span style={{marginLeft:"auto",fontSize:10,color:selLevel.color,fontWeight:700}}>OK</span>
                </div>
              ))}
              {[...Array(6-verifySteps.length)].map((_,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginTop:verifySteps.length>0||i>0?12:0,opacity:.25}}>
                  <div style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${C.border}`,flexShrink:0}}/>
                  <div style={{height:9,background:C.border,borderRadius:4,flex:1}}/>
                </div>
              ))}
            </div>

            <div style={{textAlign:"center",marginTop:16,fontSize:9.5,color:C.textS}}>{progress}% — Ne fermez pas cette fenêtre</div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:10,background:C.bg2}}>
        <div style={{display:"flex",gap:16,fontSize:9,color:C.textS}}>
          <span>🔒 Connexion chiffrée TLS 1.3</span>
          <span>🛡 ISO 27001</span>
          <span>⚖️ Loi n°2008-12 sur la protection des données</span>
        </div>
        <div style={{fontSize:9,color:C.textS}}>PNVD v5.0 · Hébergement souverain · Dakar Data Center · 🇸🇳</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ DASHBOARD SHELL (post-login) ═══════════════════════════ */
function DashboardShell({user, onLogout, now}) {
  const lv = user.level;
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sessionTime, setSessionTime] = useState(0);
  const [warnLogout, setWarnLogout] = useState(false);
  const SESSION_LIMIT = 30 * 60; // 30 min

  useEffect(()=>{
    const t=setInterval(()=>{
      setSessionTime(s=>{
        if(s+1>=SESSION_LIMIT-120&&s+1<SESSION_LIMIT) setWarnLogout(true);
        if(s+1>=SESSION_LIMIT) { onLogout(); return 0; }
        return s+1;
      });
    },1000);
    return()=>clearInterval(t);
  },[]);

  const remaining = SESSION_LIMIT - sessionTime;
  const remMin    = Math.floor(remaining/60).toString().padStart(2,"0");
  const remSec    = (remaining%60).toString().padStart(2,"0");

  /* PERMISSIONS MAP — what tabs each level can see */
  const TABS_ALL = [
    {id:"dashboard",   label:"Tableau de bord", icon:"▦",  levels:["presidence","ministeres","cellules"]},
    {id:"flux",        label:"Flux live",        icon:"📡", levels:["presidence","ministeres","cellules"]},
    {id:"sources",     label:"Sources",          icon:"🔗", levels:["presidence","ministeres"]},
    {id:"influenceurs",label:"Influenceurs",     icon:"👥", levels:["presidence","ministeres"]},
    {id:"connecteurs", label:"Connecteurs",      icon:"⚙️", levels:["presidence","cellules"]},
    {id:"mots_cles",   label:"Mots-clés",        icon:"🔑", levels:["presidence","ministeres","cellules"]},
    {id:"alertes",     label:"Alertes",          icon:"⚡", levels:["presidence","ministeres","cellules"]},
    {id:"nlp",         label:"Analyse NLP IA",   icon:"🧠", levels:["presidence","ministeres"]},
    {id:"themes",      label:"Thèmes",           icon:"🔍", levels:["presidence","ministeres"]},
    {id:"regions",     label:"Régions",          icon:"🗺", levels:["presidence","ministeres","cellules"]},
    {id:"rapports",    label:"Rapports PDF",     icon:"📄", levels:["presidence","ministeres"]},
  ];

  const allowed = TABS_ALL.filter(t=>t.levels.includes(lv.id));
  const locked  = TABS_ALL.filter(t=>!t.levels.includes(lv.id));

  // Reset activeTab if it's not allowed
  useEffect(()=>{
    if(!allowed.find(t=>t.id===activeTab)) setActiveTab(allowed[0]?.id||"dashboard");
  },[]);

  const KPIS = [
    {l:"Mentions actives",  v:"24 873", d:"+47 en direct",  c:"#2A7AFF", i:"📡"},
    {l:"Sentiment positif", v:"58.2%",  d:"+3.1% vs hier",  c:"#0FBA7D", i:"✅"},
    {l:"Alertes actives",   v:"3",      d:"2 critiques",     c:"#F04050", i:"⚡"},
    {l:"Data ingérées",     v:"847 293",d:"+38 session",     c:"#C8A94B", i:"🗄"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Courier New',monospace",fontSize:13}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#14203A transparent}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#14203A;border-radius:4px}
        .hov:hover{background:${C.cardH}!important;border-color:${C.borderH}!important}
        .tb{background:transparent;border:none;border-top:2px solid transparent;padding:8px 11px;cursor:pointer;font-size:11px;font-family:'Courier New',monospace;border-radius:6px 6px 0 0;transition:all .12s;display:flex;align-items:center;gap:5px;white-space:nowrap;color:${C.textM}}
        .tb.on{background:${C.card};border-top-color:${lv.color};color:${lv.color};font-weight:700}
        .tb:not(.on):hover{color:${C.text}}
        .tb-locked{opacity:.3;cursor:not-allowed;color:${C.textS}}
      `}</style>

      {/* SESSION WARN */}
      {warnLogout&&(
        <div style={{position:"fixed",top:70,right:20,zIndex:999,background:C.redD,border:`2px solid ${C.red}`,borderRadius:12,padding:"14px 20px",maxWidth:300,animation:"fadeUp .3s ease",boxShadow:`0 8px 40px ${C.red}44`}}>
          <div style={{fontWeight:900,color:C.red,marginBottom:6,fontSize:13}}>⚠ Session sur le point d'expirer</div>
          <div style={{fontSize:11.5,color:C.textM,marginBottom:10}}>Votre session expire dans <span style={{color:C.orange,fontWeight:700,animation:"blink 1s infinite"}}>{remMin}:{remSec}</span></div>
          <button onClick={()=>{setSessionTime(0);setWarnLogout(false);}} style={{background:C.red,border:"none",borderRadius:7,color:"#fff",padding:"7px 14px",cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:700,fontSize:11,width:"100%"}}>Prolonger la session</button>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:`linear-gradient(180deg,#060A14,${C.bg2})`,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:200}}>
        <div style={{maxWidth:1600,margin:"0 auto",padding:"0 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,height:54}}>
            {/* LOGO */}
            <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
              <div style={{display:"flex",gap:2}}>{[C.sn1,C.sn2,C.sn3].map((c,i)=><div key={i} style={{width:4,height:10,background:c,borderRadius:2}}/>)}</div>
              <div>
                <div style={{fontWeight:900,fontSize:15,letterSpacing:2,color:C.goldL}}>PNVD<span style={{color:C.textM,fontSize:9,marginLeft:4,fontWeight:400}}>v5.0</span></div>
                <div style={{fontSize:8,color:C.textS,letterSpacing:1.5}}>VEILLE DIGITALE · SÉNÉGAL</div>
              </div>
            </div>

            {/* LEVEL BADGE */}
            <div style={{display:"flex",alignItems:"center",gap:8,background:`${lv.color}12`,border:`1px solid ${lv.color}44`,borderRadius:8,padding:"5px 12px",flexShrink:0}}>
              <span style={{fontSize:14}}>{lv.icon}</span>
              <div>
                <div style={{fontSize:8,color:lv.color,fontWeight:900,letterSpacing:1}}>{lv.clearance}</div>
                <div style={{fontSize:11,fontWeight:700,color:C.text}}>{lv.abbr}</div>
              </div>
            </div>

            <div style={{flex:1}}/>

            {/* SESSION TIMER */}
            <div style={{display:"flex",alignItems:"center",gap:6,background:remaining<300?C.redD:C.bg3,border:`1px solid ${remaining<300?C.red+"44":C.border}`,borderRadius:7,padding:"4px 11px"}}>
              <span style={{fontSize:9.5,color:remaining<300?C.red:C.textM}}>⏱ Session</span>
              <span style={{fontSize:11,fontWeight:700,color:remaining<300?C.red:C.textM,fontFamily:"monospace"}}>{remMin}:{remSec}</span>
            </div>

            {/* USER MENU */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowMenu(m=>!m)} style={{display:"flex",alignItems:"center",gap:8,background:showMenu?C.card:C.bg3,border:`1px solid ${showMenu?lv.color+"55":C.border}`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"'Courier New',monospace",transition:"all .15s"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${lv.color}22`,border:`2px solid ${lv.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{lv.icon}</div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text}}>{user.userId}</div>
                  <div style={{fontSize:9,color:lv.color}}>{lv.abbr}</div>
                </div>
                <span style={{color:C.textM,fontSize:10}}>{showMenu?"▲":"▼"}</span>
              </button>
              {showMenu&&(
                <div style={{position:"absolute",top:46,right:0,background:C.card,border:`1px solid ${C.borderH}`,borderRadius:10,boxShadow:"0 16px 48px #000C",zIndex:300,minWidth:220,overflow:"hidden",animation:"fadeUp .15s ease"}}>
                  <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:`${lv.color}0A`}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{user.userId}</div>
                    <div style={{fontSize:10,color:lv.color}}>{lv.clearance}</div>
                    <div style={{fontSize:10,color:C.textM,marginTop:2}}>{lv.label}</div>
                  </div>
                  {[{i:"🔑",l:"Changer le mot de passe"},{i:"📊",l:"Mon activité"},{i:"⚙️",l:"Préférences"},{i:"📋",l:"Journal d'accès"}].map(({i,l},j)=>(
                    <button key={j} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",background:"none",border:"none",color:C.textM,fontSize:11.5,cursor:"pointer",fontFamily:"'Courier New',monospace",textAlign:"left",borderBottom:`1px solid ${C.border}11`,transition:"background .1s"}}
                      onMouseEnter={e=>e.target.style.background=C.bg3}
                      onMouseLeave={e=>e.target.style.background="none"}>
                      {i} {l}
                    </button>
                  ))}
                  <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 16px",background:"none",border:"none",color:C.red,fontSize:11.5,cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:700,textAlign:"left",transition:"background .1s",borderTop:`1px solid ${C.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.redD}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    🚪 Déconnexion sécurisée
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TABS */}
          <div style={{display:"flex",gap:1,overflowX:"auto"}}>
            {TABS_ALL.map(t=>{
              const isAllowed = allowed.find(a=>a.id===t.id);
              return (
                <button key={t.id}
                  onClick={()=>isAllowed&&setActiveTab(t.id)}
                  className={`tb${activeTab===t.id?" on":""}${!isAllowed?" tb-locked":""}`}
                  title={!isAllowed?`Accès non autorisé — niveau ${lv.abbr}`:""}
                >
                  {t.icon} {t.label}
                  {!isAllowed&&<span style={{fontSize:9,marginLeft:2}}>🔒</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DASHBOARD CONTENT */}
      <div style={{maxWidth:1600,margin:"0 auto",padding:16}}>

        {/* KPI ROW */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
          {KPIS.map((s,i)=>(
            <div key={i} className="hov" style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",borderBottom:`3px solid ${s.c}`,animation:`fadeUp ${.08*i}s ease`,cursor:"default"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:9,color:C.textM,letterSpacing:.8,textTransform:"uppercase"}}>{s.l}</span><span style={{fontSize:18}}>{s.i}</span></div>
              <div style={{fontSize:24,fontWeight:900,letterSpacing:-1,marginBottom:3}}>{s.v}</div>
              <div style={{fontSize:10.5,color:s.c,fontWeight:700}}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* MAIN PANEL */}
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,minHeight:380}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontWeight:900,fontSize:15,marginBottom:4}}>Vue principale · {TABS_ALL.find(t=>t.id===activeTab)?.label||"Tableau de bord"}</div>
                <div style={{fontSize:11,color:C.textM}}>Niveau d'accès : <span style={{color:lv.color,fontWeight:700}}>{lv.clearance}</span></div>
              </div>
              <span style={{fontSize:9,fontWeight:900,padding:"4px 10px",borderRadius:6,background:`${lv.badgeColor}22`,color:lv.badgeColor,border:`1px solid ${lv.badgeColor}44`,letterSpacing:1}}>{lv.badge}</span>
            </div>

            {/* LOCKED TAB WARNING */}
            {!allowed.find(t=>t.id===activeTab)&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,animation:"fadeUp .3s ease"}}>
                <div style={{fontSize:52,marginBottom:16,opacity:.5}}>🔒</div>
                <div style={{fontWeight:900,fontSize:15,marginBottom:8}}>Accès non autorisé</div>
                <div style={{fontSize:12,color:C.textM,textAlign:"center",maxWidth:280,lineHeight:1.7}}>
                  La rubrique <strong>{TABS_ALL.find(t=>t.id===activeTab)?.label}</strong> nécessite une habilitation de niveau supérieur.
                </div>
                <div style={{marginTop:16,padding:"8px 16px",background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,fontSize:11,color:C.red}}>Votre niveau : {lv.clearance}</div>
              </div>
            )}

            {/* ACTIVE TAB CONTENT */}
            {allowed.find(t=>t.id===activeTab)&&(
              <div>
                {/* Simulated chart */}
                <div style={{background:C.bg3,borderRadius:10,padding:16,marginBottom:14}}>
                  <div style={{fontSize:11,color:C.textM,marginBottom:10}}>Volume de mentions — 24h</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:72}}>
                    {[30,42,28,55,38,62,80,95,72,58,84,100,88].map((v,i)=>(
                      <div key={i} style={{flex:1,height:"100%",display:"flex",alignItems:"flex-end"}}>
                        <div style={{width:"100%",borderRadius:"2px 2px 0 0",height:`${v}%`,background:i===11?`linear-gradient(180deg,${C.red},${C.redD})`:i===7||i===10?`linear-gradient(180deg,${lv.color},${lv.colorD})`:`linear-gradient(180deg,${C.blue}66,${C.blue}22)`}}/>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                {[{l:"Plan Sénégal 2050",v:"4 800",s:"positif"},{l:"Pétrole Sangomar",v:"3 200",s:"neutre"},{l:"Hausse carburant",v:"2 900",s:"negatif"},{l:"BFEM résultats",v:"2 400",s:"positif"},{l:"Grève transport",v:"2 000",s:"negatif"}].slice(0,lv.id==="cellules"?3:5).map((t,i)=>(
                  <div key={i} className="hov" style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:i%2===0?"#07090E":"transparent",borderRadius:8,marginBottom:3,cursor:"pointer"}}>
                    <span style={{color:C.textS,fontWeight:900,fontSize:10,width:16,textAlign:"center"}}>{i+1}</span>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{t.l}</div></div>
                    <span style={{fontSize:11,fontFamily:"monospace",color:C.textM}}>{t.v}</span>
                    <span style={{fontSize:9.5,padding:"2px 8px",borderRadius:12,fontWeight:700,background:t.s==="positif"?"#062815":t.s==="negatif"?"#3A0810":"#111828",color:t.s==="positif"?C.green:t.s==="negatif"?C.red:C.textM}}>{t.s.charAt(0).toUpperCase()+t.s.slice(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* USER INFO */}
            <div style={{background:C.card,border:`1.5px solid ${lv.color}44`,borderRadius:12,padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:`${lv.color}18`,border:`2px solid ${lv.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{lv.icon}</div>
                <div>
                  <div style={{fontWeight:900,fontSize:13,marginBottom:2}}>{user.userId}</div>
                  <div style={{fontSize:10,color:lv.color,fontWeight:700}}>{lv.clearance}</div>
                </div>
              </div>
              <div style={{fontSize:9.5,color:C.textS,marginBottom:10,letterSpacing:.5}}>PERMISSIONS ACTIVES</div>
              {lv.permissions.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                  <div style={{width:5,height:5,borderRadius:1,background:lv.color,flexShrink:0,transform:"rotate(45deg)"}}/>
                  <span style={{fontSize:10.5,color:C.textM}}>{p}</span>
                </div>
              ))}
            </div>

            {/* LOCKED TABS */}
            {locked.length>0&&(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
                <div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:12}}>RUBRIQUES VERROUILLÉES</div>
                {locked.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.bg3,borderRadius:8,marginBottom:6,opacity:.6}}>
                    <span>{t.icon}</span>
                    <span style={{flex:1,fontSize:11,color:C.textS}}>{t.label}</span>
                    <span style={{fontSize:9.5}}>🔒</span>
                  </div>
                ))}
                <div style={{marginTop:10,fontSize:10,color:C.textS,textAlign:"center"}}>Contactez l'administrateur système</div>
              </div>
            )}

            {/* SYSTEM STATUS */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
              <div style={{fontSize:9.5,color:C.textS,letterSpacing:.5,marginBottom:12}}>ÉTAT DU SYSTÈME</div>
              {[{l:"Serveur souverain",s:"EN LIGNE",c:C.green},{l:"API Connecteurs",s:"6/8 ACTIFS",c:C.green},{l:"Module NLP IA",s:"OPÉRATIONNEL",c:C.green},{l:"Chiffrement",s:"AES-256",c:C.gold}].map(({l,s,c},i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:9,alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.textM}}>{l}</span>
                  <span style={{fontSize:9.5,fontWeight:700,color:c}}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CLICK OUTSIDE TO CLOSE MENU */}
      {showMenu&&<div onClick={()=>setShowMenu(false)} style={{position:"fixed",inset:0,zIndex:199}}/>}
    </div>
  );
}
