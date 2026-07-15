'use client';

import { useEffect, useMemo, useState } from 'react';

const USERS = {
  Flemming: { role: 'Administrator', password: 'fsq2027' },
  Jakob: { role: 'Project Manager', password: 'fsq2027' }
};

const NAV = [
  ['dashboard', 'Operations Dashboard', '◈'],
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
  { id: 1, name: 'Wind Orca', customer: 'Cadeler', status: 'Active', progress: 68, lead: 'Jakob', location: 'Esbjerg', next: 'Workshop fabrication' },
  { id: 2, name: 'Wind Osprey', customer: 'Cadeler', status: 'Planning', progress: 42, lead: 'Flemming', location: 'Esbjerg', next: 'Mobilisation Friday' },
  { id: 3, name: 'TORM Splendid', customer: 'TORM', status: 'Inspection', progress: 27, lead: 'Jakob', location: 'Rotterdam', next: 'Inspection report' }
];

const DEFAULT_TASKS = [
  { id: 1, title: 'Klargør svejserobot til SMO', person: 'Jakob', priority: 'High', status: 'In progress', due: 'Today', project: 'Wind Orca' },
  { id: 2, title: 'Skær sidste pinde og pak på paller', person: 'Tommy', priority: 'Normal', status: 'Open', due: 'Today', project: 'Workshop' },
  { id: 3, title: 'Rengør plasmaskærer og skærebord', person: 'Anders', priority: 'Normal', status: 'Open', due: 'Today', project: 'Workshop' },
  { id: 4, title: 'Drej pumpeemne på drejebænk', person: 'Jakob', priority: 'High', status: 'Open', due: 'Today', project: 'Wind Orca' },
  { id: 5, title: 'Finalize service report', person: 'Flemming', priority: 'High', status: 'Open', due: 'Overdue', project: 'TORM Splendid' }
];

const DEFAULT_PEOPLE = [
  { id: 1, name: 'Flemming', location: 'Office', detail: 'Quotes and planning', status: 'Available' },
  { id: 2, name: 'Jakob', location: 'Workshop', detail: 'Wind Orca fabrication', status: 'Busy' },
  { id: 3, name: 'Tommy', location: 'Workshop', detail: 'Packing and material handling', status: 'Working' },
  { id: 4, name: 'Anders', location: 'Workshop', detail: 'Cleaning and preparation', status: 'Working' },
  { id: 5, name: 'Magnus', location: 'Offshore', detail: 'Wind Pace', status: 'On vessel' },
  { id: 6, name: 'Stefan', location: 'Office', detail: 'Engineering', status: 'Available' },
  { id: 7, name: 'Kim', location: 'Travel', detail: 'Mobilisation', status: 'Travelling' }
];

const DEFAULT_WEATHER = [
  { id: 1, location: 'Esbjerg', temp: 16, wind: 8, condition: 'Cloudy', note: 'Suitable for mobilisation' },
  { id: 2, location: 'Rotterdam', temp: 19, wind: 6, condition: 'Light rain', note: 'Plan covered work area' },
  { id: 3, location: 'Nibe Workshop', temp: 17, wind: 4, condition: 'Partly cloudy', note: 'Normal operations' }
];

const DEFAULT_QUOTES = [
  { id: 1, reference: 'Q-2026-071', customer: 'Cadeler', title: 'Wind Orca modification', value: 385000, status: 'Draft' },
  { id: 2, reference: 'Q-2026-072', customer: 'TORM', title: 'Scrubber inspection', value: 118000, status: 'Awaiting approval' }
];

const DEFAULT_REPORTS = [
  { id: 1, vessel: 'Wind Ally', title: 'Gripper hydraulic cylinder', status: 'Final review' },
  { id: 2, vessel: 'TORM Splendid', title: 'Scrubber inspection', status: 'Draft' },
  { id: 3, vessel: 'Wind Orca', title: 'BWTS pipe removal', status: 'Open' }
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

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved));
    } catch {}
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
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
        <div className="systemLine"><span/> Azure online <span/> GitHub connected <span/> Local data active</div>
      </section>
    </main>
  );
}

function AppShell({ session, onLogout }) {
  const [active, setActive] = useState('dashboard');
  const [projects, setProjects] = useStoredState('fsq-v31-projects', DEFAULT_PROJECTS);
  const [tasks, setTasks] = useStoredState('fsq-v31-tasks', DEFAULT_TASKS);
  const [people, setPeople] = useStoredState('fsq-v31-people', DEFAULT_PEOPLE);
  const [weather, setWeather] = useStoredState('fsq-v31-weather', DEFAULT_WEATHER);
  const [quotes, setQuotes] = useStoredState('fsq-v31-quotes', DEFAULT_QUOTES);
  const [reports, setReports] = useStoredState('fsq-v31-reports', DEFAULT_REPORTS);
  const [chat, setChat] = useState([{ from: 'ai', text: `Good morning ${session.name}. Operations dashboard is ready.` }]);
  const [voice, setVoice] = useState(session.voice);

  const stats = useMemo(() => ({
    projects: projects.filter(p => p.status !== 'Completed').length,
    today: tasks.filter(t => t.due === 'Today' && t.status !== 'Completed').length,
    urgent: tasks.filter(t => (t.priority === 'High' || t.due === 'Overdue') && t.status !== 'Completed').length,
    activePeople: people.filter(p => !['Free', 'Off'].includes(p.status)).length
  }), [projects, tasks, people]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="logo"><b>FSQ</b><span>RIGHT HAND</span></div>
        <div className="online"><i/> ALL SYSTEMS OPERATIONAL</div>
        <nav>{NAV.map(([id, label, icon]) => <button key={id} onClick={() => setActive(id)} className={active === id ? 'active' : ''}><span>{icon}</span>{label}</button>)}</nav>
        <div className="userCard"><div className="avatar">{session.name[0]}</div><div><b>{session.name}</b><small>{session.role}</small></div><button onClick={onLogout}>↗</button></div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">FSQ OPERATIONS CONTROL</p><h2>{NAV.find(n => n[0] === active)?.[1]}</h2></div>
          <div className="topActions"><label><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Voice</label><span className="clock">{new Date().toLocaleDateString('da-DK')}</span></div>
        </header>

        {active === 'dashboard' && <OperationsDashboard session={session} stats={stats} tasks={tasks} people={people} projects={projects} weather={weather} setActive={setActive} />}
        {active === 'workshop' && <Workshop tasks={tasks} setTasks={setTasks} />}
        {active === 'projects' && <Projects projects={projects} setProjects={setProjects} />}
        {active === 'quotes' && <Quotes quotes={quotes} setQuotes={setQuotes} />}
        {active === 'reports' && <Reports reports={reports} setReports={setReports} />}
        {active === 'admin' && <People people={people} setPeople={setPeople} weather={weather} setWeather={setWeather} />}
        {active === 'ai' && <AI chat={chat} setChat={setChat} voice={voice} tasks={tasks} projects={projects} />}
        {!['dashboard','workshop','projects','quotes','reports','admin','ai'].includes(active) && <ModulePlaceholder title={NAV.find(n=>n[0]===active)?.[1]} />}
      </main>
    </div>
  );
}

function OperationsDashboard({ session, stats, tasks, people, projects, weather, setActive }) {
  const urgent = tasks.filter(t => (t.priority === 'High' || t.due === 'Overdue') && t.status !== 'Completed');
  const todays = tasks.filter(t => t.due === 'Today' && t.status !== 'Completed');

  return <div className="content">
    <section className="hero operationsHero">
      <div>
        <p className="eyebrow">GOOD MORNING, {session.name.toUpperCase()}</p>
        <h1>Operations at a glance.</h1>
        <p>{stats.projects} active projects · {stats.activePeople} people planned · {stats.urgent} urgent items</p>
        <div className="heroActions">
          <button onClick={() => setActive('workshop')}>Open workshop</button>
          <button onClick={() => setActive('projects')}>Open projects</button>
        </div>
      </div>
      <div className="heroCore"><div className="pulse"/><span>{stats.today}</span><small>TASKS TODAY</small></div>
    </section>

    <section className="statGrid">
      <Stat label="Today's tasks" value={stats.today} delta={`${tasks.filter(t=>t.status==='In progress').length} in progress`} />
      <Stat label="People active" value={stats.activePeople} delta={`${people.filter(p=>p.location==='Workshop').length} in workshop`} />
      <Stat label="Active vessels" value={stats.projects} delta={`${projects.filter(p=>p.status==='Active').length} live`} />
      <Stat label="Urgent items" value={stats.urgent} delta={`${tasks.filter(t=>t.due==='Overdue'&&t.status!=='Completed').length} overdue`} danger={stats.urgent>0} />
    </section>

    <section className="opsGrid">
      <div className="panel">
        <div className="panelHead"><h3>📅 Today's tasks</h3><button onClick={()=>setActive('workshop')}>Open board</button></div>
        {todays.length ? todays.map(t => <div className="opsRow" key={t.id}><span className={t.priority==='High'?'priority high':'priority'}>{t.priority}</span><div><b>{t.title}</b><small>{t.person} · {t.project}</small></div><em>{t.status}</em></div>) : <Empty text="No tasks due today" />}
      </div>

      <div className="panel">
        <div className="panelHead"><h3>👷 Who is where</h3><button onClick={()=>setActive('admin')}>Update</button></div>
        <div className="peopleGrid">{people.map(p=><div className="personTile" key={p.id}><div className="avatar mini">{p.name[0]}</div><div><b>{p.name}</b><small>{p.location} · {p.detail}</small></div><span className={`personStatus ${p.status.toLowerCase().replace(' ','-')}`}>{p.status}</span></div>)}</div>
      </div>

      <div className="panel">
        <div className="panelHead"><h3>🚢 Active vessels</h3><button onClick={()=>setActive('projects')}>View all</button></div>
        {projects.map(p=><div className="vesselRow" key={p.id}><div><b>{p.name}</b><small>{p.customer} · {p.location}</small><small>Next: {p.next}</small></div><div className="vesselProgress"><span style={{width:`${p.progress}%`}}/><em>{p.progress}%</em></div></div>)}
      </div>

      <div className="panel urgentPanel">
        <div className="panelHead"><h3>⚠ Urgent tasks</h3><span className="alertCount">{urgent.length}</span></div>
        {urgent.length ? urgent.map(t=><div className="urgentRow" key={t.id}><div className="alertIcon">!</div><div><b>{t.title}</b><small>{t.person} · {t.project} · {t.due}</small></div></div>) : <Empty text="No urgent tasks" />}
      </div>
    </section>

    <section className="weatherSection">
      <div className="sectionTitle"><div><h3>🌤 Project weather</h3><p>Manual project weather for v3.1. Live weather connection comes next.</p></div></div>
      <div className="weatherGrid">{weather.map(w=><article className="weatherCard" key={w.id}><div className="weatherTop"><div><small>PROJECT LOCATION</small><h3>{w.location}</h3></div><strong>{w.temp}°</strong></div><div className="weatherMeta"><span>{w.condition}</span><span>Wind {w.wind} m/s</span></div><p>{w.note}</p></article>)}</div>
    </section>
  </div>
}

function Stat({label,value,delta,danger}) { return <div className={`stat ${danger?'dangerStat':''}`}><small>{label}</small><strong>{value}</strong><span>{delta}</span></div> }
function Empty({text}) { return <div className="empty">{text}</div> }

function Workshop({ tasks, setTasks }) {
  const [title,setTitle]=useState('');
  const [person,setPerson]=useState('Tommy');
  function add(){ if(!title.trim())return; setTasks([...tasks,{id:Date.now(),title,person,priority:'Normal',status:'Open',due:'Today',project:'Workshop'}]); setTitle(''); }
  function cycle(id){ setTasks(tasks.map(t=>t.id===id?{...t,status:t.status==='Open'?'In progress':t.status==='In progress'?'Completed':'Open'}:t)); }
  return <div className="content"><div className="sectionIntro"><h1>Workshop control board</h1><p>Live production status, people and machine overview.</p></div>
    <div className="machineStrip"><Machine name="Welding robot" status="Running"/><Machine name="Plasma cutter" status="Ready"/><Machine name="Lathe" status="Running"/><Machine name="Press brake" status="Ready"/><Machine name="Crane 2" status="Service" bad/></div>
    <div className="panel addBar"><input placeholder="New workshop task" value={title} onChange={e=>setTitle(e.target.value)}/><select value={person} onChange={e=>setPerson(e.target.value)}>{['Tommy','Jakob','Anders','Magnus','Stefan','Kim','Flemming'].map(x=><option key={x}>{x}</option>)}</select><button onClick={add}>Add task</button></div>
    <div className="kanban"><TaskColumn title="Open" tasks={tasks.filter(t=>t.status==='Open')} cycle={cycle}/><TaskColumn title="In progress" tasks={tasks.filter(t=>t.status==='In progress')} cycle={cycle}/><TaskColumn title="Completed" tasks={tasks.filter(t=>t.status==='Completed')} cycle={cycle}/></div>
  </div>
}
function Machine({name,status,bad}) { return <div className="machine"><i className={bad?'bad':''}/><div><b>{name}</b><small>{status}</small></div></div> }
function TaskColumn({title,tasks,cycle}) { return <div className="column"><h3>{title}<span>{tasks.length}</span></h3>{tasks.map(t=><button className="taskCard" key={t.id} onClick={()=>cycle(t.id)}><small>{t.priority} · {t.due}</small><b>{t.title}</b><span>{t.person} · {t.project}</span></button>)}</div> }

function Projects({projects,setProjects}) {
  const [name,setName]=useState(''); const [customer,setCustomer]=useState('');
  function add(){if(!name.trim())return;setProjects([...projects,{id:Date.now(),name,customer:customer||'Unassigned',status:'Planning',progress:5,lead:'Flemming',location:'TBD',next:'Planning'}]);setName('');setCustomer('')}
  return <div className="content"><div className="sectionIntro"><h1>Marine projects</h1><p>Shared project overview for vessels, repairs and inspections.</p></div><div className="panel addBar"><input placeholder="Project or vessel name" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Customer" value={customer} onChange={e=>setCustomer(e.target.value)}/><button onClick={add}>Create project</button></div><div className="projectCards">{projects.map(p=><article key={p.id}><div className="projectBadge">{p.status}</div><h3>{p.name}</h3><p>{p.customer} · {p.location}</p><div className="meta"><span>Lead {p.lead}</span><span>{p.progress}%</span></div><div className="progress big"><span style={{width:`${p.progress}%`}}/></div><p className="nextLine">Next: {p.next}</p></article>)}</div></div>
}

function Quotes({quotes,setQuotes}) {
  const [customer,setCustomer]=useState(''); const [title,setTitle]=useState('');
  function add(){if(!title.trim())return;setQuotes([...quotes,{id:Date.now(),reference:`Q-${new Date().getFullYear()}-${String(quotes.length+73).padStart(3,'0')}`,customer:customer||'Unassigned',title,value:0,status:'Draft'}]);setCustomer('');setTitle('')}
  function cycle(id){setQuotes(quotes.map(q=>q.id===id?{...q,status:q.status==='Draft'?'Awaiting approval':q.status==='Awaiting approval'?'Approved':'Draft'}:q))}
  return <div className="content"><div className="sectionIntro"><h1>Quotations</h1><p>Create and track commercial proposals.</p></div><div className="panel addBar"><input placeholder="Customer" value={customer} onChange={e=>setCustomer(e.target.value)}/><input placeholder="Quotation title" value={title} onChange={e=>setTitle(e.target.value)}/><button onClick={add}>New quotation</button></div><div className="panel">{quotes.map(q=><button className="listRow" key={q.id} onClick={()=>cycle(q.id)}><div><b>{q.reference} · {q.title}</b><small>{q.customer}</small></div><span>DKK {q.value.toLocaleString('da-DK')}</span><em>{q.status}</em></button>)}</div></div>
}

function Reports({reports,setReports}) {
  const [vessel,setVessel]=useState(''); const [title,setTitle]=useState('');
  function add(){if(!title.trim())return;setReports([...reports,{id:Date.now(),vessel:vessel||'Unassigned',title,status:'Draft'}]);setVessel('');setTitle('')}
  function cycle(id){setReports(reports.map(r=>r.id===id?{...r,status:r.status==='Draft'?'Final review':r.status==='Final review'?'Completed':'Draft'}:r))}
  return <div className="content"><div className="sectionIntro"><h1>Service Reports</h1><p>Register and progress vessel reports.</p></div><div className="panel addBar"><input placeholder="Vessel" value={vessel} onChange={e=>setVessel(e.target.value)}/><input placeholder="Report title" value={title} onChange={e=>setTitle(e.target.value)}/><button onClick={add}>New report</button></div><div className="panel">{reports.map(r=><button className="listRow" key={r.id} onClick={()=>cycle(r.id)}><div><b>{r.vessel} · {r.title}</b><small>Click to change status</small></div><em>{r.status}</em></button>)}</div></div>
}

function People({people,setPeople,weather,setWeather}) {
  function cyclePerson(id){const states=['Office','Workshop','Offshore','Travel','Course','Free'];setPeople(people.map(p=>p.id===id?{...p,location:states[(states.indexOf(p.location)+1)%states.length]}:p))}
  function bumpWeather(id, field, amount){setWeather(weather.map(w=>w.id===id?{...w,[field]:w[field]+amount}:w))}
  return <div className="content"><div className="sectionIntro"><h1>Operations administration</h1><p>Update staff locations and project weather manually.</p></div>
    <div className="twoCol">
      <div className="panel"><div className="panelHead"><h3>Who is where</h3></div>{people.map(p=><button className="listRow" key={p.id} onClick={()=>cyclePerson(p.id)}><div><b>{p.name}</b><small>{p.detail}</small></div><em>{p.location}</em></button>)}</div>
      <div className="panel"><div className="panelHead"><h3>Weather values</h3></div>{weather.map(w=><div className="weatherAdmin" key={w.id}><div><b>{w.location}</b><small>{w.condition}</small></div><button onClick={()=>bumpWeather(w.id,'temp',-1)}>-°</button><strong>{w.temp}°</strong><button onClick={()=>bumpWeather(w.id,'temp',1)}>+°</button><button onClick={()=>bumpWeather(w.id,'wind',-1)}>-wind</button><strong>{w.wind} m/s</strong><button onClick={()=>bumpWeather(w.id,'wind',1)}>+wind</button></div>)}</div>
    </div>
  </div>
}

function AI({chat,setChat,voice,tasks,projects}) {
  const [text,setText]=useState('');
  function send(){
    if(!text.trim())return;
    const q=text;
    setChat([...chat,{from:'user',text:q}]);
    setText('');
    setTimeout(()=>{
      const lower=q.toLowerCase();
      let answer='I have registered your request. In the database version I will search all FSQ records before answering.';
      if(lower.includes('urgent')||lower.includes('haste')) answer=`There are ${tasks.filter(t=>(t.priority==='High'||t.due==='Overdue')&&t.status!=='Completed').length} urgent items.`;
      else if(lower.includes('where')||lower.includes('hvor')) answer='Open Operations Dashboard to see the current staff locations.';
      else if(lower.includes('ship')||lower.includes('skib')) answer=`There are ${projects.length} active vessel projects in the current overview.`;
      else if(lower.includes('workshop')) answer=`There are ${tasks.filter(t=>t.status!=='Completed').length} open workshop and operations tasks.`;
      setChat(c=>[...c,{from:'ai',text:answer}]); speak(answer,voice);
    },400)
  }
  return <div className="content aiLayout"><div className="sectionIntro"><h1>Right Hand AI</h1><p>Ask about today's work, personnel, vessels and urgent items.</p></div><div className="chatPanel">{chat.map((m,i)=><div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}<div className="chatInput"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask FSQ Right Hand..."/><button onClick={send}>Send</button></div></div></div>
}

function ModulePlaceholder({title}) { return <div className="content"><div className="sectionIntro"><h1>{title}</h1><p>This module is included in the navigation and ready for connection to the shared database.</p></div><div className="panel placeholder"><div className="core small"><div className="coreRing r1"/><div className="coreDot"/></div><h3>{title} module</h3><p>UI foundation ready. Database, files and approval workflows are the next deployment layer.</p></div></div> }

export default function Page(){ const [session,setSession]=useState(null); return session?<AppShell session={session} onLogout={()=>setSession(null)}/>:<Login onLogin={setSession}/> }
