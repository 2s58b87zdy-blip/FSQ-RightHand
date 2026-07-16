'use client';

import { useEffect, useMemo, useState } from 'react';

const USERS = {
  Flemming: { role: 'Administrator', password: 'fsq2027' },
  Jakob: { role: 'Project Manager', password: 'fsq2027' }
};

const NAV = [
  ['dashboard', 'Dashboard', '◈'],
  ['projects', 'Projects', '◫'],
  ['crew', 'People', '◉'],
  ['documents', 'Documents', '▱'],
  ['ai', 'Right Hand AI', '◎'],
  ['admin', 'Settings', '⚙']
];

const DEFAULT_PROJECTS = [
  { id: 1, type: 'Marine', name: 'Wind Orca', customer: 'Cadeler', imo: '9671414', projectNo: 'FSQ-26071', status: 'Fabrication', progress: 68, lead: 'Jakob', location: 'Esbjerg', startDate: '2026-07-15', mobilisation: '2026-07-20', next: 'Complete SMO fabrication', notes: 'Priority scrubber modification project.' },
  { id: 2, type: 'Marine', name: 'Wind Osprey', customer: 'Cadeler', imo: '9671426', projectNo: 'FSQ-26072', status: 'Planning', progress: 42, lead: 'Flemming', location: 'Esbjerg', startDate: '2026-07-18', mobilisation: '2026-07-27', next: 'Finalize material package', notes: 'Prepare fabrication and mobilisation package.' },
  { id: 4, type: 'Workshop', name: 'Stainless Frames', customer: 'Cadeler', imo: '', projectNo: 'FSQ-26074', status: 'Fabrication', progress: 35, lead: 'Jakob', location: 'Nibe Workshop', startDate: '2026-07-16', mobilisation: '2026-07-28', next: 'Complete frame welding', notes: 'Workshop fabrication of stainless frames.' },
  { id: 3, type: 'Inspection', name: 'TORM Splendid', customer: 'TORM', imo: '9683572', projectNo: 'FSQ-26073', status: 'Inspection', progress: 27, lead: 'Jakob', location: 'Rotterdam', startDate: '2026-07-10', mobilisation: 'In progress', next: 'Finish inspection report', notes: 'Scrubber inspection and repair scope.' }
];

const DEFAULT_TASKS = [
  { id: 1, title: 'Klargør svejserobot til SMO', person: 'Jakob', priority: 'High', status: 'In progress', due: 'Today', project: 'Wind Orca' },
  { id: 2, title: 'Skær sidste pinde og pak på paller', person: 'Tommy', priority: 'Normal', status: 'Planned', due: 'Today', project: 'Workshop' },
  { id: 3, title: 'Rengør plasmaskærer og skærebord', person: 'Anders', priority: 'Normal', status: 'Planned', due: 'Today', project: 'Workshop' },
  { id: 4, title: 'Drej pumpeemne på drejebænk', person: 'Jakob', priority: 'High', status: 'In progress', due: 'Today', project: 'Wind Orca' },
  { id: 5, title: 'Afventer SMO254 6 mm', person: 'Tommy', priority: 'High', status: 'Waiting', due: 'Tomorrow', project: 'Wind Osprey' },
  { id: 6, title: 'Finalize service report', person: 'Flemming', priority: 'High', status: 'Waiting', due: 'Overdue', project: 'TORM Splendid' },
  { id: 7, title: 'Inspection report issued', person: 'Stefan', priority: 'Normal', status: 'Completed', due: 'Done', project: 'TORM Splendid' }
];

const DEFAULT_PEOPLE = [
  { id: 1, name: 'Flemming', location: 'Office', detail: 'Quotes and planning', status: 'Available', task: 'Commercial follow-up', progress: 55, skills: ['Management', 'Marine', 'Quotations'], certificates: [] },
  { id: 2, name: 'Jakob', location: 'Workshop', detail: 'Wind Orca fabrication', status: 'Busy', task: 'Robot welding', progress: 68, skills: ['SMO254', 'Robot welding', 'Supervision'], certificates: ['Welding certificates'] },
  { id: 3, name: 'Tommy', location: 'Workshop', detail: 'Packing and material handling', status: 'Working', task: 'Frame preparation', progress: 80, skills: ['Workshop', 'Material handling'], certificates: [] },
  { id: 4, name: 'Anders', location: 'Workshop', detail: 'Cleaning and preparation', status: 'Working', task: 'Plasma area cleanup', progress: 42, skills: ['Workshop', 'Preparation'], certificates: [] },
  { id: 5, name: 'Mathias', location: 'Workshop', detail: 'Workshop / Offshore', status: 'Available', task: 'Fabrication support', progress: 35, skills: ['SMO254', 'Montage', 'Offshore'], certificates: ['GWO', 'HLO45'] },
  { id: 6, name: 'Magnus', location: 'Offshore', detail: 'Wind Pace', status: 'On vessel', task: 'Offshore installation', progress: 72, skills: ['Offshore', 'Installation'], certificates: ['GWO'] },
  { id: 7, name: 'Stefan', location: 'Office', detail: 'Engineering', status: 'Available', task: 'Drawings and reports', progress: 48, skills: ['Engineering', 'Drawings'], certificates: [] },
  { id: 8, name: 'Kim', location: 'Travel', detail: 'Mobilisation', status: 'Travelling', task: 'Mobilisation', progress: 30, skills: ['Offshore', 'Installation'], certificates: ['GWO'] }
];

const DEFAULT_MACHINES = [
  { id: 1, name: 'Welding robot', status: 'In use', note: 'Wind Orca SMO welding', lastService: '2026-06-18' },
  { id: 2, name: 'Plasma cutter', status: 'Ready', note: 'Available', lastService: '2026-05-12' },
  { id: 3, name: 'Lathe', status: 'In use', note: 'Pump component', lastService: '2026-04-30' },
  { id: 4, name: 'Press brake', status: 'Service', note: 'Maintenance tomorrow', lastService: '2026-07-01' },
  { id: 5, name: 'Crane 2', status: 'Out of service', note: 'Awaiting inspection', lastService: '2026-03-15' },
  { id: 6, name: 'Forklift', status: 'Ready', note: 'Available', lastService: '2026-06-02' }
];

const DEFAULT_MATERIALS = [
  { id: 1, name: 'SMO254 6 mm', quantity: 3, unit: 'plates', minimum: 5 },
  { id: 2, name: 'SMO254 8 mm', quantity: 7, unit: 'plates', minimum: 4 },
  { id: 3, name: '2507 plate', quantity: 6, unit: 'plates', minimum: 4 },
  { id: 4, name: '2507 pipe', quantity: 8, unit: 'lengths', minimum: 5 },
  { id: 5, name: 'Shielding gas', quantity: 14, unit: 'bottles', minimum: 8 },
  { id: 6, name: 'Grinding discs', quantity: 38, unit: 'pcs', minimum: 20 }
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

const DEFAULT_DOCUMENTS = [
  { id: 1, name: 'Wind Orca Repair Plan.pdf', project: 'Wind Orca', category: 'Method Statements', version: 2, size: '1.2 MB', uploadedBy: 'Flemming', date: '2026-07-15', dataUrl: '' },
  { id: 2, name: 'TORM Splendid Inspection Report.docx', project: 'TORM Splendid', category: 'Service Reports', version: 1, size: '640 KB', uploadedBy: 'Jakob', date: '2026-07-14', dataUrl: '' },
  { id: 3, name: 'WPQR 131 SMO254.pdf', project: 'General', category: 'WPQR / WPS', version: 3, size: '2.1 MB', uploadedBy: 'Flemming', date: '2026-07-10', dataUrl: '' }
];


const DEFAULT_DRONE_INSPECTIONS = [
  { id: 1, project: 'TORM Splendid', title: 'Scrubber internal inspection', date: '2026-07-12', operator: 'Flemming', status: 'Review', findings: 3, images: 42, notes: 'Check weld seams and internal supports.' },
  { id: 2, project: 'Wind Orca', title: 'Pre-mobilisation visual inspection', date: '2026-07-15', operator: 'Jakob', status: 'Open', findings: 1, images: 18, notes: 'Document fabrication and access conditions.' }
];

const PROJECT_TYPES = [
  'Vessel',
  'Workshop',
  'Inspection',
  'Drone Inspection',
  'Internal',
  'Service'
];


const DOCUMENT_CATEGORIES = [
  'Quotations',
  'Service Reports',
  'Drawings',
  'Risk Assessments',
  'Method Statements',
  'WPQR / WPS',
  'Packing Lists',
  'Certificates',
  'Photos',
  'Other'
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
    const greeting = `Good morning, ${user}. FSQ Right Hand is now online. Workshop control is ready. How can I assist you today?`;
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
        <div className="systemLine"><span/> Azure online <span/> Workshop control active <span/> No time registration</div>
      </section>
    </main>
  );
}

function AppShell({ session, onLogout }) {
  const [active, setActive] = useState('dashboard');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projects, setProjects] = useStoredState('fsq-v40-projects', DEFAULT_PROJECTS);
  const [tasks, setTasks] = useStoredState('fsq-v40-tasks', DEFAULT_TASKS);
  const [people, setPeople] = useStoredState('fsq-v40-people', DEFAULT_PEOPLE);
  const [machines, setMachines] = useStoredState('fsq-v40-machines', DEFAULT_MACHINES);
  const [materials, setMaterials] = useStoredState('fsq-v40-materials', DEFAULT_MATERIALS);
  const [quotes, setQuotes] = useStoredState('fsq-v40-quotes', DEFAULT_QUOTES);
  const [reports, setReports] = useStoredState('fsq-v40-reports', DEFAULT_REPORTS);
  const [droneInspections, setDroneInspections] = useStoredState('fsq-v40-drone-inspections', DEFAULT_DRONE_INSPECTIONS);
  const [documents, setDocuments] = useStoredState('fsq-v40-documents', DEFAULT_DOCUMENTS);
  const [deletedProjects, setDeletedProjects] = useStoredState('fsq-v40-deleted-projects', []);
  const [chat, setChat] = useState([{ from: 'ai', text: `Good morning ${session.name}. Workshop Control Center is ready.` }]);
  const [voice, setVoice] = useState(session.voice);

  const stats = useMemo(() => ({
    projects: projects.filter(p => p.status !== 'Completed').length,
    openTasks: tasks.filter(t => t.status !== 'Completed').length,
    urgent: tasks.filter(t => (t.priority === 'High' || t.due === 'Overdue') && t.status !== 'Completed').length,
    people: people.filter(p => !['Free', 'Off'].includes(p.status)).length,
    lowStock: materials.filter(m => m.quantity < m.minimum).length,
    machinesDown: machines.filter(m => ['Service','Out of service'].includes(m.status)).length
  }), [projects, tasks, people, materials, machines]);

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

        {active === 'dashboard' && <Dashboard session={session} stats={stats} projects={projects} tasks={tasks} people={people} machines={machines} materials={materials} setActive={setActive} deletedProjects={deletedProjects} setDeletedProjects={setDeletedProjects} setActiveProjectId={setActiveProjectId} droneInspections={droneInspections} setDroneInspections={setDroneInspections} />}
        {active === 'crew' && <CrewManagement people={people} setPeople={setPeople} projects={projects} />}
        {active === 'projects' && <Projects projects={projects} setProjects={setProjects} deletedProjects={deletedProjects} setDeletedProjects={setDeletedProjects} setActive={setActive} setActiveProjectId={setActiveProjectId} />}
        {active === 'projectHub' && <ProjectHub project={projects.find(p=>p.id===activeProjectId)} projects={projects} setProjects={setProjects} people={people} tasks={tasks} setTasks={setTasks} documents={documents} materials={materials} setMaterials={setMaterials} quotes={quotes} reports={reports} setActive={setActive} deletedProjects={deletedProjects} setDeletedProjects={setDeletedProjects} setActiveProjectId={setActiveProjectId} droneInspections={droneInspections} setDroneInspections={setDroneInspections} />}
        {active === 'documents' && <DocumentCenter documents={documents} setDocuments={setDocuments} projects={projects} session={session} />}
        {active === 'admin' && <Admin people={people} setPeople={setPeople} machines={machines} setMachines={setMachines} materials={materials} setMaterials={setMaterials} />}
        {active === 'ai' && <AI chat={chat} setChat={setChat} voice={voice} stats={stats} />}
        {!['dashboard','crew','projects','projectHub','documents','admin','ai'].includes(active) && <ModulePlaceholder title={NAV.find(n=>n[0]===active)?.[1]} />}
      </main>
    </div>
  );
}

function Dashboard({ session, stats, projects, tasks, people, machines, materials, setActive }) {
  const urgent = tasks.filter(t => (t.priority === 'High' || t.due === 'Overdue') && t.status !== 'Completed');
  return <div className="content">
    <section className="hero">
      <div>
        <p className="eyebrow">GOOD MORNING, {session.name.toUpperCase()}</p>
        <h1>Workshop and marine operations.</h1>
        <p>{stats.projects} active projects · {stats.people} people active · {stats.openTasks} open tasks</p>
        <div className="heroActions"><button onClick={()=>setActive('workshop')}>Open Projects</button><button onClick={()=>setActive('projects')}>Projects</button></div>
      </div>
      <div className="heroCore"><div className="pulse"/><span>{stats.urgent}</span><small>URGENT ITEMS</small></div>
    </section>

    <section className="statGrid six">
      <Stat label="People active" value={stats.people} delta={`${people.filter(p=>p.location==='Workshop').length} in workshop`} />
      <Stat label="Active projects" value={stats.projects} delta={`${projects.filter(p=>p.status==='Fabrication').length} in fabrication`} />
      <Stat label="Open tasks" value={stats.openTasks} delta={`${tasks.filter(t=>t.status==='In progress').length} in progress`} />
      <Stat label="Urgent tasks" value={stats.urgent} delta={`${tasks.filter(t=>t.due==='Overdue'&&t.status!=='Completed').length} overdue`} danger={stats.urgent>0} />
      <Stat label="Low stock" value={stats.lowStock} delta="Materials below minimum" danger={stats.lowStock>0} />
      <Stat label="Machines attention" value={stats.machinesDown} delta="Service or unavailable" danger={stats.machinesDown>0} />
    </section>

    <section className="dashboardGrid">
      <div className="panel">
        <div className="panelHead"><h3>Today's workshop priorities</h3><button onClick={()=>setActive('workshop')}>Open board</button></div>
        {tasks.filter(t=>t.status!=='Completed').slice(0,6).map(t=><div className="opsRow" key={t.id}><span className={`priority ${t.priority==='High'?'high':''}`}>{t.priority}</span><div><b>{t.title}</b><small>{t.person} · {t.project}</small></div><em>{t.status}</em></div>)}
      </div>
      <div className="panel">
        <div className="panelHead"><h3>Who is where</h3><button onClick={()=>setActive('admin')}>Update</button></div>
        {people.map(p=><div className="personTile" key={p.id}><div className="avatar mini">{p.name[0]}</div><div><b>{p.name}</b><small>{p.location} · {p.task}</small></div><span>{p.progress}%</span></div>)}
      </div>
      <div className="panel">
        <div className="panelHead"><h3>Active marine projects</h3><button onClick={()=>setActive('projects')}>View all</button></div>
        {projects.map(p=><div className="vesselRow" key={p.id}><div><b>{p.name}</b><small>{p.customer} · {p.status}</small><small>Mobilisation: {p.mobilisation}</small></div><div className="vesselProgress"><span style={{width:`${p.progress}%`}}/><em>{p.progress}%</em></div></div>)}
      </div>
      <div className="panel urgentPanel">
        <div className="panelHead"><h3>Critical items</h3><span className="alertCount">{urgent.length}</span></div>
        {urgent.map(t=><div className="urgentRow" key={t.id}><div className="alertIcon">!</div><div><b>{t.title}</b><small>{t.person} · {t.project} · {t.due}</small></div></div>)}
      </div>
    </section>
  </div>
}

function WorkshopControl({ tasks, setTasks, people, machines, setMachines, materials, setMaterials, projects }) {
  const [title,setTitle]=useState('');
  const [person,setPerson]=useState('Tommy');
  const [project,setProject]=useState('Workshop');
  const [priority,setPriority]=useState('Normal');
  const [due,setDue]=useState('Today');
  const [taskError,setTaskError]=useState('');

  function addTask(event){
    event?.preventDefault();
    const cleanTitle = title.trim();
    if(!cleanTitle) {
      setTaskError('Skriv en opgavebeskrivelse først.');
      return;
    }
    const newTask = {
      id: Date.now(),
      title: cleanTitle,
      person,
      priority,
      status: 'Planned',
      due,
      project
    };
    setTasks(current => [...current, newTask]);
    setTitle('');
    setTaskError('');
  }
  function cycleTask(id){
    const order=['Planned','In progress','Waiting','Completed'];
    setTasks(tasks.map(t=>t.id===id?{...t,status:order[(order.indexOf(t.status)+1)%order.length]}:t));
  }

  return <div className="content">
    <div className="sectionIntro"><h1>Workshop Control Center</h1><p>People, production, machines and materials. Time registration remains in e-conomic.</p></div>

    <section className="workshopSummary">
      <Summary label="Workshop staff" value={people.filter(p=>p.location==='Workshop').length} />
      <Summary label="Tasks in progress" value={tasks.filter(t=>t.status==='In progress').length} />
      <Summary label="Waiting tasks" value={tasks.filter(t=>t.status==='Waiting').length} warning />
      <Summary label="Machines ready" value={machines.filter(m=>m.status==='Ready').length} />
      <Summary label="Low stock items" value={materials.filter(m=>m.quantity<m.minimum).length} warning />
    </section>

    <section className="peopleCards">
      {people.filter(p=>p.location==='Workshop'||p.location==='Office').map(p=><article key={p.id}>
        <div className="personHead"><div className="avatar">{p.name[0]}</div><div><h3>{p.name}</h3><small>{p.location} · {p.status}</small></div></div>
        <p>{p.task}</p>
        <div className="progress big"><span style={{width:`${p.progress}%`}}/></div>
        <div className="personFooter"><span>{p.progress}%</span><small>{p.detail}</small></div>
      </article>)}
    </section>

    <form className="panel taskCreator taskCreatorV33" onSubmit={addTask}>
      <input autoFocus placeholder="New workshop task" value={title} onChange={e=>setTitle(e.target.value)} />
      <select value={person} onChange={e=>setPerson(e.target.value)}>{people.map(p=><option key={p.id}>{p.name}</option>)}</select>
      <select value={project} onChange={e=>setProject(e.target.value)}><option>Workshop</option>{projects.map(p=><option key={p.id}>{p.name}</option>)}</select>
      <select value={priority} onChange={e=>setPriority(e.target.value)}><option>Normal</option><option>High</option></select>
      <select value={due} onChange={e=>setDue(e.target.value)}><option>Today</option><option>Tomorrow</option><option>This week</option><option>Later</option></select>
      <button type="submit">Add task</button>
      {taskError && <div className="taskError">{taskError}</div>}
    </form>

    <section className="kanban four">
      {['Planned','In progress','Waiting','Completed'].map(status=><TaskColumn key={status} title={status} tasks={tasks.filter(t=>t.status===status)} cycle={cycleTask} />)}
    </section>

    <section className="workshopLowerGrid">
      <div className="panel">
        <div className="panelHead"><h3>Machine status</h3><button onClick={()=>setMachines(DEFAULT_MACHINES)}>Reset</button></div>
        <div className="machineGrid">
          {machines.map(m=><MachineCard key={m.id} machine={m} setMachines={setMachines} machines={machines} />)}
        </div>
      </div>
      <div className="panel">
        <div className="panelHead"><h3>Material overview</h3><button onClick={()=>setMaterials(DEFAULT_MATERIALS)}>Reset</button></div>
        {materials.map(m=><MaterialRow key={m.id} material={m} materials={materials} setMaterials={setMaterials} />)}
      </div>
    </section>
  </div>
}

function Summary({label,value,warning}) { return <div className={`summaryCard ${warning?'warning':''}`}><small>{label}</small><strong>{value}</strong></div> }
function Stat({label,value,delta,danger}) { return <div className={`stat ${danger?'dangerStat':''}`}><small>{label}</small><strong>{value}</strong><span>{delta}</span></div> }
function TaskColumn({title,tasks,cycle}) { return <div className="column"><h3>{title}<span>{tasks.length}</span></h3>{tasks.map(t=><button type="button" className="taskCard" key={t.id} onClick={()=>cycle(t.id)} title="Click to move task to next status"><small>{t.priority} · {t.due}</small><b>{t.title}</b><span>{t.person} · {t.project}</span></button>)}</div> }

function MachineCard({ machine, machines, setMachines }) {
  const states=['Ready','In use','Service','Out of service'];
  function cycle(){ setMachines(machines.map(m=>m.id===machine.id?{...m,status:states[(states.indexOf(m.status)+1)%states.length]}:m)); }
  return <button className={`machineCard ${machine.status.toLowerCase().replaceAll(' ','-')}`} onClick={cycle}>
    <div className="machineIndicator" />
    <div><b>{machine.name}</b><small>{machine.note}</small><small>Last service: {machine.lastService}</small></div>
    <em>{machine.status}</em>
  </button>
}

function MaterialRow({ material, materials, setMaterials }) {
  const low=material.quantity<material.minimum;
  function change(amount){setMaterials(materials.map(m=>m.id===material.id?{...m,quantity:Math.max(0,m.quantity+amount)}:m))}
  return <div className={`materialRow ${low?'low':''}`}>
    <div><b>{material.name}</b><small>Minimum {material.minimum} {material.unit}</small></div>
    <div className="materialControls"><button onClick={()=>change(-1)}>-</button><strong>{material.quantity}</strong><span>{material.unit}</span><button onClick={()=>change(1)}>+</button></div>
  </div>
}


function CrewManagement({ people, setPeople, projects }) {
  const locations = ['Workshop', 'Office', 'Offshore', 'Travel', 'Course', 'Free'];
  const [selected, setSelected] = useState(people[0]?.id || null);

  function updatePerson(id, field, value) {
    setPeople(people.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  function addPerson() {
    const id = Date.now();
    setPeople([...people, {
      id,
      name: 'New employee',
      location: 'Workshop',
      detail: 'Role not assigned',
      status: 'Available',
      task: 'No task assigned',
      progress: 0,
      skills: [],
      certificates: []
    }]);
    setSelected(id);
  }

  function deletePerson(id) {
    const person = people.find(p => p.id === id);
    if (!person) return;

    const confirmed = window.confirm(`Delete ${person.name} from the employee list?`);
    if (!confirmed) return;

    const remaining = people.filter(p => p.id !== id);
    setPeople(remaining);
    setSelected(remaining[0]?.id || null);
  }

  const current = people.find(p => p.id === selected);

  return <div className="content">
    <div className="sectionIntro crewIntro">
      <div><h1>Crew Management</h1><p>Plan workshop, office, offshore, travel, courses and availability.</p></div>
      <button className="primaryBtn" onClick={addPerson}>Add employee</button>
    </div>

    <section className="crewStats">
      {locations.map(location => <div className="summaryCard" key={location}>
        <small>{location}</small>
        <strong>{people.filter(p => p.location === location).length}</strong>
      </div>)}
    </section>

    <section className="crewLayout">
      <div className="panel crewRoster">
        <div className="panelHead"><h3>Employee roster</h3><span>{people.length} employees</span></div>
        {people.map(p => <button
          key={p.id}
          className={`crewRow ${selected === p.id ? 'selected' : ''}`}
          onClick={() => setSelected(p.id)}
        >
          <div className="avatar">{p.name?.[0] || '?'}</div>
          <div>
            <b>{p.name}</b>
            <small>{p.location} · {p.status}</small>
            <small>{p.task}</small>
          </div>
          <span>{p.progress || 0}%</span>
        </button>)}
      </div>

      <div className="panel crewEditor">
        {current ? <>
          <div className="panelHead"><h3>Employee details</h3><div className="employeeHeaderActions"><span>{current.location}</span><button className="deleteEmployee" onClick={() => deletePerson(current.id)}>Delete employee</button></div></div>

          <label>Name<input value={current.name} onChange={e => updatePerson(current.id, 'name', e.target.value)} /></label>
          <div className="crewFormGrid">
            <label>Location<select value={current.location} onChange={e => updatePerson(current.id, 'location', e.target.value)}>
              {locations.map(x => <option key={x}>{x}</option>)}
            </select></label>
            <label>Status<select value={current.status} onChange={e => updatePerson(current.id, 'status', e.target.value)}>
              {['Available','Working','Busy','On vessel','Travelling','Course','Free'].map(x => <option key={x}>{x}</option>)}
            </select></label>
          </div>

          <label>Role / detail<input value={current.detail || ''} onChange={e => updatePerson(current.id, 'detail', e.target.value)} /></label>
          <label>Current task<input value={current.task || ''} onChange={e => updatePerson(current.id, 'task', e.target.value)} /></label>
          <label>Assigned project<select value={current.project || ''} onChange={e => updatePerson(current.id, 'project', e.target.value)}>
            <option value="">No project assigned</option>
            {projects.map(p => <option key={p.id}>{p.name}</option>)}
          </select></label>

          <label>Progress: {current.progress || 0}%
            <input type="range" min="0" max="100" value={current.progress || 0} onChange={e => updatePerson(current.id, 'progress', Number(e.target.value))} />
          </label>

          <div className="crewInfoGrid">
            <div>
              <small>Skills</small>
              <p>{(current.skills || []).join(' · ') || 'No skills registered'}</p>
            </div>
            <div>
              <small>Certificates</small>
              <p>{(current.certificates || []).join(' · ') || 'No certificates registered'}</p>
            </div>
          </div>
        </> : <div className="empty">Select an employee</div>}
      </div>
    </section>

    <section className="crewGroups">
      {locations.map(location => <div className="panel" key={location}>
        <div className="panelHead"><h3>{location}</h3><span>{people.filter(p => p.location === location).length}</span></div>
        {people.filter(p => p.location === location).map(p => <div className="groupPerson" key={p.id}>
          <div className="avatar mini">{p.name[0]}</div>
          <div><b>{p.name}</b><small>{p.task}</small></div>
        </div>)}
      </div>)}
    </section>
  </div>
}

function Projects({projects,setProjects,deletedProjects,setDeletedProjects,setActive,setActiveProjectId}) {
  const today = new Date().toISOString().slice(0,10);
  const [showWizard,setShowWizard]=useState(false);
  const [filter,setFilter]=useState('Active');
  const [search,setSearch]=useState('');
  const [form,setForm]=useState({
    type:'Vessel',
    customer:'',
    name:'',
    imo:'',
    lead:'Flemming',
    location:'',
    startDate:today,
    deadline:'',
    status:'Planning',
    priority:'Medium',
    health:'Green',
    notes:''
  });

  function update(field,value){ setForm(current=>({...current,[field]:value})); }
  function normalizeProject(project){
    return {
      type: project.type === 'Marine' ? 'Vessel' : (project.type || 'Vessel'),
      lifecycle: project.lifecycle || (project.status === 'Completed' ? 'Completed' : 'Active'),
      priority: project.priority || 'Medium',
      health: project.health || 'Green',
      deadline: project.deadline || project.mobilisation || '',
      archivedAt: project.archivedAt || '',
      completedAt: project.completedAt || '',
      ...project
    };
  }

  const normalizedProjects = projects.map(normalizeProject);
  const nextProjectNumber = `FSQ-${new Date().getFullYear().toString().slice(-2)}${String(normalizedProjects.length + deletedProjects.length + 1).padStart(4,'0')}`;

  function add(){
    if(!form.name.trim() || !form.customer.trim()) return;
    const project={
      id:Date.now(),
      ...form,
      projectNo:nextProjectNumber,
      lifecycle:'Active',
      archivedAt:'',
      completedAt:'',
      progress:5,
      next:'Planning',
      mobilisation:form.deadline
    };
    setProjects([...normalizedProjects,project]);
    setShowWizard(false);
    setForm({
      type:'Vessel',customer:'',name:'',imo:'',lead:'Flemming',location:'',
      startDate:today,deadline:'',status:'Planning',priority:'Medium',health:'Green',notes:''
    });
    setActiveProjectId(project.id);
    setActive('projectHub');
  }

  function openProject(id){ setActiveProjectId(id); setActive('projectHub'); }
  function restoreProject(id){
    const project=deletedProjects.find(p=>p.id===id);
    if(!project) return;
    setDeletedProjects(deletedProjects.filter(p=>p.id!==id));
    setProjects([...normalizedProjects,{...project,lifecycle:'Archived'}]);
  }

  const typeFilters=['Vessel','Workshop','Inspection','Drone Inspection','Internal','Service'];
  const visible=normalizedProjects.filter(p=>{
    const searchText=`${p.name} ${p.customer} ${p.projectNo} ${p.location} ${p.type}`.toLowerCase();
    if(!searchText.includes(search.toLowerCase())) return false;
    if(filter==='Active') return p.lifecycle==='Active';
    if(filter==='Completed') return p.lifecycle==='Completed';
    if(filter==='Archived') return p.lifecycle==='Archived';
    if(typeFilters.includes(filter)) return p.type===filter;
    return true;
  });

  function deadlineText(deadline){
    if(!deadline) return 'No deadline';
    const days=Math.ceil((new Date(deadline)-new Date(today))/(1000*60*60*24));
    if(days<0) return `${Math.abs(days)} days overdue`;
    if(days===0) return 'Due today';
    return `${days} days remaining`;
  }

  return <div className="content">
    <div className="sectionIntro projectIntro">
      <div><h1>Projects</h1><p>All vessel, workshop, inspection and internal jobs in one place.</p></div>
      <button className="primaryBtn newProjectButton" onClick={()=>setShowWizard(!showWizard)}>{showWizard?'Close':'＋ New Project'}</button>
    </div>

    <div className="projectToolbar">
      <input className="projectSearch" placeholder="Search project, customer, number or location..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div className="projectFilters">
        {['Active',...typeFilters,'Completed','Archived','All'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}<span>{x==='All'?normalizedProjects.length:typeFilters.includes(x)?normalizedProjects.filter(p=>p.type===x).length:normalizedProjects.filter(p=>p.lifecycle===x).length}</span></button>)}
        <button className={filter==='Trash'?'active trashFilter':'trashFilter'} onClick={()=>setFilter('Trash')}>Trash<span>{deletedProjects.length}</span></button>
      </div>
    </div>

    {showWizard&&<section className="panel projectWizard">
      <div className="wizardHeader"><h3>Create project</h3><span>Project number: {nextProjectNumber}</span></div>
      <div className="wizardGrid">
        <label>Project type<select value={form.type} onChange={e=>update('type',e.target.value)}><option>Vessel</option><option>Workshop</option><option>Inspection</option><option>Drone Inspection</option><option>Internal</option><option>Service</option></select></label>
        <label>Customer<input value={form.customer} onChange={e=>update('customer',e.target.value)} placeholder="Cadeler" /></label>
        <label>Project / vessel name<input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Wind Orca" /></label>
        <label>IMO number<input value={form.imo} onChange={e=>update('imo',e.target.value)} placeholder="Optional" /></label>
        <label>Project manager<select value={form.lead} onChange={e=>update('lead',e.target.value)}><option>Flemming</option><option>Jakob</option><option>Stefan</option></select></label>
        <label>Location<input value={form.location} onChange={e=>update('location',e.target.value)} placeholder="Esbjerg" /></label>
        <label>Start date<input type="date" value={form.startDate} onClick={e=>e.currentTarget.showPicker?.()} onFocus={e=>e.currentTarget.showPicker?.()} onChange={e=>update('startDate',e.target.value)} /></label>
        <label>Deadline<input type="date" min={form.startDate} value={form.deadline} onClick={e=>e.currentTarget.showPicker?.()} onFocus={e=>e.currentTarget.showPicker?.()} onChange={e=>update('deadline',e.target.value)} /></label>
        <label>Priority<select value={form.priority} onChange={e=>update('priority',e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
        <label>Project health<select value={form.health} onChange={e=>update('health',e.target.value)}><option>Green</option><option>Yellow</option><option>Red</option></select></label>
        <label>Status<select value={form.status} onChange={e=>update('status',e.target.value)}><option>Planning</option><option>Fabrication</option><option>Inspection</option><option>Mobilisation</option><option>Completed</option></select></label>
        <label className="wizardNotes">Notes<textarea value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Scope, priorities and important notes" /></label>
      </div>
      <div className="wizardFolders">{['Quotations','Purchase Orders','Drawings','Method Statements','Risk Assessments','Service Reports','WPQR','WPS','NDT Reports','Certificates','Packing Lists','Photos','Drone','Videos','Archive'].map(x=><span key={x}>{x}</span>)}</div>
      <button className="primaryBtn" onClick={add}>Create Project Hub</button>
    </section>}

    {filter!=='Trash'
      ? <div className="projectCards projectHubCards">
          {visible.map(p=><article key={p.id} onClick={()=>openProject(p.id)}>
            <div className="projectTop">
              <div className="projectBadges">
                <div className={`healthLight ${String(p.health||'Green').toLowerCase()}`} title={`Project health: ${p.health||'Green'}`} />
                <div className={`projectBadge lifecycle-${p.lifecycle.toLowerCase()}`}>{p.lifecycle}</div>
                <div className="typeBadge">{p.type}</div>
              </div>
              <span>{p.projectNo}</span>
            </div>
            <h3>{p.name}</h3>
            <p>{p.customer} · {p.location||'Location TBD'}</p>
            <div className="projectFacts"><span>Manager: {p.lead}</span><span>Priority: {p.priority}</span></div>
            <div className="progress big"><span style={{width:`${p.progress}%`}}/></div>
            <div className="meta"><span>{p.progress}% complete</span><span>{p.status}</span></div>
            <div className="deadlineLine"><span>{p.deadline||'No deadline'}</span><b>{deadlineText(p.deadline)}</b></div>
            <p className="nextLine">Next: {p.next}</p>
            <button className="openHub">Open Project Hub</button>
          </article>)}
          {!visible.length&&<div className="empty">No projects in this view.</div>}
        </div>
      : <div className="panel trashList">
          <div className="panelHead"><h3>Project trash</h3><span>Restore or permanently delete</span></div>
          {deletedProjects.map(p=><div className="trashRow" key={p.id}>
            <div><b>{p.name}</b><small>{p.customer} · Deleted {p.deletedAt||'recently'}</small></div>
            <button onClick={()=>restoreProject(p.id)}>Restore</button>
            <button className="permanentDelete" onClick={()=>{if(window.confirm(`Permanently delete ${p.name}? This cannot be undone.`)){setDeletedProjects(deletedProjects.filter(x=>x.id!==p.id))}}}>Delete permanently</button>
          </div>)}
          {!deletedProjects.length&&<div className="empty">Trash is empty.</div>}
        </div>}
  </div>
}

function ProjectHub({project,projects,setProjects,people,tasks,setTasks,documents,materials,setMaterials,quotes,reports,setActive,deletedProjects,setDeletedProjects,setActiveProjectId,droneInspections,setDroneInspections}) {
  const [tab,setTab]=useState('overview');
  const [newTask,setNewTask]=useState('');
  const [materialForm,setMaterialForm]=useState({name:'',quantity:1,unit:'pcs',supplier:'',price:'',notes:''});

  if(!project)return <div className="content"><button onClick={()=>setActive('projects')}>Back to projects</button></div>;

  const crew=people.filter(p=>p.project===project.name||p.task?.includes(project.name)||p.detail?.includes(project.name));
  const projectTasks=tasks.filter(t=>t.project===project.name);
  const projectDocs=documents.filter(d=>d.project===project.name);
  const projectQuotes=quotes.filter(q=>q.title?.includes(project.name)||q.customer===project.customer);
  const projectReports=reports.filter(r=>r.vessel===project.name);
  const projectDrone=(droneInspections||[]).filter(d=>d.project===project.name);
  const projectMaterials=materials.filter(m=>m.project===project.name);

  function update(field,value){setProjects(projects.map(p=>p.id===project.id?{...p,[field]:value}:p))}
  function addTask(){
    if(!newTask.trim())return;
    setTasks([...tasks,{id:Date.now(),title:newTask.trim(),person:project.lead,priority:'Normal',status:'Planned',due:'This week',project:project.name}]);
    setNewTask('');
  }
  function moveTask(id){
    const order=['Planned','In progress','Waiting','Completed'];
    setTasks(tasks.map(t=>t.id===id?{...t,status:order[(order.indexOf(t.status)+1)%order.length]}:t));
  }
  function updateMaterial(field,value){setMaterialForm(current=>({...current,[field]:value}))}
  function addMaterial(){
    if(!materialForm.name.trim())return;
    setMaterials([...materials,{
      id:Date.now(),
      project:project.name,
      name:materialForm.name.trim(),
      quantity:Number(materialForm.quantity)||0,
      unit:materialForm.unit,
      supplier:materialForm.supplier,
      price:Number(materialForm.price)||0,
      notes:materialForm.notes,
      minimum:0
    }]);
    setMaterialForm({name:'',quantity:1,unit:'pcs',supplier:'',price:'',notes:''});
  }
  function removeMaterial(id){setMaterials(materials.filter(m=>m.id!==id))}
  function completeProject(){setProjects(projects.map(p=>p.id===project.id?{...p,lifecycle:'Completed',status:'Completed',progress:100,completedAt:new Date().toISOString().slice(0,10)}:p))}
  function archiveProject(){setProjects(projects.map(p=>p.id===project.id?{...p,lifecycle:'Archived',archivedAt:new Date().toISOString().slice(0,10)}:p))}
  function reopenProject(){setProjects(projects.map(p=>p.id===project.id?{...p,lifecycle:'Active',status:p.status==='Completed'?'Planning':p.status,archivedAt:'',completedAt:''}:p))}
  function duplicateProject(){
    const copy={...project,id:Date.now(),name:`${project.name} Copy`,projectNo:`${project.projectNo}-COPY`,lifecycle:'Active',status:'Planning',progress:0,completedAt:'',archivedAt:'',startDate:new Date().toISOString().slice(0,10)};
    setProjects([...projects,copy]);setActiveProjectId(copy.id);
  }
  function moveToTrash(){
    if(!window.confirm(`Move ${project.name} to trash?`))return;
    setDeletedProjects([...deletedProjects,{...project,deletedAt:new Date().toISOString().slice(0,10)}]);
    setProjects(projects.filter(p=>p.id!==project.id));
    setActiveProjectId(null);setActive('projects');
  }

  const tabs=[['overview','Overview'],['crew','Crew'],['documents','Documents'],['drone','Drone Inspection'],['tasks','Tasks'],['materials','Materials'],['commercial','Commercial'],['timeline','Timeline']];

  return <div className="content projectHub">
    <button className="backButton" onClick={()=>setActive('projects')}>← Back to projects</button>
    <section className="projectHero">
      <div>
        <div className="projectHeroTop"><span className={`healthLight ${String(project.health||'Green').toLowerCase()}`}/><span className="projectBadge">{project.status}</span><span>{project.type||'Vessel'} · {project.projectNo}</span></div>
        <h1>{project.name}</h1>
        <p>{project.customer} · IMO {project.imo||'N/A'} · {project.location||'TBD'}</p>
      </div>
      <div className="projectHeroRight">
        <div className="projectHeroStats">
          <div><strong>{project.progress}%</strong><small>Progress</small></div>
          <div><strong>{projectTasks.filter(t=>t.status!=='Completed').length}</strong><small>Open tasks</small></div>
          <div><strong>{projectDocs.length}</strong><small>Documents</small></div>
          <div><strong>{crew.length}</strong><small>Crew</small></div>
        </div>
        <div className="lifecycleActions">
          {(project.lifecycle||'Active')==='Active'&&<button onClick={completeProject}>Complete</button>}
          {(project.lifecycle||'Active')!=='Archived'&&<button onClick={archiveProject}>Archive</button>}
          {(project.lifecycle||'Active')!=='Active'&&<button onClick={reopenProject}>Reopen</button>}
          <button onClick={duplicateProject}>Duplicate</button>
          <button className="dangerAction" onClick={moveToTrash}>Move to trash</button>
        </div>
      </div>
    </section>

    <nav className="projectTabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>

    {tab==='overview'&&<section className="hubGrid">
      <div className="panel"><h3>Project details</h3><div className="detailGrid">
        <label>Status<select value={project.status} onChange={e=>update('status',e.target.value)}><option>Planning</option><option>Fabrication</option><option>Inspection</option><option>Mobilisation</option><option>Completed</option></select></label>
        <label>Project manager<select value={project.lead} onChange={e=>update('lead',e.target.value)}><option>Flemming</option><option>Jakob</option><option>Stefan</option></select></label>
        <label>Location<input value={project.location||''} onChange={e=>update('location',e.target.value)}/></label>
        <label>Deadline<input type="date" value={project.deadline||''} min={project.startDate||''} onClick={e=>e.currentTarget.showPicker?.()} onChange={e=>update('deadline',e.target.value)}/></label>
        <label>Priority<select value={project.priority||'Medium'} onChange={e=>update('priority',e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
        <label>Health<select value={project.health||'Green'} onChange={e=>update('health',e.target.value)}><option>Green</option><option>Yellow</option><option>Red</option></select></label>
        <label>Progress {project.progress}%<input type="range" min="0" max="100" value={project.progress} onChange={e=>update('progress',Number(e.target.value))}/></label>
        <label>Next milestone<input value={project.next||''} onChange={e=>update('next',e.target.value)}/></label>
      </div></div>
      <div className="panel"><h3>Readiness</h3>{[['Project plan',true],['Drawings',projectDocs.some(d=>d.category==='Drawings')],['Method Statement',projectDocs.some(d=>d.category==='Method Statements')],['Risk Assessment',projectDocs.some(d=>d.category==='Risk Assessments')],['Certificates',projectDocs.some(d=>d.category==='Certificates')],['Packing List',projectDocs.some(d=>d.category==='Packing Lists')]].map(([n,ok])=><div className="checkRow" key={n}><span className={ok?'ok':'missing'}>{ok?'✓':'!'}</span><b>{n}</b><em>{ok?'Ready':'Missing'}</em></div>)}</div>
      <div className="panel"><h3>Project notes</h3><textarea className="hubTextarea" value={project.notes||''} onChange={e=>update('notes',e.target.value)}/></div>
      <div className="panel"><h3>Next actions</h3>{projectTasks.filter(t=>t.status!=='Completed').slice(0,5).map(t=><div className="taskMini" key={t.id}><span className={t.priority==='High'?'dot danger':'dot'}/><div><b>{t.title}</b><small>{t.person} · {t.status}</small></div></div>)}</div>
    </section>}

    {tab==='crew'&&<section className="panel"><div className="peopleCards">{crew.length?crew.map(p=><article key={p.id}><div className="personHead"><div className="avatar">{p.name[0]}</div><div><h3>{p.name}</h3><small>{p.location} · {p.status}</small></div></div><p>{p.task}</p></article>):<div className="empty">Assign crew in People.</div>}</div></section>}
    {tab==='documents'&&<section className="panel"><div className="panelHead"><h3>Project documents</h3><button onClick={()=>setActive('documents')}>Open Document Center</button></div>{projectDocs.length?projectDocs.map(d=><div className="documentRow hubDoc" key={d.id}><div><b>{d.name}</b><small>{d.category} · V{d.version}</small></div><span>{d.date}</span></div>):<div className="empty">No documents uploaded.</div>}</section>}
    {tab==='drone'&&<DroneInspectionPanel project={project} inspections={projectDrone} allInspections={droneInspections||[]} setInspections={setDroneInspections}/>}
    {tab==='tasks'&&<section className="panel"><div className="hubTaskAdd"><input placeholder="New project task" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}/><button onClick={addTask}>Add task</button></div><div className="kanban four">{['Planned','In progress','Waiting','Completed'].map(s=><TaskColumn key={s} title={s} tasks={projectTasks.filter(t=>t.status===s)} cycle={moveTask}/>)}</div></section>}
    {tab==='materials'&&<section className="materialsHub">
      <div className="panel addMaterialPanel">
        <div className="panelHead"><h3>Add Material</h3><span>{project.name}</span></div>
        <div className="materialForm">
          <label>Material<input value={materialForm.name} onChange={e=>updateMaterial('name',e.target.value)} placeholder="SMO254 plate 6 mm"/></label>
          <label>Quantity<input type="number" min="0" value={materialForm.quantity} onChange={e=>updateMaterial('quantity',e.target.value)}/></label>
          <label>Unit<select value={materialForm.unit} onChange={e=>updateMaterial('unit',e.target.value)}><option>pcs</option><option>kg</option><option>m</option><option>plates</option><option>pipes</option><option>boxes</option><option>bottles</option></select></label>
          <label>Supplier<input value={materialForm.supplier} onChange={e=>updateMaterial('supplier',e.target.value)} placeholder="Supplier"/></label>
          <label>Purchase price<input type="number" min="0" value={materialForm.price} onChange={e=>updateMaterial('price',e.target.value)} placeholder="DKK"/></label>
          <label className="materialNotes">Remarks<input value={materialForm.notes} onChange={e=>updateMaterial('notes',e.target.value)}/></label>
          <button className="primaryBtn" onClick={addMaterial}>Save Material</button>
        </div>
      </div>
      <div className="panel"><div className="panelHead"><h3>Project Materials</h3><span>{projectMaterials.length}</span></div>
        {projectMaterials.length?projectMaterials.map(m=><div className="projectMaterialRow" key={m.id}><div><b>{m.name}</b><small>{m.supplier||'No supplier'} · {m.notes||'No remarks'}</small></div><span>{m.quantity} {m.unit}</span><span>{m.price?`DKK ${m.price.toLocaleString('da-DK')}`:'No price'}</span><button onClick={()=>removeMaterial(m.id)}>×</button></div>):<div className="empty">No materials added to this project.</div>}
      </div>
    </section>}
    {tab==='commercial'&&<section className="hubGrid"><div className="panel"><h3>Quotations</h3>{projectQuotes.length?projectQuotes.map(q=><div className="listRow" key={q.id}><div><b>{q.reference}</b><small>{q.title}</small></div><span>DKK {q.value.toLocaleString('da-DK')}</span><em>{q.status}</em></div>):<div className="empty">No linked quotations.</div>}</div><div className="panel"><h3>Service reports</h3>{projectReports.length?projectReports.map(r=><div className="listRow" key={r.id}><div><b>{r.title}</b><small>{r.vessel}</small></div><em>{r.status}</em></div>):<div className="empty">No linked reports.</div>}</div></section>}
    {tab==='timeline'&&<section className="panel timeline">{[[project.startDate||'TBD','Project created',project.customer],[project.deadline||'TBD','Deadline',project.location||'TBD']].map(([d,t,x],i)=><div className="timelineItem" key={i}><span/><div><small>{d}</small><b>{t}</b><p>{x}</p></div></div>)}</section>}
  </div>
}


function DroneInspectionPanel({ project, inspections, allInspections, setInspections }) {
  const [title,setTitle]=useState('');
  const [operator,setOperator]=useState('Flemming');
  const [notes,setNotes]=useState('');
  const [images,setImages]=useState(0);

  function addInspection(){
    if(!title.trim()) return;
    const inspection={
      id:Date.now(),
      project:project.name,
      title:title.trim(),
      date:new Date().toISOString().slice(0,10),
      operator,
      status:'Open',
      findings:0,
      images:Number(images)||0,
      notes
    };
    setInspections([inspection,...allInspections]);
    setTitle('');
    setNotes('');
    setImages(0);
  }

  function cycleStatus(id){
    const states=['Open','Review','Completed'];
    setInspections(allInspections.map(i=>i.id===id?{...i,status:states[(states.indexOf(i.status)+1)%states.length]}:i));
  }

  function updateFindings(id,amount){
    setInspections(allInspections.map(i=>i.id===id?{...i,findings:Math.max(0,(i.findings||0)+amount)}:i));
  }

  return <section className="hubGrid droneHub">
    <div className="panel">
      <div className="panelHead"><h3>New drone inspection</h3><span>{project.name}</span></div>
      <div className="droneForm">
        <label>Inspection title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Scrubber internal inspection" /></label>
        <label>Operator<select value={operator} onChange={e=>setOperator(e.target.value)}><option>Flemming</option><option>Jakob</option><option>Mathias</option><option>Magnus</option></select></label>
        <label>Image count<input type="number" min="0" value={images} onChange={e=>setImages(e.target.value)} /></label>
        <label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Inspection scope and observations" /></label>
        <button className="primaryBtn" onClick={addInspection}>Create drone inspection</button>
      </div>
    </div>

    <div className="panel">
      <div className="panelHead"><h3>Drone inspections</h3><span>{inspections.length}</span></div>
      {inspections.length ? inspections.map(item=><article className="droneInspectionCard" key={item.id}>
        <div className="droneInspectionTop"><div><b>{item.title}</b><small>{item.date} · {item.operator}</small></div><button onClick={()=>cycleStatus(item.id)}>{item.status}</button></div>
        <p>{item.notes || 'No notes'}</p>
        <div className="droneMetrics">
          <span><strong>{item.images}</strong><small>Images</small></span>
          <span><strong>{item.findings}</strong><small>Findings</small></span>
          <div><button onClick={()=>updateFindings(item.id,-1)}>-</button><button onClick={()=>updateFindings(item.id,1)}>+</button></div>
        </div>
      </article>) : <div className="empty">No drone inspections for this project.</div>}
    </div>
  </section>
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


function DocumentCenter({ documents, setDocuments, projects, session }) {
  const [search,setSearch]=useState('');
  const [project,setProject]=useState('All');
  const [category,setCategory]=useState('All');
  const [uploadProject,setUploadProject]=useState(projects[0]?.name || 'General');
  const [uploadCategory,setUploadCategory]=useState('Service Reports');
  const [message,setMessage]=useState('');

  const filtered = documents.filter(doc => {
    const matchesSearch = `${doc.name} ${doc.project} ${doc.category}`.toLowerCase().includes(search.toLowerCase());
    const matchesProject = project === 'All' || doc.project === project;
    const matchesCategory = category === 'All' || doc.category === category;
    return matchesSearch && matchesProject && matchesCategory;
  });

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        setMessage(`${file.name} er større end 2 MB. Azure Storage bliver nødvendig til store filer.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const existingVersions = documents
          .filter(d => d.name.toLowerCase() === file.name.toLowerCase() && d.project === uploadProject)
          .map(d => d.version || 1);
        const version = existingVersions.length ? Math.max(...existingVersions) + 1 : 1;

        const newDoc = {
          id: Date.now() + Math.random(),
          name: file.name,
          project: uploadProject || 'General',
          category: uploadCategory,
          version,
          size: formatSize(file.size),
          uploadedBy: session.name,
          date: new Date().toISOString().slice(0,10),
          dataUrl: reader.result
        };
        setDocuments(current => [newDoc, ...current]);
        setMessage(`${file.name} uploaded as version ${version}.`);
      };
      reader.onerror = () => setMessage(`Could not read ${file.name}.`);
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  function removeDocument(id) {
    setDocuments(documents.filter(d => d.id !== id));
  }

  function openDocument(doc) {
    if (!doc.dataUrl) {
      setMessage('This demo document has metadata only. Upload the real file to open it.');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name;
    link.click();
  }

  return <div className="content">
    <div className="sectionIntro documentIntro">
      <div><h1>Document Center</h1><p>Project documents, reports, drawings, certificates and photos.</p></div>
      <div className="documentCount"><strong>{documents.length}</strong><small>documents</small></div>
    </div>

    <section className="documentStats">
      {DOCUMENT_CATEGORIES.slice(0,6).map(cat => <div className="summaryCard" key={cat}><small>{cat}</small><strong>{documents.filter(d=>d.category===cat).length}</strong></div>)}
    </section>

    <section className="panel uploadPanel">
      <div>
        <small>Project</small>
        <select value={uploadProject} onChange={e=>setUploadProject(e.target.value)}>
          <option>General</option>
          {projects.map(p=><option key={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <small>Category</small>
        <select value={uploadCategory} onChange={e=>setUploadCategory(e.target.value)}>
          {DOCUMENT_CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}
        </select>
      </div>
      <label className="uploadButton">
        Upload files
        <input type="file" multiple onChange={uploadFiles} />
      </label>
      <span className="uploadNote">Local demo limit: 2 MB per file</span>
    </section>

    {message && <div className="documentMessage">{message}</div>}

    <section className="panel documentFilters">
      <input placeholder="Search document, vessel, project or category" value={search} onChange={e=>setSearch(e.target.value)} />
      <select value={project} onChange={e=>setProject(e.target.value)}>
        <option>All</option><option>General</option>{projects.map(p=><option key={p.id}>{p.name}</option>)}
      </select>
      <select value={category} onChange={e=>setCategory(e.target.value)}>
        <option>All</option>{DOCUMENT_CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}
      </select>
    </section>

    <section className="documentLayout">
      <div className="panel folderTree">
        <div className="panelHead"><h3>Projects</h3></div>
        <button className={project==='All'?'activeFolder':''} onClick={()=>setProject('All')}>All documents <span>{documents.length}</span></button>
        <button className={project==='General'?'activeFolder':''} onClick={()=>setProject('General')}>General <span>{documents.filter(d=>d.project==='General').length}</span></button>
        {projects.map(p=><button key={p.id} className={project===p.name?'activeFolder':''} onClick={()=>setProject(p.name)}>{p.name}<span>{documents.filter(d=>d.project===p.name).length}</span></button>)}
      </div>

      <div className="panel documentTable">
        <div className="documentHeader"><span>Name</span><span>Project</span><span>Category</span><span>Version</span><span>Date</span><span /></div>
        {filtered.length ? filtered.map(doc=><div className="documentRow" key={doc.id}>
          <button className="documentName" onClick={()=>openDocument(doc)}><b>{doc.name}</b><small>{doc.size} · Uploaded by {doc.uploadedBy}</small></button>
          <span>{doc.project}</span>
          <span>{doc.category}</span>
          <span className="versionBadge">V{doc.version}</span>
          <span>{doc.date}</span>
          <button className="deleteDocument" onClick={()=>removeDocument(doc.id)}>×</button>
        </div>) : <div className="empty">No documents match the selected filters.</div>}
      </div>
    </section>
  </div>
}

function Admin({people,setPeople,machines,setMachines,materials,setMaterials}) {
  function cyclePerson(id){const states=['Office','Workshop','Offshore','Travel','Course','Free'];setPeople(people.map(p=>p.id===id?{...p,location:states[(states.indexOf(p.location)+1)%states.length]}:p))}
  return <div className="content"><div className="sectionIntro"><h1>Administration</h1><p>Update personnel, machines and materials.</p></div>
    <div className="dashboardGrid">
      <div className="panel"><h3>Personnel location</h3>{people.map(p=><button className="listRow" key={p.id} onClick={()=>cyclePerson(p.id)}><div><b>{p.name}</b><small>{p.task}</small></div><em>{p.location}</em></button>)}</div>
      <div className="panel"><h3>Machine reset</h3><button className="primaryBtn" onClick={()=>setMachines(DEFAULT_MACHINES)}>Restore default machines</button></div>
      <div className="panel"><h3>Material reset</h3><button className="primaryBtn" onClick={()=>setMaterials(DEFAULT_MATERIALS)}>Restore default materials</button></div>
    </div>
  </div>
}

function AI({chat,setChat,voice,stats}) {
  const [text,setText]=useState('');
  function send(){
    if(!text.trim())return;
    const q=text; setChat([...chat,{from:'user',text:q}]); setText('');
    setTimeout(()=>{
      const lower=q.toLowerCase();
      let answer='I have registered your request. Shared database integration will make this fully operational across all users.';
      if(lower.includes('workshop')) answer=`Workshop status: ${stats.openTasks} open tasks, ${stats.lowStock} low-stock items and ${stats.machinesDown} machines requiring attention.`;
      else if(lower.includes('material')) answer=`There are ${stats.lowStock} materials below minimum stock.`;
      else if(lower.includes('machine')) answer=`There are ${stats.machinesDown} machines in service or out of service.`;
      else if(lower.includes('urgent')||lower.includes('haste')) answer=`There are ${stats.urgent} urgent tasks.`;
      setChat(c=>[...c,{from:'ai',text:answer}]); speak(answer,voice);
    },400)
  }
  return <div className="content aiLayout"><div className="sectionIntro"><h1>Right Hand AI</h1><p>Ask about workshop status, machines, materials and priorities.</p></div><div className="chatPanel">{chat.map((m,i)=><div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}<div className="chatInput"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask FSQ Right Hand..."/><button onClick={send}>Send</button></div></div></div>
}

function ModulePlaceholder({title}) { return <div className="content"><div className="sectionIntro"><h1>{title}</h1><p>This module is included in the navigation and ready for connection to the shared database.</p></div><div className="panel placeholder"><div className="core small"><div className="coreRing r1"/><div className="coreDot"/></div><h3>{title} module</h3><p>UI foundation ready. Database, files and approval workflows are the next deployment layer.</p></div></div> }

export default function Page(){ const [session,setSession]=useState(null); return session?<AppShell session={session} onLogout={()=>setSession(null)}/>:<Login onLogin={setSession}/> }
