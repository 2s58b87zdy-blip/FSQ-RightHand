'use client';

import { useEffect, useMemo, useState } from 'react';

const USERS = {
  Flemming: { role: 'Administrator', password: 'fsq2027' },
  Jakob: { role: 'Project Manager', password: 'fsq2027' }
};

const NAV = [
  ['dashboard', 'Dashboard', '◈'],
  ['workshop', 'Workshop', '⚙'],
  ['projects', 'Marine Projects', '◫'],
  ['quotes', 'Quotations', '▤'],
  ['reports', 'Service Reports', '▧'],
  ['documents', 'Documents', '▱'],
  ['drone', 'Drone', '⌁'],
  ['warehouse', 'Warehouse', '▦'],
  ['finance', 'Finance', '◒'],
  ['ai', 'AI Assistant', '◎'],
  ['admin', 'Administration', '⚙']
];

const DEFAULT_PROJECTS = [
  { id: 1, name: 'Wind Orca', customer: 'Cadeler', status: 'Active', progress: 68, lead: 'Jakob' },
  { id: 2, name: 'Wind Osprey', customer: 'Cadeler', status: 'Planning', progress: 42, lead: 'Flemming' },
  { id: 3, name: 'TORM Splendid', customer: 'TORM', status: 'Inspection', progress: 27, lead: 'Jakob' }
];

const DEFAULT_QUOTES = [
  { id: 1, customer: 'Cadeler', project: 'Wind Osprey', value: 420000, status: 'Draft' },
  { id: 2, customer: 'TORM', project: 'TORM Splendid', value: 185000, status: 'Sent' }
];

const DEFAULT_REPORTS = [
  { id: 1, vessel: 'Wind Ally', title: 'Gripper hydraulic cylinder inspection', status: 'Review' },
  { id: 2, vessel: 'Wind Orca', title: 'BWTS pipe removal report', status: 'Draft' }
];

const DEFAULT_TASKS = [
  { id: 1, title: 'Klargør svejserobot til SMO', person: 'Jakob', priority: 'High', status: 'In progress' },
  { id: 2, title: 'Skær sidste pinde og pak på paller', person: 'Tommy', priority: 'Normal', status: 'Open' },
  { id: 3, title: 'Rengør plasmaskærer og skærebord', person: 'Anders', priority: 'Normal', status: 'Open' },
  { id: 4, title: 'Drej pumpeemne på drejebænk', person: 'Jakob', priority: 'High', status: 'Open' }
];

function speak(text, enabled) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.92;
  utterance.pitch = 0.88;
  window.speechSynthesis.speak(utterance);
}

function Login({ onLogin }) {
  const [user, setUser] = useState('Flemming');
  const [password, setPassword] = useState('fsq2027');
  const [voice, setVoice] = useState(true);
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (USERS[user]?.password !== password) {
      setError('Forkert adgangskode');
      return;
    }
    const greeting = `Good morning, ${user}. FSQ Right Hand is now online. All systems operational. How can I assist you today?`;
    speak(greeting, voice);
    onLogin({ name: user, role: USERS[user].role, voice });
  }

  return (
    <main className="loginShell">
      <div className="gridGlow" />
      <section className="loginPanel">
        <div className="brandRow"><span className="brandMark">FSQ</span><span>RIGHT HAND</span></div>
        <div className="core"><div className="coreRing r1"/><div className="coreRing r2"/><div className="coreDot"/></div>
        <p className="eyebrow">MARITIME · INDUSTRIAL · WORKSHOP</p>
        <h1>Your digital right hand</h1>
        <p className="muted">Secure operations dashboard for FSQ.</p>
        <form onSubmit={submit} className="loginForm">
          <label>User<select value={user} onChange={e => setUser(e.target.value)}>{Object.keys(USERS).map(u => <option key={u}>{u}</option>)}</select></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="voiceToggle"><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Voice greeting</label>
          {error && <div className="error">{error}</div>}
          <button className="primaryBtn">INITIALIZE SYSTEM</button>
        </form>
        <div className="systemLine"><span/> Azure online <span/> GitHub connected <span/> Database pending</div>
      </section>
    </main>
  );
}

function AppShell({ session, onLogout }) {
  const [active, setActive] = useState('dashboard');
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [quotes, setQuotes] = useState(DEFAULT_QUOTES);
  const [reports, setReports] = useState(DEFAULT_REPORTS);
  const [chat, setChat] = useState([{ from: 'ai', text: `Good morning ${session.name}. Workshop and marine systems are ready.` }]);
  const [voice, setVoice] = useState(session.voice);

  useEffect(() => {
    const savedProjects = localStorage.getItem('fsq-v2-projects');
    const savedTasks = localStorage.getItem('fsq-v2-tasks');
    const savedQuotes = localStorage.getItem('fsq-v3-quotes');
    const savedReports = localStorage.getItem('fsq-v3-reports');
    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
    if (savedReports) setReports(JSON.parse(savedReports));
  }, []);
  useEffect(() => localStorage.setItem('fsq-v2-projects', JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem('fsq-v2-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('fsq-v3-quotes', JSON.stringify(quotes)), [quotes]);
  useEffect(() => localStorage.setItem('fsq-v3-reports', JSON.stringify(reports)), [reports]);

  const stats = useMemo(() => ({
    projects: projects.length,
    openTasks: tasks.filter(t => t.status !== 'Completed').length,
    urgent: tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length,
    workshopLoad: 74,
    quoteValue: quotes.reduce((sum, q) => sum + Number(q.value || 0), 0),
    reportsOpen: reports.filter(r => r.status !== 'Completed').length
  }), [projects, tasks, quotes, reports]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="logo"><b>FSQ</b><span>RIGHT HAND</span></div>
        <div className="online"><i/> ALL SYSTEMS OPERATIONAL</div>
        <nav>{NAV.map(([id, label, icon]) => <button key={id} onClick={() => setActive(id)} className={active === id ? 'active' : ''}><span>{icon}</span>{label}</button>)}</nav>
        <div className="userCard"><div className="avatar">{session.name[0]}</div><div><b>{session.name}</b><small>{session.role}</small></div><button onClick={onLogout}>↗</button></div>
      </aside>
      <main className="workspace">
        <header className="topbar"><div><p className="eyebrow">FSQ OPERATIONS CONTROL</p><h2>{NAV.find(n => n[0] === active)?.[1]}</h2></div><div className="topActions"><label><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Voice</label><span className="clock">{new Date().toLocaleDateString('da-DK')}</span></div></header>
        {active === 'dashboard' && <Dashboard session={session} stats={stats} projects={projects} tasks={tasks} setActive={setActive} />}
        {active === 'workshop' && <Workshop tasks={tasks} setTasks={setTasks} />}
        {active === 'projects' && <Projects projects={projects} setProjects={setProjects} />}
        {active === 'quotes' && <Quotes quotes={quotes} setQuotes={setQuotes} />}
        {active === 'reports' && <Reports reports={reports} setReports={setReports} />}
        {active === 'ai' && <AI chat={chat} setChat={setChat} voice={voice} />}
        {!['dashboard','workshop','projects','quotes','reports','ai'].includes(active) && <ModulePlaceholder title={NAV.find(n=>n[0]===active)?.[1]} />}
      </main>
    </div>
  );
}

function Dashboard({ session, stats, projects, tasks, setActive }) {
  return <div className="content">
    <section className="hero"><div><p className="eyebrow">GOOD MORNING, {session.name.toUpperCase()}</p><h1>FSQ Right Hand is online.</h1><p>Marine projects, workshop production and documentation in one control centre.</p></div><div className="heroCore"><div className="pulse"/><span>74%</span><small>WORKSHOP LOAD</small></div></section>
    <section className="statGrid">
      <Stat label="Active projects" value={stats.projects} delta="+1 this month" />
      <Stat label="Open workshop tasks" value={stats.openTasks} delta={`${stats.urgent} high priority`} />
      <Stat label="Quotation pipeline" value={`DKK ${Math.round(stats.quoteValue/1000)}k`} delta="2 active quotations" />
      <Stat label="Reports to finalize" value={stats.reportsOpen} delta="Review before customer issue" />
    </section>
    <section className="quickActions"><button onClick={()=>setActive('workshop')}>+ Workshop task</button><button onClick={()=>setActive('projects')}>+ Marine project</button><button onClick={()=>setActive('quotes')}>+ Quotation</button><button onClick={()=>setActive('reports')}>+ Service report</button></section>
    <section className="twoCol">
      <div className="panel"><div className="panelHead"><h3>Marine projects</h3><button onClick={()=>setActive('projects')}>View all</button></div>{projects.map(p=><div className="projectRow" key={p.id}><div><b>{p.name}</b><small>{p.customer} · Lead: {p.lead}</small></div><div className="progress"><span style={{width:`${p.progress}%`}}/></div><em>{p.progress}%</em></div>)}</div>
      <div className="panel"><div className="panelHead"><h3>Workshop priorities</h3><button onClick={()=>setActive('workshop')}>Open board</button></div>{tasks.slice(0,4).map(t=><div className="taskMini" key={t.id}><span className={t.priority==='High'?'dot danger':'dot'}/><div><b>{t.title}</b><small>{t.person} · {t.status}</small></div></div>)}</div>
    </section>
  </div>
}
function Stat({label,value,delta}) { return <div className="stat"><small>{label}</small><strong>{value}</strong><span>{delta}</span></div> }

function Workshop({ tasks, setTasks }) {
  const [title,setTitle]=useState(''); const [person,setPerson]=useState('Tommy');
  function add(){ if(!title.trim())return; setTasks([...tasks,{id:Date.now(),title,person,priority:'Normal',status:'Open'}]); setTitle(''); }
  function cycle(id){ setTasks(tasks.map(t=>t.id===id?{...t,status:t.status==='Open'?'In progress':t.status==='In progress'?'Completed':'Open'}:t)); }
  return <div className="content"><div className="sectionIntro"><h1>Workshop control board</h1><p>Live production status, people and machine overview.</p></div>
    <div className="machineStrip"><Machine name="Welding robot" status="Running"/><Machine name="Plasma cutter" status="Ready"/><Machine name="Lathe" status="Running"/><Machine name="Press brake" status="Ready"/><Machine name="Crane 2" status="Service" bad/></div>
    <div className="panel addBar"><input placeholder="New workshop task" value={title} onChange={e=>setTitle(e.target.value)}/><select value={person} onChange={e=>setPerson(e.target.value)}>{['Tommy','Jakob','Anders','Magnus','Stefan','Kim'].map(x=><option key={x}>{x}</option>)}</select><button onClick={add}>Add task</button></div>
    <div className="kanban"><TaskColumn title="Open" tasks={tasks.filter(t=>t.status==='Open')} cycle={cycle}/><TaskColumn title="In progress" tasks={tasks.filter(t=>t.status==='In progress')} cycle={cycle}/><TaskColumn title="Completed" tasks={tasks.filter(t=>t.status==='Completed')} cycle={cycle}/></div>
  </div>
}
function Machine({name,status,bad}) { return <div className="machine"><i className={bad?'bad':''}/><div><b>{name}</b><small>{status}</small></div></div> }
function TaskColumn({title,tasks,cycle}) { return <div className="column"><h3>{title}<span>{tasks.length}</span></h3>{tasks.map(t=><button className="taskCard" key={t.id} onClick={()=>cycle(t.id)}><small>{t.priority}</small><b>{t.title}</b><span>{t.person}</span></button>)}</div> }

function Projects({projects,setProjects}) {
  const [name,setName]=useState(''); const [customer,setCustomer]=useState('');
  function add(){if(!name.trim())return;setProjects([...projects,{id:Date.now(),name,customer:customer||'Unassigned',status:'Planning',progress:5,lead:'Flemming'}]);setName('');setCustomer('')}
  return <div className="content"><div className="sectionIntro"><h1>Marine projects</h1><p>Shared project overview for vessels, repairs and inspections.</p></div><div className="panel addBar"><input placeholder="Project or vessel name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Customer" value={customer} onChange={e=>setCustomer(e.target.value)}/><button onClick={add}>Create project</button></div><div className="projectCards">{projects.map(p=><article key={p.id}><div className="projectBadge">{p.status}</div><h3>{p.name}</h3><p>{p.customer}</p><div className="meta"><span>Lead {p.lead}</span><span>{p.progress}%</span></div><div className="progress big"><span style={{width:`${p.progress}%`}}/></div><div className="projectLinks"><button>Documents</button><button>Reports</button><button>Tasks</button></div></article>)}</div></div>
}


function Quotes({ quotes, setQuotes }) {
  const [customer,setCustomer]=useState(''); const [project,setProject]=useState(''); const [value,setValue]=useState('');
  function add(){if(!customer.trim()||!project.trim())return;setQuotes([...quotes,{id:Date.now(),customer,project,value:Number(value||0),status:'Draft'}]);setCustomer('');setProject('');setValue('')}
  function cycle(id){setQuotes(quotes.map(q=>q.id===id?{...q,status:q.status==='Draft'?'Sent':q.status==='Sent'?'Accepted':'Draft'}:q))}
  return <div className="content"><div className="sectionIntro"><h1>Quotations</h1><p>Create and follow FSQ quotation drafts.</p></div><div className="panel quoteForm"><input placeholder="Customer" value={customer} onChange={e=>setCustomer(e.target.value)}/><input placeholder="Project or vessel" value={project} onChange={e=>setProject(e.target.value)}/><input type="number" placeholder="Value DKK" value={value} onChange={e=>setValue(e.target.value)}/><button onClick={add}>Create quotation</button></div><div className="recordGrid">{quotes.map(q=><article className="recordCard" key={q.id}><span className="recordStatus">{q.status}</span><h3>{q.project}</h3><p>{q.customer}</p><strong>DKK {Number(q.value).toLocaleString('da-DK')}</strong><button onClick={()=>cycle(q.id)}>Advance status</button></article>)}</div></div>
}

function Reports({ reports, setReports }) {
  const [vessel,setVessel]=useState(''); const [title,setTitle]=useState('');
  function add(){if(!vessel.trim()||!title.trim())return;setReports([...reports,{id:Date.now(),vessel,title,status:'Draft'}]);setVessel('');setTitle('')}
  function cycle(id){setReports(reports.map(r=>r.id===id?{...r,status:r.status==='Draft'?'Review':r.status==='Review'?'Completed':'Draft'}:r))}
  return <div className="content"><div className="sectionIntro"><h1>Service reports</h1><p>Prepare, review and close marine service reports.</p></div><div className="panel reportForm"><input placeholder="Vessel" value={vessel} onChange={e=>setVessel(e.target.value)}/><input placeholder="Report title" value={title} onChange={e=>setTitle(e.target.value)}/><button onClick={add}>Create report</button></div><div className="recordGrid">{reports.map(r=><article className="recordCard" key={r.id}><span className="recordStatus">{r.status}</span><h3>{r.title}</h3><p>{r.vessel}</p><button onClick={()=>cycle(r.id)}>Advance status</button></article>)}</div></div>
}

function AI({chat,setChat,voice}) {
  const [text,setText]=useState('');
  function send(){if(!text.trim())return;const q=text;setChat([...chat,{from:'user',text:q}]);setText('');setTimeout(()=>{const answer = q.toLowerCase().includes('workshop')?'There are currently open workshop tasks. The highest priorities are welding robot setup and the pump component on the lathe.':q.toLowerCase().includes('offer')||q.toLowerCase().includes('tilbud')?'I can prepare a quotation draft using the active FSQ rates and project data.':'I have registered your request. In the production version I will search FSQ projects, documents and reports before answering.';setChat(c=>[...c,{from:'ai',text:answer}]);speak(answer,voice)},400)}
  return <div className="content aiLayout"><div className="sectionIntro"><h1>Right Hand AI</h1><p>Ask about workshop priorities, projects, quotations and reports.</p></div><div className="chatPanel">{chat.map((m,i)=><div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}<div className="chatInput"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask FSQ Right Hand..."/><button onClick={send}>Send</button></div></div></div>
}

function ModulePlaceholder({title}) { return <div className="content"><div className="sectionIntro"><h1>{title}</h1><p>This module is included in the navigation and ready for connection to the shared database.</p></div><div className="panel placeholder"><div className="core small"><div className="coreRing r1"/><div className="coreDot"/></div><h3>{title} module</h3><p>UI foundation ready. Database, files and approval workflows are the next deployment layer.</p></div></div> }

export default function Page(){ const [session,setSession]=useState(null); return session?<AppShell session={session} onLogout={()=>setSession(null)}/>:<Login onLogin={setSession}/> }
