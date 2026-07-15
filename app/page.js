'use client';
import { useEffect, useMemo, useState } from 'react';

const modules = [
  ['Projects','Active vessels & jobs','🚢'],
  ['Quotations','Create and approve offers','📄'],
  ['Service Reports','Inspection & repair reports','📋'],
  ['Documents','Drawings, WPS, WPQR & files','📁'],
  ['Drone','Inspection images & findings','📷'],
  ['Workshop','Tasks, people & planning','⚙️'],
  ['Packing Lists','PO-based packing lists','📦'],
  ['Finance','KPIs, margin & forecast','📊'],
  ['FSQ AI','Ask Right Hand anything','🤖']
];

function speakWelcome(name) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const lines = [
    `${greeting}, ${name}.`,
    'FSQ Right Hand is now online.',
    'All systems operational.',
    'You have six active projects.',
    'Two quotations require your attention.',
    'Jakob is currently working on Wind Orca.',
    'How can I assist you today?'
  ];
  const msg = new SpeechSynthesisUtterance(lines.join(' '));
  msg.lang = 'en-GB';
  msg.rate = 0.88;
  msg.pitch = 0.82;
  window.speechSynthesis.speak(msg);
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState('Flemming');
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState('Dashboard');
  const [projects, setProjects] = useState([
    {name:'Wind Orca', status:'In progress', owner:'Jakob', due:'18 Jul'},
    {name:'Wind Osprey', status:'Planning', owner:'Flemming', due:'22 Jul'},
    {name:'TORM Splendid', status:'Awaiting customer', owner:'Flemming', due:'25 Jul'}
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('fsq-projects');
    if (saved) setProjects(JSON.parse(saved));
  }, []);
  useEffect(() => { localStorage.setItem('fsq-projects', JSON.stringify(projects)); }, [projects]);

  const statusText = useMemo(() => `${projects.length} projects loaded`, [projects.length]);

  function login(e) {
    e.preventDefault();
    setLoggedIn(true);
    setTimeout(() => { if (!muted) speakWelcome(user); }, 500);
  }

  if (!loggedIn) return (
    <main className="loginShell">
      <div className="scanline" />
      <section className="loginCard">
        <div className="orb"><span>FSQ</span></div>
        <h1>FSQ RIGHT HAND</h1>
        <p className="sub">YOUR AI ASSISTANT</p>
        <form onSubmit={login}>
          <label>User</label>
          <select value={user} onChange={e=>setUser(e.target.value)}>
            <option>Flemming</option><option>Jakob</option>
          </select>
          <label>Password</label>
          <input type="password" defaultValue="fsq2027" />
          <button type="submit">INITIALIZE SYSTEM</button>
        </form>
        <button className="mute" onClick={()=>setMuted(!muted)}>{muted ? '🔇 Voice off' : '🔊 Voice on'}</button>
      </section>
    </main>
  );

  return (
    <main className="appShell">
      <header>
        <div><strong>FSQ RIGHT HAND</strong><span>CONTROL CENTER</span></div>
        <div className="system">● ONLINE · {statusText}</div>
        <div className="user">{user} · <button onClick={()=>setLoggedIn(false)}>Log out</button></div>
      </header>

      <aside>
        <button className={active==='Dashboard'?'active':''} onClick={()=>setActive('Dashboard')}>◉ Dashboard</button>
        {modules.map(([name],i)=><button key={name} className={active===name?'active':''} onClick={()=>setActive(name)}>{modules[i][2]} {name}</button>)}
      </aside>

      <section className="content">
        <div className="hero">
          <div className="core"><div className="ring r1"/><div className="ring r2"/><div className="ring r3"/><span>FSQ</span><small>RIGHT HAND</small></div>
          <div><p className="eyebrow">ALL SYSTEMS OPERATIONAL</p><h2>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {user}</h2><p>Welcome to your FSQ digital control center.</p><button onClick={()=>!muted&&speakWelcome(user)}>Replay welcome</button></div>
        </div>

        {active==='Dashboard' ? <>
          <div className="stats"><article><b>6</b><span>Active projects</span></article><article><b>2</b><span>Quotes pending</span></article><article><b>3</b><span>Reports open</span></article><article><b>1</b><span>Critical task</span></article></div>
          <div className="grid">
            {modules.map(([name,desc,icon])=><article className="module" key={name} onClick={()=>setActive(name)}><div className="icon">{icon}</div><h3>{name}</h3><p>{desc}</p><span>OPEN MODULE →</span></article>)}
          </div>
        </> : <ModuleView active={active} projects={projects} setProjects={setProjects} />}
      </section>
    </main>
  );
}

function ModuleView({active, projects, setProjects}) {
  const [name,setName]=useState('');
  if(active==='Projects') return <div className="panel"><div className="panelHead"><div><p className="eyebrow">MODULE</p><h2>Projects</h2></div><form onSubmit={e=>{e.preventDefault(); if(name.trim()){setProjects([...projects,{name:name.trim(),status:'New',owner:'Flemming',due:'TBD'}]);setName('')}}}><input placeholder="New project name" value={name} onChange={e=>setName(e.target.value)}/><button>Add project</button></form></div><div className="table">{projects.map((p,i)=><div className="row" key={i}><b>{p.name}</b><span>{p.status}</span><span>{p.owner}</span><span>{p.due}</span><button onClick={()=>setProjects(projects.filter((_,x)=>x!==i))}>Delete</button></div>)}</div></div>;
  return <div className="panel"><p className="eyebrow">MODULE</p><h2>{active}</h2><p>This operational module is included in the V1 interface and ready for Azure-backed data wiring.</p><div className="placeholder">FSQ Right Hand · {active}<br/><small>Database, shared files and permissions will activate when Azure resources are connected.</small></div></div>
}
