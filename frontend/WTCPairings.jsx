import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000";
const GRADES = ['RR','R','A-','A','A+','G','GG','mirror'];
const GRADE_RANGES = {RR:[0,3],R:[3,7],'A-':[7,9],A:[9,11],'A+':[11,13],G:[13,17],GG:[17,20],mirror:[0,20]};
const GC = {RR:'#ff4757',R:'#ff6348','A-':'#ffa502',A:'#a4b0be','A+':'#4da6ff',G:'#2ed573',GG:'#7bed9f',mirror:'#a29bfe'};
const TABLES = ['Light','Medium 1','Medium 2','Medium 3','Heavy'];
const DEF_Y = ['DE','GSC','Necrons','Custodes','IG'];
const DEF_O = ['Tsons','Drukhari','Orks','SM','Necrons'];
const DEF_D = [['A','mirror','A','A-','A+'],['G','A+','R','A','A+'],['G','A','A+','A+','mirror'],['A','RR','A','A+','A'],['A+','A+','A','A+','A+']];
const C = {bg:'#07060e',panel:'#0e0c1b',panel2:'#141228',border:'#22203a',borderBright:'#3a3660',red:'#c1121f',redB:'#e63946',amber:'#e9c46a',text:'#e2e2f2',muted:'#6b6a85',dim:'#1a1830',green:'#2ecc71',blue:'#4da6ff',purple:'#9b8ec4'};

// ── API CLIENT ──────────────────────────────────────────
const apiCall = async (endpoint, body={}) => {
  const res = await fetch(`${API}${endpoint}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.detail||`API error ${res.status}`); }
  return res.json();
};

// ── MATRIX HELPERS ──────────────────────────────────────
const buildMxPayload = (ya,oa,md) => ({your_armies:ya, opp_armies:oa, grades:md});
const getGrade = (ya,oa,md,y,o) => { const yi=ya.indexOf(y),oi=oa.indexOf(o); return md[yi]?.[oi]??'A'; };
const getScore = (ya,oa,md,y,o) => ({RR:1.5,R:5,'A-':8,A:10,'A+':12,G:15,GG:18.5,mirror:10}[getGrade(ya,oa,md,y,o)]??10);

// ── STYLE HELPERS ───────────────────────────────────────
const btn=(v='primary')=>({background:v==='primary'?C.redB:v==='amber'?C.amber:'transparent',border:`1px solid ${v==='primary'?C.redB:v==='amber'?C.amber:C.borderBright}`,color:v==='amber'?C.bg:C.text,padding:'10px 28px',cursor:'pointer',fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:16,letterSpacing:3,borderRadius:2,transition:'opacity .15s',userSelect:'none'});
const card={background:C.panel2,border:`1px solid ${C.border}`,borderRadius:2,padding:16};
const secTitle={fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:14,letterSpacing:3,color:C.muted,marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${C.dim}`};
const gradeStyle=g=>({display:'inline-block',padding:'2px 8px',background:GC[g]+'22',border:`1px solid ${GC[g]}`,color:GC[g],fontSize:11,fontWeight:'bold',letterSpacing:1,borderRadius:1,fontFamily:'monospace'});

// ── SUB COMPONENTS ──────────────────────────────────────
const Grade=({g})=><span style={gradeStyle(g)}>{g}</span>;

const ApiErr=({msg,onDismiss})=>msg?(
  <div style={{...card,background:C.red+'1a',border:`1px solid ${C.red}`,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
    <span style={{color:C.red,fontSize:12,fontFamily:"'Share Tech Mono',monospace"}}>⚠ API ERROR: {msg}</span>
    <button onClick={onDismiss} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>✕</button>
  </div>
):null;

const Spinner=({msg='CONSULTING AI...'})=>(
  <div style={{textAlign:'center',padding:'40px 0'}}>
    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:4,color:C.muted,marginBottom:8}}>{msg}</div>
    <div style={{display:'flex',justifyContent:'center',gap:6}}>
      {[0,1,2,3].map(i=><div key={i} style={{width:6,height:6,background:C.redB,borderRadius:'50%',animation:`pulse 1s ease-in-out ${i*.15}s infinite alternate`}}/>)}
    </div>
  </div>
);

const ArmyCard=({army,state='default',onClick,sub})=>{
  const s={default:{border:`1px solid ${C.border}`,bg:C.panel,col:C.text},selected:{border:`1px solid ${C.amber}`,bg:C.amber+'1a',col:C.amber},locked:{border:`1px solid ${C.redB}`,bg:C.redB+'1a',col:C.redB},disabled:{border:`1px solid ${C.dim}`,bg:'transparent',col:C.dim,op:.4}}[state]||{border:`1px solid ${C.border}`,bg:C.panel,col:C.text};
  return(
    <div onClick={state==='disabled'?undefined:onClick}
      style={{background:s.bg,border:s.border,borderRadius:2,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all .15s',cursor:state==='disabled'?'not-allowed':'pointer',marginBottom:6,opacity:s.op||1}}>
      <span style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:16,letterSpacing:2,color:s.col}}>{army}</span>
      {sub&&<span style={{fontSize:11,color:C.muted}}>{sub}</span>}
    </div>
  );
};

const TblCard=({t,state='available',onClick})=>{
  const isL=t==='Light',isH=t==='Heavy';
  const s={available:{border:`1px solid ${isL?'#a8d8ea':isH?'#4a4e69':C.border}`,bg:isL?'#a8d8ea11':isH?'#1a1a2e':C.panel,col:C.text},selected:{border:`1px solid ${C.amber}`,bg:C.amber+'22',col:C.amber},taken:{border:`1px solid ${C.dim}`,bg:'transparent',col:C.dim+'55',op:.35},opponent:{border:`1px solid ${C.red}`,bg:C.red+'11',col:C.red}}[state]||{};
  return(
    <div onClick={state==='available'?onClick:undefined}
      style={{background:s.bg,border:s.border,borderRadius:2,padding:'12px 8px',textAlign:'center',flex:1,margin:'0 4px',cursor:state==='available'?'pointer':'default',opacity:s.op||1,transition:'all .15s'}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:2,color:s.col}}>{isL?'◇':isH?'◆':'◈'}</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:2,color:s.col}}>{t}</div>
      {state==='opponent'&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>OPP</div>}
      {state==='selected'&&<div style={{fontSize:10,color:C.amber,marginTop:2}}>YOURS</div>}
    </div>
  );
};

const Sidebar=({yp,op,tbls,matchups,ya,oa,md})=>(
  <div style={{width:220,background:C.panel,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',overflowY:'auto',flexShrink:0}}>
    {[['YOUR POOL',yp,C.amber],['OPP POOL',op,C.text]].map(([label,pool,col])=>(
      <div key={label} style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
        <div style={secTitle}>{label}</div>
        {pool.map(a=><div key={a} style={{fontSize:12,color:col,padding:'2px 0',fontFamily:"'Share Tech Mono',monospace"}}>{a}</div>)}
      </div>
    ))}
    <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
      <div style={secTitle}>TABLES LEFT</div>
      {tbls.map(t=><div key={t} style={{fontSize:11,color:C.muted,padding:'2px 0'}}>{t==='Light'?'◇':t==='Heavy'?'◆':'◈'} {t}</div>)}
    </div>
    {matchups.length>0&&(
      <div style={{padding:'12px 14px',flex:1}}>
        <div style={secTitle}>LOCKED ({matchups.length}/5)</div>
        {matchups.map((m,i)=>{
          const g=getGrade(ya,oa,md,m.ya,m.oa);
          return(
            <div key={i} style={{marginBottom:8,fontSize:11,padding:'6px 8px',background:C.dim,borderRadius:1}}>
              <div style={{color:C.amber,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1}}>{m.ya}</div>
              <div style={{color:C.muted}}>vs {m.oa}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
                <Grade g={g}/><span style={{color:C.green,fontSize:10}}>{m.ys.toFixed(1)}–{(20-m.ys).toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ── MAIN APP ────────────────────────────────────────────
export default function App(){
  useEffect(()=>{
    const l=document.createElement('link');l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap';
    document.head.appendChild(l);return()=>document.head.removeChild(l);
  },[]);

  const [ya,setYA]=useState(DEF_Y);
  const [oa,setOA]=useState(DEF_O);
  const [md,setMD]=useState(DEF_D.map(r=>[...r]));
  const [aim,setAIM]=useState('B');

  const [phase,setPhase]=useState('setup');
  const [rnd,setRnd]=useState(1);
  const [row,setROW]=useState(null);
  const [dice,setDice]=useState(null);

  const [yp,setYP]=useState([]);
  const [op,setOP]=useState([]);
  const [tbls,setTbls]=useState([...TABLES]);

  const [yd,setYD]=useState(null);
  const [od,setOD]=useState(null);
  const [yAtks,setYAtks]=useState([]);
  const [oAtks,setOAtks]=useState([]);
  const [yTbl,setYTbl]=useState(null);
  const [oTbl,setOTbl]=useState(null);
  const [yPick,setYPick]=useState(null);
  const [oPick,setOPick]=useState(null);

  const [matchups,setMatchups]=useState([]);
  const [scores,setScores]=useState(null);
  const [sel,setSel]=useState(null);
  const [msel,setMsel]=useState([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState(null);

  const mx=()=>buildMxPayload(ya,oa,md);
  const gg=(y,o)=>getGrade(ya,oa,md,y,o);
  const gs=(y,o)=>getScore(ya,oa,md,y,o);
  const ftp=()=>rnd===1?row:(row==='player'?'opponent':'player');

  const wrap=async(fn)=>{setLoading(true);setErr(null);try{return await fn();}catch(e){setErr(e.message);return null;}finally{setLoading(false);}};

  // PHASE HANDLERS
  const startGame=()=>{setYP([...ya]);setOP([...oa]);setTbls([...TABLES]);setMatchups([]);setScores(null);setRnd(1);setPhase('rolloff');setSel(null);};

  const doRolloff=async()=>{
    const res=await wrap(()=>fetch(`${API}/api/rolloff`,{method:'POST'}).then(r=>r.json()));
    if(!res)return;
    setROW(res.winner);setDice({p:res.player_roll,o:res.opp_roll,w:res.winner});setPhase('rolloff_result');
  };

  const lockDef=async()=>{
    const res=await wrap(()=>apiCall('/api/ai/defender',{matrix:mx(),opp_pool:op,your_pool:yp,ai_mode:aim,round_num:rnd}));
    if(!res)return;
    setOD(res.defender);setYD(sel);setSel(null);setPhase('def_reveal');
  };

  const toTable=async()=>{
    const fp=ftp();
    if(fp==='opponent'){
      const res=await wrap(()=>apiCall('/api/ai/table',{opp_defender:od,available_tables:tbls,ai_mode:aim}));
      if(!res)return;
      setOTbl(res.table);
    } else {setOTbl(null);}
    setPhase('table');
  };

  const pickTable=async(t)=>{
    const fp=ftp();
    if(fp==='player'){
      const rem=tbls.filter(x=>x!==t);
      const res=await wrap(()=>apiCall('/api/ai/table',{opp_defender:od,available_tables:rem,ai_mode:aim}));
      if(!res)return;
      setYTbl(t);setOTbl(res.table);setTbls(prev=>prev.filter(x=>x!==t&&x!==res.table));
    } else {
      setYTbl(t);setTbls(prev=>prev.filter(x=>x!==t&&x!==oTbl));
    }
    setPhase('atk_select');setSel(null);setMsel([]);
  };

  const lockAtks=async()=>{
    const res=await wrap(()=>apiCall('/api/ai/attackers',{matrix:mx(),opp_pool:op,your_pool:yp,opp_defender:od,ai_mode:aim,round_num:rnd}));
    if(!res)return;
    setOAtks(res.attackers);setYAtks(msel);setMsel([]);setPhase('atk_reveal');
  };

  const lockPick=async()=>{
    const res=await wrap(()=>apiCall('/api/ai/pick',{matrix:mx(),opp_defender:od,your_attackers:yAtks,ai_mode:aim}));
    if(!res)return;
    setOPick(res.pick);setYPick(sel);setSel(null);setPhase('pick_reveal');
  };

  const confirmRound=()=>{
    const m1={ya:yd,oa:yPick,tbl:yTbl,ys:gs(yd,yPick)};
    const m2={ya:oPick,oa:od,tbl:oTbl,ys:gs(oPick,od)};
    setMatchups(prev=>[...prev,m1,m2]);
    setYP(prev=>prev.filter(a=>a!==yd&&a!==oPick));
    setOP(prev=>prev.filter(a=>a!==od&&a!==yPick));
    setPhase('round_result');
  };

  const nextRound=()=>{
    if(rnd===1){setRnd(2);setYD(null);setOD(null);setYAtks([]);setOAtks([]);setYTbl(null);setOTbl(null);setYPick(null);setOPick(null);setSel(null);setMsel([]);setPhase('def_select');}
    else setPhase('final_refused');
  };

  const confirmFinal=async()=>{
    const fya=yp[0],foa=op[0],ftbl=tbls[0]||'Medium';
    const all=[...matchups,{ya:fya,oa:foa,tbl:ftbl,ys:gs(fya,foa)}];
    setMatchups(all);
    const res=await wrap(()=>apiCall('/api/score',{matrix:mx(),matchups:all.map(m=>({your_army:m.ya,opp_army:m.oa,table:m.tbl}))}));
    if(!res)return;
    setScores(res);setPhase('scoring');
  };

  const toggleAtk=a=>setMsel(prev=>prev.includes(a)?prev.filter(x=>x!==a):prev.length>=2?prev:[...prev,a]);
  const restart=()=>{setPhase('setup');setMatchups([]);setScores(null);setRnd(1);setYP([]);setOP([]);setTbls([...TABLES]);setSel(null);setMsel([]);};

  // ── RENDERERS ──

  const R_setup=()=>(
    <div>
      <h1 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:36,letterSpacing:6,color:C.redB,margin:'0 0 4px'}}>WTC PAIRINGS TRAINER</h1>
      <p style={{color:C.muted,fontSize:13,marginBottom:28,fontFamily:"'Share Tech Mono',monospace"}}>Configure your team matrix and begin the pairing exercise</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        {[[ya,setYA,C.amber,'YOUR TEAM'],[oa,setOA,C.text,'OPPONENT TEAM']].map(([arr,set,col,label])=>(
          <div key={label} style={card}>
            <div style={secTitle}>{label}</div>
            {arr.map((a,i)=>(
              <input key={i} value={a} onChange={e=>{const n=[...arr];n[i]=e.target.value;set(n);}}
                style={{display:'block',background:C.dim,border:`1px solid ${C.border}`,color:col,padding:'6px 10px',fontFamily:"'Share Tech Mono',monospace",fontSize:13,borderRadius:1,width:'100%',boxSizing:'border-box',marginBottom:8}}/>
            ))}
          </div>
        ))}
      </div>
      <div style={{...card,marginBottom:20,overflowX:'auto'}}>
        <div style={secTitle}>MATCHUP MATRIX</div>
        <table style={{borderCollapse:'collapse',fontSize:12}}>
          <thead><tr><th style={{padding:'4px 8px',color:C.muted,fontWeight:'normal'}}></th>
            {oa.map(o=><th key={o} style={{padding:'4px 8px',color:C.text,fontWeight:'normal',fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1}}>{o}</th>)}
          </tr></thead>
          <tbody>{ya.map((a,i)=>(
            <tr key={a}><td style={{padding:'4px 8px',color:C.amber,fontFamily:"'Bebas Neue',sans-serif",fontSize:13,letterSpacing:1,whiteSpace:'nowrap'}}>{a}</td>
              {oa.map((o,j)=>(
                <td key={o} style={{padding:'4px 6px',textAlign:'center'}}>
                  <select value={md[i][j]} onChange={e=>{const n=md.map(r=>[...r]);n[i][j]=e.target.value;setMD(n);}}
                    style={{background:GC[md[i][j]]+'22',border:`1px solid ${GC[md[i][j]]}`,color:GC[md[i][j]],padding:'3px 4px',fontFamily:'monospace',fontSize:11,fontWeight:'bold',borderRadius:1,cursor:'pointer',width:70}}>
                    {GRADES.map(g=><option key={g} value={g} style={{background:C.panel,color:C.text}}>{g}</option>)}
                  </select>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{...card,marginBottom:24}}>
        <div style={secTitle}>OPPONENT AI MODE</div>
        <div style={{display:'flex',gap:10}}>
          {[['A','Random'],['B','Best Outcome'],['C','Pool Shaping (C1)']].map(([v,l])=>(
            <div key={v} onClick={()=>setAIM(v)} style={{flex:1,padding:10,border:`1px solid ${aim===v?C.redB:C.border}`,background:aim===v?C.redB+'1a':C.dim,borderRadius:2,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:aim===v?C.redB:C.muted}}>{v}</div>
              <div style={{fontSize:10,color:aim===v?C.text:C.muted,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <button style={btn('primary')} onClick={startGame}>DEPLOY TO BATTLE ▶</button>
    </div>
  );

  const R_rolloff=()=>(
    <div style={{textAlign:'center',paddingTop:40}}>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:28,letterSpacing:6,color:C.muted,marginBottom:8}}>TABLE PRIORITY ROLL-OFF</div>
      <p style={{color:C.muted,fontSize:13,marginBottom:40,fontFamily:"'Share Tech Mono',monospace"}}>Winner picks table first in Round 1. Order reverses in Round 2.</p>
      {loading?<Spinner msg="ROLLING DICE..."/>:
        <button style={{...btn('primary'),fontSize:22,padding:'16px 48px',letterSpacing:6}} onClick={doRolloff}>ROLL THE DICE</button>}
    </div>
  );

  const R_rolloffResult=()=>(
    <div style={{textAlign:'center',paddingTop:20}}>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:28,letterSpacing:6,color:C.muted,marginBottom:24}}>ROLL RESULT</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:20,alignItems:'center',maxWidth:400,margin:'0 auto 24px'}}>
        {[['YOU',dice?.p,row==='player'?C.amber:C.muted],['',null,null],['OPPONENT',dice?.o,row==='opponent'?C.red:C.muted]].map(([label,val,col],i)=>
          i===1?<div key={i} style={{color:C.dim,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>VS</div>:
          <div key={i} style={{...card,textAlign:'center',border:`1px solid ${col}`}}>
            <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:6}}>{label}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:56,letterSpacing:4,color:col}}>{val}</div>
          </div>
        )}
      </div>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:22,letterSpacing:4,color:row==='player'?C.amber:C.red,marginBottom:24}}>
        {row==='player'?'🏆 YOU WIN THE ROLLOFF':'⚔ OPPONENT WINS THE ROLLOFF'}
      </div>
      <button style={btn('amber')} onClick={()=>setPhase('def_select')}>BEGIN ROUND 1 →</button>
    </div>
  );

  const R_defSelect=()=>(
    <div>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.amber,marginBottom:4}}>ROUND {rnd} — SELECT DEFENDER</div>
      <p style={{color:C.muted,fontSize:12,marginBottom:24,fontFamily:"'Share Tech Mono',monospace"}}>Pick your defender. They get a table pick and choose their matchup from 2 opponents.</p>
      {loading?<Spinner/>:(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div style={card}>
            <div style={secTitle}>YOUR ARMY — SECRET</div>
            {yp.map(a=><ArmyCard key={a} army={a} state={sel===a?'selected':'default'} onClick={()=>setSel(a)} sub={sel===a?'SELECTED':''}/>)}
            <button style={{...btn('primary'),opacity:sel?1:.4,cursor:sel?'pointer':'default',width:'100%',marginTop:16}} onClick={sel?lockDef:undefined}>
              {sel?'LOCK IN DEFENDER':'SELECT AN ARMY'}
            </button>
          </div>
          <div style={{...card,opacity:.6}}>
            <div style={secTitle}>OPPONENT — CLASSIFIED</div>
            <div style={{textAlign:'center',paddingTop:30,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:3,fontSize:16}}>■ ■ ■ ■ ■ ■ ■ ■<div style={{fontSize:12,marginTop:8}}>AWAITING YOUR MOVE</div></div>
          </div>
        </div>
      )}
    </div>
  );

  const R_defReveal=()=>{
    const g=gg(yd,od);
    return(
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.redB,marginBottom:20}}>ROUND {rnd} — DEFENDERS REVEALED</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center',marginBottom:24}}>
          <div style={{...card,border:`1px solid ${C.amber}`,textAlign:'center'}}>
            <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:6}}>YOUR DEFENDER</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:4,color:C.amber}}>{yd}</div>
          </div>
          <div style={{textAlign:'center',color:C.muted,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,fontSize:14}}>VS</div>
          <div style={{...card,border:`1px solid ${C.red}`,textAlign:'center'}}>
            <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:6}}>OPPONENT DEFENDER</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:4,color:C.red}}>{od}</div>
          </div>
        </div>
        <div style={{...card,marginBottom:20}}>
          <div style={secTitle}>DEFENDER PREVIEW</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:C.amber,fontFamily:"'Share Tech Mono',monospace"}}>{yd} vs {od}</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}><Grade g={g}/><span style={{color:C.muted,fontSize:12}}>{gs(yd,od).toFixed(1)} pts</span></div>
          </div>
          <p style={{color:C.muted,fontSize:11,marginTop:8}}>Defenders do not face each other — each picks an attacker from the opposing team.</p>
        </div>
        <div style={{...card,background:C.dim,marginBottom:20}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>TABLE PICK ORDER — ROUND {rnd}</div>
          <div style={{color:C.text,fontSize:13,fontFamily:"'Share Tech Mono',monospace"}}>
            {ftp()==='player'?<><span style={{color:C.amber}}>YOU</span> pick first</>:<><span style={{color:C.red}}>OPPONENT</span> picks first</>}
          </div>
        </div>
        {loading?<Spinner msg="AI SELECTING TABLE..."/>:<button style={btn('amber')} onClick={toTable}>PROCEED TO TABLE PICKS →</button>}
      </div>
    );
  };

  const R_table=()=>{
    const fp=ftp();
    const avail=fp==='opponent'?tbls.filter(t=>t!==oTbl):tbls;
    return(
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.amber,marginBottom:4}}>ROUND {rnd} — TABLE SELECTION</div>
        {fp==='opponent'&&<div style={{...card,background:C.red+'0d',border:`1px solid ${C.red}`,marginBottom:16}}><span style={{color:C.red,fontSize:12}}>OPPONENT ({od}) selected: <strong style={{color:C.redB}}>{oTbl}</strong></span></div>}
        <p style={{color:C.muted,fontSize:12,marginBottom:20}}>{fp==='player'?`Your defender (${yd}) picks first.`:`Pick from the remaining tables.`}</p>
        {loading?<Spinner msg="AI SELECTING TABLE..."/>:(
          <div style={{display:'flex',marginBottom:24}}>
            {TABLES.map(t=><TblCard key={t} t={t} state={t===oTbl?'opponent':avail.includes(t)?'available':'taken'} onClick={()=>pickTable(t)}/>)}
          </div>
        )}
      </div>
    );
  };

  const R_atkSelect=()=>{
    const avail=yp.filter(a=>a!==yd);
    return(
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.amber,marginBottom:4}}>ROUND {rnd} — SELECT ATTACKERS</div>
        <div style={{...card,background:C.dim,marginBottom:16,fontSize:12,color:C.muted,fontFamily:"'Share Tech Mono',monospace",display:'flex',justifyContent:'space-between'}}>
          <span>Your: <span style={{color:C.amber}}>{yd}</span> → {yTbl}</span>
          <span>Opp: <span style={{color:C.red}}>{od}</span> → {oTbl}</span>
        </div>
        <p style={{color:C.muted,fontSize:12,marginBottom:20}}>Select 2 attackers vs opponent defender ({od}). They pick one.</p>
        {loading?<Spinner/>:(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div style={card}>
              <div style={secTitle}>SELECT 2 ATTACKERS ({msel.length}/2)</div>
              {avail.map(a=>{
                const g=gg(a,od);
                return(
                  <div key={a} onClick={()=>toggleAtk(a)}
                    style={{background:msel.includes(a)?C.amber+'1a':C.dim,border:`1px solid ${msel.includes(a)?C.amber:C.border}`,borderRadius:2,padding:'10px 14px',cursor:'pointer',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all .15s'}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:msel.includes(a)?C.amber:C.text}}>{a}</span>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}><Grade g={g}/><span style={{fontSize:11,color:C.muted}}>{gs(a,od).toFixed(1)}</span></div>
                  </div>
                );
              })}
              <button style={{...btn('primary'),opacity:msel.length===2?1:.4,cursor:msel.length===2?'pointer':'default',width:'100%',marginTop:16}}
                onClick={msel.length===2?lockAtks:undefined}>{msel.length===2?'LOCK IN ATTACKERS':'SELECT 2 ARMIES'}</button>
            </div>
            <div style={{...card,opacity:.5}}>
              <div style={secTitle}>OPPONENT — CLASSIFIED</div>
              <div style={{textAlign:'center',paddingTop:40,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:3,fontSize:14}}>■ ■ ■ ■ ■ ■<br/>SELECTING ATTACKERS</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const R_atkReveal=()=>(
    <div>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.redB,marginBottom:20}}>ROUND {rnd} — ATTACKERS REVEALED</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        {[[yAtks,od,C.amber,'YOUR ATTACKERS'],[oAtks,yd,C.red,'OPP ATTACKERS']].map(([atks,def,col,label])=>(
          <div key={label} style={{...card,border:`1px solid ${col}`}}>
            <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:10}}>{label} vs {def}</div>
            {atks.map(a=>{
              const isYours=label.startsWith('YOUR');
              const g=isYours?gg(a,def):gg(def,a);
              const sc=isYours?gs(a,def):gs(def,a);
              return(
                <div key={a} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'8px 12px',background:C.dim,borderRadius:1}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:col}}>{a}</span>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}><Grade g={g}/><span style={{fontSize:11,color:C.muted}}>{sc.toFixed(1)} pts</span></div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <button style={btn('amber')} onClick={()=>{setSel(null);setPhase('pick_select');}}>PROCEED TO DEFENDER PICKS →</button>
    </div>
  );

  const R_pickSelect=()=>(
    <div>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.amber,marginBottom:4}}>ROUND {rnd} — DEFENDER PICKS</div>
      <p style={{color:C.muted,fontSize:12,marginBottom:20}}>Your defender ({yd}) secretly picks which opponent attacker to face.</p>
      {loading?<Spinner msg="AI MAKING SELECTION..."/>:(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div style={card}>
            <div style={secTitle}>YOUR DEFENDER: {yd}</div>
            {oAtks.map(a=>{
              const g=gg(yd,a);const[lo,hi]=GRADE_RANGES[g]||[0,20];
              return(
                <div key={a} onClick={()=>setSel(a)}
                  style={{background:sel===a?C.amber+'1a':C.dim,border:`1px solid ${sel===a?C.amber:C.border}`,borderRadius:2,padding:'12px 14px',cursor:'pointer',marginBottom:8,transition:'all .15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:sel===a?C.amber:C.text}}>{a}</span>
                    <Grade g={g}/>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:4}}>{gs(yd,a).toFixed(1)} pts · range {lo}–{hi}</div>
                </div>
              );
            })}
            <button style={{...btn('primary'),opacity:sel?1:.4,cursor:sel?'pointer':'default',width:'100%',marginTop:8}}
              onClick={sel?lockPick:undefined}>{sel?`FACE ${sel}`:'SELECT AN ATTACKER'}</button>
          </div>
          <div style={{...card,opacity:.5}}>
            <div style={secTitle}>OPPONENT DEFENDER: {od}</div>
            <div style={{textAlign:'center',paddingTop:40,color:C.muted,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:3,fontSize:14}}>■ ■ ■ ■ ■ ■<br/>MAKING SELECTION</div>
          </div>
        </div>
      )}
    </div>
  );

  const R_pickReveal=()=>{
    const yRef=oAtks.find(a=>a!==yPick),oRef=yAtks.find(a=>a!==oPick);
    return(
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,letterSpacing:5,color:C.redB,marginBottom:20}}>ROUND {rnd} — PICKS REVEALED</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          {[[yd,yPick,yRef,C.amber,'YOUR DEFENDER CHOSE'],[oPick,od,oRef,C.red,'OPP DEFENDER CHOSE']].map(([def,pick,ref,col,label],i)=>(
            <div key={i} style={{...card,border:`1px solid ${col}`}}>
              <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:8}}>{label}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:3,color:col,marginBottom:4}}>{pick}</div>
              <Grade g={i===0?gg(def,pick):gg(pick,def)}/>
              <span style={{fontSize:11,color:C.muted,marginLeft:8}}>{i===0?gs(def,pick).toFixed(1):gs(pick,def).toFixed(1)} pts</span>
              <div style={{marginTop:8,fontSize:11,color:C.muted}}>Refused: <span style={{color:i===0?C.red:C.amber}}>{ref}</span> → pool</div>
            </div>
          ))}
        </div>
        <div style={{...card,background:C.dim,marginBottom:20}}>
          <div style={secTitle}>ROUND {rnd} LOCKED</div>
          <div style={{display:'flex',gap:16}}>
            {[{ya:yd,oa:yPick,tbl:yTbl},{ya:oPick,oa:od,tbl:oTbl}].map((m,i)=>(
              <div key={i} style={{flex:1,padding:10,background:C.panel,borderRadius:1,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>MATCHUP {i+1}</div>
                <span style={{color:C.amber}}>{m.ya}</span><span style={{color:C.muted,margin:'0 6px'}}>vs</span><span style={{color:C.text}}>{m.oa}</span>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>{m.tbl} · <Grade g={gg(m.ya,m.oa)}/></div>
              </div>
            ))}
          </div>
        </div>
        <button style={btn('primary')} onClick={confirmRound}>CONFIRM & CONTINUE →</button>
      </div>
    );
  };

  const R_roundResult=()=>(
    <div>
      <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:28,letterSpacing:5,color:C.amber,marginBottom:16}}>ROUND {rnd} COMPLETE</div>
      <div style={{...card,background:C.dim,marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontFamily:"'Share Tech Mono',monospace",marginBottom:8}}>
          <span style={{color:C.muted}}>Your pool:</span><span style={{color:C.amber}}>{yp.join(' · ')}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontFamily:"'Share Tech Mono',monospace"}}>
          <span style={{color:C.muted}}>Opp pool:</span><span style={{color:C.text}}>{op.join(' · ')}</span>
        </div>
      </div>
      <button style={btn('primary')} onClick={nextRound}>{rnd===1?'BEGIN ROUND 2 →':'FINAL REFUSED MATCHUP →'}</button>
    </div>
  );

  const R_finalRefused=()=>{
    const fya=yp[0],foa=op[0],ftbl=tbls[0]||'Medium',g=gg(fya,foa);
    return(
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:28,letterSpacing:5,color:C.purple,marginBottom:20}}>FINAL REFUSED MATCHUP</div>
        <div style={{...card,border:`1px solid ${C.purple}`,marginBottom:24,textAlign:'center',padding:32}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:4,color:C.amber}}>{fya}</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:4,color:C.muted,margin:'8px 0'}}>VS</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:4,color:C.text}}>{foa}</div>
          <div style={{marginTop:12,display:'flex',justifyContent:'center',gap:12,alignItems:'center'}}>
            <Grade g={g}/><span style={{color:C.muted,fontSize:12}}>Table: {ftbl}</span>
            <span style={{color:C.green,fontSize:12}}>{gs(fya,foa).toFixed(1)} pts predicted</span>
          </div>
        </div>
        {loading?<Spinner msg="CALCULATING SCORES..."/>:
          <button style={btn('primary')} onClick={confirmFinal}>LOCK IN & VIEW FINAL SCORE →</button>}
      </div>
    );
  };

  const R_scoring=()=>{
    if(!scores)return<Spinner msg="LOADING SCORES..."/>;
    const{matchups:sc,your_total:yt,opp_total:ot,winner:w}=scores;
    return(
      <div>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:32,letterSpacing:6,color:w==='player'?C.green:w==='draw'?C.amber:C.red,marginBottom:4}}>
          {w==='player'?'VICTORY':w==='draw'?'DRAW':'DEFEAT'} — FINAL SCORE
        </div>
        <div style={{...card,background:w==='player'?C.green+'0d':w==='draw'?C.amber+'0d':C.red+'0d',border:`1px solid ${w==='player'?C.green:w==='draw'?C.amber:C.red}`,marginBottom:20,textAlign:'center',padding:20}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:48,letterSpacing:4}}>
            <span style={{color:C.amber}}>{yt.toFixed(1)}</span>
            <span style={{color:C.muted,margin:'0 12px'}}>—</span>
            <span style={{color:C.text}}>{ot.toFixed(1)}</span>
          </div>
          <div style={{fontSize:12,color:C.muted}}>YOU vs OPPONENT</div>
        </div>
        <div style={card}>
          <div style={secTitle}>ALL 5 MATCHUPS</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:`1px solid ${C.dim}`}}>
              {['Your Army','','Opp Army','Table','Grade','Your Pts','Opp Pts'].map((h,i)=>(
                <th key={i} style={{padding:'6px 8px',color:C.muted,fontWeight:'normal',textAlign:i>=5?'right':'left',fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{sc.map((m,i)=>{
              const[lo,hi]=GRADE_RANGES[m.grade]||[0,20];
              return(
                <tr key={i} style={{borderBottom:`1px solid ${C.dim}`}}>
                  <td style={{padding:'8px',color:C.amber,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1}}>{m.your_army}</td>
                  <td style={{padding:'8px',color:C.dim,textAlign:'center'}}>◆</td>
                  <td style={{padding:'8px',color:C.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,letterSpacing:1}}>{m.opp_army}</td>
                  <td style={{padding:'8px',color:C.muted,fontSize:11}}>{m.table}</td>
                  <td style={{padding:'8px'}}><Grade g={m.grade}/><span style={{color:C.dim,fontSize:10,marginLeft:4}}>{lo}-{hi}</span></td>
                  <td style={{padding:'8px',textAlign:'right',color:C.green,fontFamily:'monospace'}}>{m.your_score.toFixed(1)}</td>
                  <td style={{padding:'8px',textAlign:'right',color:C.red,fontFamily:'monospace'}}>{m.opp_score.toFixed(1)}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{borderTop:`2px solid ${C.border}`}}>
              <td colSpan={5} style={{padding:'8px',color:C.muted,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2}}>TOTAL</td>
              <td style={{padding:'8px',textAlign:'right',color:C.green,fontFamily:'monospace',fontWeight:'bold',fontSize:14}}>{yt.toFixed(1)}</td>
              <td style={{padding:'8px',textAlign:'right',color:C.red,fontFamily:'monospace',fontWeight:'bold',fontSize:14}}>{ot.toFixed(1)}</td>
            </tr></tfoot>
          </table>
        </div>
        <div style={{marginTop:20,display:'flex',gap:12}}>
          <button style={btn('primary')} onClick={restart}>NEW GAME</button>
          <button style={btn()} onClick={()=>setPhase('setup')}>EDIT MATRIX</button>
        </div>
      </div>
    );
  };

  // ── LAYOUT ──
  const isGame=!['setup','rolloff','rolloff_result','scoring'].includes(phase);
  const phaseLabel={def_select:`R${rnd}: SELECT DEFENDER`,def_reveal:`R${rnd}: DEFENDERS REVEALED`,table:`R${rnd}: TABLE SELECTION`,atk_select:`R${rnd}: SELECT ATTACKERS`,atk_reveal:`R${rnd}: ATTACKERS REVEALED`,pick_select:`R${rnd}: DEFENDER PICKS`,pick_reveal:`R${rnd}: PICKS REVEALED`,round_result:`R${rnd}: ROUND RESULT`,final_refused:'FINAL MATCHUP',scoring:'FINAL SCORE',rolloff:'ROLL-OFF',rolloff_result:'ROLL-OFF RESULT',setup:'SETUP'}[phase]||phase.toUpperCase();

  return(
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:"'Share Tech Mono','Courier New',monospace",display:'flex',flexDirection:'column'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border}}@keyframes pulse{from{opacity:.3}to{opacity:1}}`}</style>
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:'0 24px',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:22,letterSpacing:5,color:C.redB}}>WTC PAIRINGS TRAINER</div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {isGame&&<span style={{fontSize:11,color:C.amber,letterSpacing:2}}>ROUND {rnd}/2</span>}
          <span style={{fontSize:11,color:C.muted,letterSpacing:2,background:C.dim,padding:'3px 10px',borderRadius:1}}>{phaseLabel}</span>
          <span style={{fontSize:10,color:C.muted}}>AI: {aim} · <span style={{color:err?C.red:C.green}}>{err?'ERR':'OK'}</span></span>
        </div>
      </div>
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {isGame&&<Sidebar yp={yp} op={op} tbls={tbls} matchups={matchups} ya={ya} oa={oa} md={md}/>}
        <div style={{flex:1,overflowY:'auto',padding:28}}>
          <ApiErr msg={err} onDismiss={()=>setErr(null)}/>
          {phase==='setup'&&R_setup()}
          {phase==='rolloff'&&R_rolloff()}
          {phase==='rolloff_result'&&R_rolloffResult()}
          {phase==='def_select'&&R_defSelect()}
          {phase==='def_reveal'&&R_defReveal()}
          {phase==='table'&&R_table()}
          {phase==='atk_select'&&R_atkSelect()}
          {phase==='atk_reveal'&&R_atkReveal()}
          {phase==='pick_select'&&R_pickSelect()}
          {phase==='pick_reveal'&&R_pickReveal()}
          {phase==='round_result'&&R_roundResult()}
          {phase==='final_refused'&&R_finalRefused()}
          {phase==='scoring'&&R_scoring()}
        </div>
      </div>
    </div>
  );
}
