'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const ROLE_DEFINITIONS = {
  Owner: ['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  'Co-Owner': ['manage_users','manage_permissions','manage_folder_access','view_all_projects','approve_tack','approve_final','complete_jobs','view_finance','system_health'],
  'Project Manager': ['view_all_projects','approve_tack','approve_final','complete_jobs'],
  Supervisor: ['view_all_projects'],
  Engineer: ['view_all_projects','edit_engineering','create_reports'],
  'QA Inspector': ['view_all_projects','approve_tack','approve_final'],
  Technician: ['view_assigned_jobs','upload_photos','update_assigned_jobs']
};

const FOLDER_ACCESS_LEVELS = ['No Access','Read','Edit','Full Control'];
const MANAGED_FOLDERS = ['Projects','Workshop','Marine','Drawings','Procedures','QA / QC','Reports','Drone','Certificates','Templates','Finance','HR','Management','Contracts','Customers'];
const DEFAULT_FOLDER_ACCESS = Object.fromEntries(MANAGED_FOLDERS.map(folder=>[folder,'No Access']));

const APP_VERSION = '10.3.0';

const USER_REGISTRY_DEFAULTS = [
  { id: 1, name: 'Flemming', role: 'Owner', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Owner, folderAccess: Object.fromEntries(MANAGED_FOLDERS.map(folder=>[folder,'Full Control'])) },
  { id: 2, name: 'Jakob', role: 'Co-Owner', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS['Co-Owner'], folderAccess: Object.fromEntries(MANAGED_FOLDERS.map(folder=>[folder,'Full Control'])) },
  { id: 3, name: 'Tommy', role: 'Technician', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Technician },
  { id: 4, name: 'Anders', role: 'Technician', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Technician },
  { id: 5, name: 'Mathias', role: 'Technician', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Technician },
  { id: 6, name: 'Magnus', role: 'Technician', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Technician },
  { id: 7, name: 'Kim', role: 'Technician', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Technician },
  { id: 8, name: 'Stefan', role: 'Engineer', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Engineer },
  { id: 9, name: 'QA', role: 'QA Inspector', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS['QA Inspector'] },
  { id: 10, name: 'Supervisor', role: 'Supervisor', password: 'fsq2027', active: true, permissions: ROLE_DEFINITIONS.Supervisor }
];

// Compatibility guard only. New code must use the user registry passed through props.
const USERS = USER_REGISTRY_DEFAULTS;

function normalizeUserRegistry(value) {
  if (!Array.isArray(value)) return USER_REGISTRY_DEFAULTS;
  const cleaned = value.filter(Boolean).map((user, index) => ({
    id: user.id ?? `user-${index + 1}`,
    name: String(user.name || '').trim(),
    role: user.role || 'Technician',
    password: user.password || 'fsq2027',
    active: user.active !== false,
    permissions: ['Flemming','Jakob'].includes(String(user.name||'').trim()) ? [...ROLE_DEFINITIONS[String(user.name||'').trim()==='Flemming'?'Owner':'Co-Owner']] : (Array.isArray(user.permissions) ? user.permissions : [...(ROLE_DEFINITIONS[user.role] || [])]),
    role: String(user.name||'').trim()==='Flemming' ? 'Owner' : (String(user.name||'').trim()==='Jakob' ? 'Co-Owner' : (user.role || 'Technician')),
    folderAccess: ['Flemming','Jakob'].includes(String(user.name||'').trim()) ? Object.fromEntries(MANAGED_FOLDERS.map(folder=>[folder,'Full Control'])) : {...DEFAULT_FOLDER_ACCESS,...(user.folderAccess||{})}
  })).filter(user => user.name);
  return cleaned.length ? cleaned : USER_REGISTRY_DEFAULTS;
}

function getActiveTechnicians(users) {
  return normalizeUserRegistry(users).filter(user => user.active !== false && user.role === 'Technician');
}

const NAV = [
  ['dashboard', 'Dashboard', '◈'],
  ['myjobs', 'My Jobs', '✓'],
  ['approvals', 'Job Approvals', '✓'],
  ['projects', 'Projects', '◫'],
  ['crew', 'People', '◉'],
  ['documents', 'Project Binder', '▱'],
  ['inventory', 'Lager Center', '▣'],
  ['planner', 'Operations Planner', '▦'],
  ['knowledge', 'ATLAS Knowledge', '▤'],
  ['ai', 'ATLAS AI', '◎'],
  ['health', 'System Health', '◌'],
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


const DEFAULT_BINDER_FOLDERS = [
  'Quotations',
  'Purchase Orders',
  'Drawings',
  'Method Statements',
  'Risk Assessments',
  'WPQR',
  'WPS',
  'Certificates',
  'NDT Reports',
  'Service Reports',
  'Packing Lists',
  'Photos',
  'Videos',
  'Drone Inspection',
  'QA / Punch List',
  'Archive'
];


const DEFAULT_KNOWLEDGE_FOLDERS = [
  { id: 1, name: 'Machine Manuals', description: 'Manufacturer manuals, alarm lists and maintenance instructions', accessFolder: 'Workshop' },
  { id: 2, name: 'Scrubber Repairs', description: 'Repair methods, lessons learned and technical references', accessFolder: 'Marine' },
  { id: 3, name: 'WPS & WPQR', description: 'Approved welding procedures and qualification records', accessFolder: 'QA / QC' },
  { id: 4, name: 'Safety Procedures', description: 'Risk assessments, LOTO and safe work instructions', accessFolder: 'Procedures' }
];

const DEFAULT_KNOWLEDGE_MACHINES = [
  { id: 1, name: 'Welding Robot', manufacturer: 'FSQ Workshop', model: 'Robot Cell 1', serial: '', location: 'Workshop', folderId: 1, notes: 'SMO254 and Super Duplex welding cell', status: 'Active' },
  { id: 2, name: 'Plasma Cutter', manufacturer: 'Hypertherm', model: '', serial: '', location: 'Workshop', folderId: 1, notes: 'Plasma cutting table and power source', status: 'Active' },
  { id: 3, name: 'Press Brake', manufacturer: 'SafanDarley', model: '', serial: '', location: 'Workshop', folderId: 1, notes: 'Hydraulic press brake', status: 'Active' }
];

const DEFAULT_KNOWLEDGE_DOCUMENTS = [];
const DEFAULT_KNOWLEDGE_SOLUTIONS = [];

function getGreeting(name) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning ${name}. Welcome to FSQ Command. ATLAS is online and ready to assist.`;
  if (hour < 18) return `Good afternoon ${name}. Welcome back to FSQ Command. ATLAS is online and ready to assist.`;
  return `Good evening ${name}. Welcome to FSQ Command. ATLAS is online and ready to assist.`;
}

function chooseEnglishFemaleVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferredNames = ['Sonia', 'Libby', 'Jenny', 'Aria', 'Samantha', 'Female'];
  return voices.find(v => v.lang?.toLowerCase().startsWith('en-gb') && preferredNames.some(n => v.name.toLowerCase().includes(n.toLowerCase())))
    || voices.find(v => v.lang?.toLowerCase().startsWith('en') && /sonia|libby|jenny|aria|samantha|female/i.test(v.name))
    || voices.find(v => v.lang?.toLowerCase().startsWith('en'))
    || voices[0]
    || null;
}



function canApproveTackAndComplete(session) {
  if (!session) return false;

  const name = String(session.name || session.user || session.username || '')
    .trim()
    .toLowerCase();

  return [
    'flemming',
    'flemming bach',
    'jakob',
    'jakob kjær danielsen',
    'jakob kjaer danielsen'
  ].includes(name);
}


function canManagePermissions(session) {
  if (!session) return false;

  const name = String(session.name || session.user || session.username || '')
    .trim()
    .toLowerCase();

  return ['flemming', 'flemming bach', 'jakob', 'jakob kjær danielsen', 'jakob kjaer danielsen'].includes(name);
}

function requirePermissionManager(session) {
  if (canManagePermissions(session)) return true;
  alert('Only Flemming or Jakob can assign or change user permissions.');
  return false;
}






function approvalIdentity(session) {
  return {
    approvedBy: session?.name || session?.user || session?.username || 'Unknown user',
    approvedRole: session?.role || 'Unknown role',
    approvedAt: new Date().toISOString()
  };
}


function isWorkshopProject(project) {
  if (!project) return false;
  const type = String(project.type || '').trim().toLowerCase();
  const location = String(project.location || '').trim().toLowerCase();
  return ['workshop', 'fabrication'].includes(type) || location.includes('workshop');
}

function workshopStageLabel(task) {
  return task.qaStage || task.jobStatus || 'Pending';
}

function speak(text, enabled) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.94;
  utterance.pitch = 1.08;
  const voice = chooseEnglishFemaleVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function useSpeechRecognition({ onResult, onError }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = event => {
      setListening(false);
      onError?.(event.error || 'microphone-error');
    };
    recognition.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) onResult?.(transcript);
    };
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [onResult, onError]);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      onError?.('not-supported');
      return;
    }
    if (listening) recognition.stop();
    else recognition.start();
  }

  return { listening, toggleListening, supported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition) };
}

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const hydrated = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data.value !== null) setValue(data.value);
          hydrated.current = true;
          return;
        }
      } catch {}
      try {
        const saved = localStorage.getItem(key);
        if (!cancelled && saved) setValue(JSON.parse(saved));
      } catch {}
      hydrated.current = true;
    }
    load();
    return () => { cancelled = true; };
  }, [key]);
  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    const timer = setTimeout(() => {
      fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [key, value]);
  return [value, setValue];
}

function Login({ onLogin, users }) {
  const [user, setUser] = useState(users[0]?.name || 'Flemming');
  const [password, setPassword] = useState('');
  const [voice, setVoice] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!users.some(item => item.name === user) && users[0]) setUser(users[0].name); }, [users, user]);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      const greeting = getGreeting(data.user.name);
      speak(greeting, voice);
      onLogin({ ...data.user, voice });
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setBusy(false); }
  }

  return (
    <main className="loginShell">
      <div className="gridGlow" />
      <section className="loginPanel">
        <div className="loginLogoGlow"><img src="/fsq-logo.jpg" alt="FSQ logo" /></div>
        <div className="brandRow"><span className="brandMark">FSQ</span><span>COMMAND</span></div>
        <p className="poweredBy">POWERED BY ATLAS</p>
        <p className="eyebrow">MARITIME · INDUSTRIAL · WORKSHOP</p>
        <h1>Your marine operations command center</h1>
        <p className="muted">Secure Azure SQL login for FSQ.</p>
        <form onSubmit={submit} className="loginForm">
          <label>User<select value={user} onChange={e => setUser(e.target.value)}>{users.filter(item=>item.active!==false).map(item => <option key={item.id}>{item.name}</option>)}</select></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
          <label className="voiceToggle"><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Voice greeting</label>
          {error && <div className="error">{error}</div>}
          <button className="primaryBtn" disabled={busy}>{busy ? 'CONNECTING…' : 'INITIALIZE SYSTEM'}</button>
        </form>
        <div className="systemLine"><span/> Azure SQL secured <span/> Workshop control active <span/> v8.0</div>
      </section>
    </main>
  );
}

function AppShell({ session, onLogout, users, setUsers }) {
  const [active, setActive] = useState(session.role === 'Technician' ? 'myjobs' : 'dashboard');
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
  const [knowledgeFolders, setKnowledgeFolders] = useStoredState('fsq-v72-knowledge-folders', DEFAULT_KNOWLEDGE_FOLDERS);
  const [knowledgeMachines, setKnowledgeMachines] = useStoredState('fsq-v72-knowledge-machines', DEFAULT_KNOWLEDGE_MACHINES);
  const [knowledgeDocuments, setKnowledgeDocuments] = useStoredState('fsq-v72-knowledge-documents', DEFAULT_KNOWLEDGE_DOCUMENTS);
  const [knowledgeSolutions, setKnowledgeSolutions] = useStoredState('fsq-v72-knowledge-solutions', DEFAULT_KNOWLEDGE_SOLUTIONS);
  const [chat, setChat] = useState([{ from: 'ai', text: `${getGreeting(session.name)} How can I assist you today?` }]);
  const [voice, setVoice] = useState(session.voice);
  const [voiceMessage,setVoiceMessage] = useState('');

  function handleGlobalVoiceCommand(transcript) {
    const command = transcript.toLowerCase();
    setVoiceMessage(transcript);
    if (command.includes('projektmappe') || command.includes('dokument')) setActive('documents');
    else if (command.includes('projekt')) setActive('projects');
    else if (command.includes('medarbejder') || command.includes('personale') || command.includes('folk')) setActive('crew');
    else if (command.includes('lager') || command.includes('gas') || command.includes('flaske') || command.includes('material')) setActive('inventory');
    else if (command.includes('plan') || command.includes('uge')) setActive('planner');
    else if (command.includes('system') || command.includes('health') || command.includes('status')) setActive('health');
    else if (command.includes('indstilling')) setActive('admin');
    else if (command.includes('manual') || command.includes('viden') || command.includes('knowledge') || command.includes('maskine')) setActive('knowledge');
    else if (command.includes('atlas') || command.includes('assistent') || command.includes('ai')) setActive('ai');
    else if (command.includes('dashboard') || command.includes('forside')) setActive('dashboard');
    else {
      setActive('ai');
      setChat(current => [...current,{from:'user',text:transcript}]);
    }
    speak(`I heard: ${transcript}`, voice);
  }

  const globalSpeech = useSpeechRecognition({
    onResult: handleGlobalVoiceCommand,
    onError: error => setVoiceMessage(error==='not-supported'?'Talegenkendelse understøttes ikke i denne browser. Brug Microsoft Edge eller Chrome.':'Mikrofonen kunne ikke startes. Kontrollér browserens mikrofontilladelse.')
  });

  const isTechnician = session.role === 'Technician';
  const visibleTasks = isTechnician ? tasks.filter(task => task.person === session.name) : tasks;
  const assignedProjectNames = new Set(visibleTasks.map(task => task.project));
  const visibleProjects = isTechnician ? projects.filter(project => assignedProjectNames.has(project.name)) : projects;
  const visibleNav = isTechnician
    ? NAV.filter(item => ['myjobs','inventory','knowledge','ai'].includes(item[0]))
    : NAV;

  const stats = useMemo(() => ({
    projects: visibleProjects.filter(p => p.status !== 'Completed').length,
    openTasks: visibleTasks.filter(t => t.status !== 'Completed').length,
    urgent: visibleTasks.filter(t => (t.priority === 'High' || t.due === 'Overdue') && t.status !== 'Completed').length,
    people: people.filter(p => !['Free', 'Off'].includes(p.status)).length,
    lowStock: materials.filter(m => m.quantity < m.minimum).length,
    machinesDown: machines.filter(m => ['Service','Out of service'].includes(m.status)).length
  }), [visibleProjects, visibleTasks, people, materials, machines]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="logo atlasBrand"><div className="sidebarLogoGlow"><img src="/fsq-logo.jpg" alt="FSQ" /></div><b>FSQ COMMAND</b><span>POWERED BY ATLAS</span><small>v{APP_VERSION}</small></div>
        <div className="online"><i/> ALL SYSTEMS OPERATIONAL</div>
        <nav>{visibleNav.map(([id, label, icon]) => <button key={id} onClick={() => setActive(id)} className={active === id ? 'active' : ''}><span>{icon}</span>{label}</button>)}</nav>
        <div className="userCard"><div className="avatar">{session.name[0]}</div><div><b>{session.name}</b><small>{session.role}</small></div><button onClick={onLogout}>↗</button></div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">FSQ OPERATIONS CONTROL</p><h2>{visibleNav.find(n => n[0] === active)?.[1] || 'FSQ Command'}</h2></div>
          <div className="topActions"><button className={`voiceCommand ${globalSpeech.listening?'listening':''}`} onClick={globalSpeech.toggleListening} title="Talk to ATLAS">{globalSpeech.listening?'● Listening...':'🎙 Talk to ATLAS'}</button><label><input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} /> Voice</label><span className="clock">{new Date().toLocaleDateString('da-DK')}</span></div>
        </header>
        {voiceMessage&&<div className="voiceStatus">{voiceMessage}</div>}

        {active === 'dashboard' && <Dashboard session={session} stats={stats} projects={visibleProjects} tasks={visibleTasks} people={people} machines={machines} materials={materials} quotes={quotes} droneInspections={droneInspections} setActive={setActive} />}
        {active === 'myjobs' && <MyJobs session={session} tasks={tasks} setTasks={setTasks} projects={projects} />}
        {active === 'approvals' && <JobApprovals session={session} tasks={tasks} setTasks={setTasks} projects={projects} />}
        {active === 'crew' && <CrewManagement people={people} setPeople={setPeople} projects={projects} />}
        {active === 'projects' && <Projects projects={projects} setProjects={setProjects} deletedProjects={deletedProjects} setDeletedProjects={setDeletedProjects} setActive={setActive} setActiveProjectId={setActiveProjectId} tasks={tasks} setTasks={setTasks} people={people} users={users} />}
        {active === 'projectHub' && <ProjectHub session={session} users={users} project={projects.find(p=>p.id===activeProjectId)} projects={projects} setProjects={setProjects} people={people} tasks={tasks} setTasks={setTasks} documents={documents} materials={materials} setMaterials={setMaterials} quotes={quotes} reports={reports} setActive={setActive} deletedProjects={deletedProjects} setDeletedProjects={setDeletedProjects} setActiveProjectId={setActiveProjectId} droneInspections={droneInspections} setDroneInspections={setDroneInspections} />}
        {active === 'documents' && <ProjectBinder documents={documents} setDocuments={setDocuments} projects={projects} session={session} />}
        {active === 'inventory' && <InventoryCenter session={session} />}
        {active === 'planner' && <OperationsPlanner people={people} projects={projects} />}
        {active === 'knowledge' && <KnowledgeBase session={session} users={users} folders={knowledgeFolders} setFolders={setKnowledgeFolders} machines={knowledgeMachines} setMachines={setKnowledgeMachines} documents={knowledgeDocuments} setDocuments={setKnowledgeDocuments} solutions={knowledgeSolutions} setSolutions={setKnowledgeSolutions} />}
        {active === 'health' && <SystemHealth session={session} users={users} projects={projects} documents={documents} knowledgeDocuments={knowledgeDocuments} knowledgeMachines={knowledgeMachines} />}
        {active === 'admin' && <Admin session={session} users={users} setUsers={setUsers} people={people} setPeople={setPeople} machines={machines} setMachines={setMachines} materials={materials} setMaterials={setMaterials} />}
        {active === 'ai' && <AI session={session} chat={chat} setChat={setChat} voice={voice} stats={stats} context={{projects:visibleProjects,tasks:visibleTasks,people,machines,materials,documents,knowledgeDocuments,knowledgeMachines,knowledgeSolutions}} />}
        {!['dashboard','myjobs','approvals','crew','projects','projectHub','documents','inventory','planner','health','admin','ai'].includes(active) && <ModulePlaceholder title={NAV.find(n=>n[0]===active)?.[1]} />}
      </main>
    </div>
  );
}

function MyJobs({ session, tasks, setTasks, projects }) {
  const [selectedId,setSelectedId]=useState(null);
  const [message,setMessage]=useState('');
  const [uploading,setUploading]=useState(false);
  const assigned=tasks.filter(task=>task.person===session.name);
  const selected=assigned.find(task=>task.id===selectedId) || assigned[0] || null;
  const project=projects.find(p=>p.name===selected?.project);
  const workshop=isWorkshopProject(project);

  function updateTask(id,changes){ setTasks(tasks.map(task=>task.id===id?{...task,...changes}:task)); }

  async function uploadPhotos(event){
    if(!selected)return;
    const files=Array.from(event.target.files||[]).filter(file=>file.type.startsWith('image/'));
    if(!files.length)return;
    setUploading(true);setMessage('Uploading photos to Azure...');
    try{
      const uploaded=[];
      for(const file of files){
        const form=new FormData();
        form.append('file',file);
        form.append('project',selected.project||'General');
        form.append('taskId',String(selected.id));
        form.append('technician',session.name);
        const response=await fetch('/api/job-photos',{method:'POST',body:form});
        const data=await response.json();
        if(!response.ok) throw new Error(data.error||`Upload failed for ${file.name}`);
        uploaded.push(data.photo);
      }
      const photos=[...(selected.photos||[]),...uploaded];
      updateTask(selected.id,{photos,photoStorage:'Azure Blob Storage'});
      setMessage(workshop
        ? `${uploaded.length} photo(s) uploaded. ${Math.max(0,4-photos.length)} remaining before final QC submission.`
        : `${uploaded.length} photo(s) uploaded.`);
    }catch(error){
      setMessage(`Upload failed: ${error.message}`);
    }finally{setUploading(false);event.target.value='';}
  }

  async function removePhoto(photo){
    if(!selected||!window.confirm(`Delete ${photo.name}?`))return;
    try{
      if(photo.blobName){
        const response=await fetch(`/api/job-photos?blob=${encodeURIComponent(photo.blobName)}`,{method:'DELETE'});
        if(!response.ok){const data=await response.json();throw new Error(data.error||'Delete failed');}
      }
      updateTask(selected.id,{photos:(selected.photos||[]).filter(item=>item.id!==photo.id)});
      setMessage('Photo deleted.');
    }catch(error){setMessage(`Delete failed: ${error.message}`)}
  }

  function startJob(){
    if(!selected)return;
    updateTask(selected.id,{
      jobStatus:'In progress',
      status:'In progress',
      qaStage:workshop?'Fit-up':'In progress',
      startedAt:new Date().toISOString(),
      startedBy:session.name
    });
    setMessage('Job started.');
  }

  function submitTack(){
    if(!selected||!workshop)return;
    updateTask(selected.id,{
      jobStatus:'Awaiting tack approval',
      status:'Waiting',
      qaStage:'Awaiting tack approval',
      tackSubmittedAt:new Date().toISOString(),
      tackSubmittedBy:session.name
    });
    setMessage('Fit-up submitted for tack approval by Flemming or Jakob.');
  }

  function startWelding(){
    if(!selected||!workshop||selected.qaStage!=='Tack approved')return;
    updateTask(selected.id,{
      jobStatus:'Welding',
      status:'In progress',
      qaStage:'Welding',
      weldingStartedAt:new Date().toISOString()
    });
    setMessage('Welding started.');
  }

  function submitFinalQC(){
    if(!selected||!workshop)return;
    const count=(selected.photos||[]).length;
    if(count<4){
      setMessage(`Cannot submit final QC. Upload ${4-count} more workshop photo(s).`);
      return;
    }
    updateTask(selected.id,{
      jobStatus:'Awaiting final QC',
      status:'Waiting',
      qaStage:'Awaiting final QC',
      finalSubmittedAt:new Date().toISOString(),
      finalSubmittedBy:session.name
    });
    setMessage('Job submitted for final QC by Flemming or Jakob.');
  }

  function finishMarineJob(){
    if(!selected||workshop)return;
    updateTask(selected.id,{
      jobStatus:'Completed',
      status:'Completed',
      completedAt:new Date().toISOString(),
      completedBy:session.name
    });
    setMessage('Marine job marked completed.');
  }

  if(!assigned.length)return <div className="content"><div className="sectionIntro"><h1>My Jobs</h1><p>No jobs are assigned to you.</p></div></div>;

  const photoCount=(selected?.photos||[]).length;
  const stage=workshopStageLabel(selected);
  const canStart=['Pending','Rejected','Needs rework'].includes(stage) || !selected.startedAt;
  const canSubmitTack=workshop && ['Fit-up','In progress'].includes(stage);
  const canStartWelding=workshop && stage==='Tack approved';
  const canSubmitFinal=workshop && stage==='Welding';
  const canFinishMarine=!workshop && ['In progress','Pending','Rejected'].includes(stage);

  return <div className="content technicianJobs">
    <div className="sectionIntro"><div><h1>My Jobs</h1><p>You only see jobs assigned to {session.name}.</p></div><span className="technicianRole">{workshop?'Workshop job':'Marine job'}</span></div>
    <section className="technicianLayout">
      <aside className="panel jobList">
        <div className="panelHead"><h3>Assigned jobs</h3><span>{assigned.length}</span></div>
        {assigned.map(job=>{
          const jobProject=projects.find(p=>p.name===job.project);
          const isWorkshop=isWorkshopProject(jobProject);
          const c=(job.photos||[]).length;
          const st=workshopStageLabel(job);
          return <button key={job.id} className={selected?.id===job.id?'active':''} onClick={()=>{setSelectedId(job.id);setMessage('')}}>
            <div><b>{job.title}</b><small>{job.project} · {job.due}</small></div>
            <span className={`jobState ${String(st).toLowerCase().replaceAll(' ','-')}`}>{st}</span>
            <em>{isWorkshop?`${c}/4 QC photos`:`${c} photos`}</em>
          </button>
        })}
      </aside>

      <main className="panel jobDetail">
        <div className="jobDetailHead"><div><small>{selected.project} · {project?.location||'Location TBD'}</small><h2>{selected.title}</h2><p>Assigned to {selected.person} · Priority {selected.priority}</p></div><span className={`jobState large ${String(stage).toLowerCase().replaceAll(' ','-')}`}>{stage}</span></div>

        {selected.rejectionReason&&<div className="rejectionBox"><b>Returned for rework</b><p>{selected.rejectionReason}</p></div>}

        {workshop&&<div className="workshopQcFlow">
          {['Fit-up','Awaiting tack approval','Tack approved','Welding','Awaiting final QC','QC approved / Released'].map((step,index)=><div key={step} className={stage===step?'active':stage==='Completed'&&index===5?'done':''}><span>{index+1}</span><small>{step}</small></div>)}
        </div>}

        {workshop&&<div className="photoGate">
          <div><strong>{photoCount}/4</strong><small>QC photos uploaded</small></div>
          <div className="gateProgress"><span style={{width:`${Math.min(100,photoCount/4*100)}%`}}/></div>
          <p>{photoCount<4?'Four workshop photos are required before final QC: fabrication, fit-up/welding, completed item and detail.':'Workshop photo requirement completed.'}</p>
        </div>}

        <label className={`jobPhotoUpload ${uploading?'busy':''}`}>{uploading?'Uploading...':'Upload photos to Azure'}<input disabled={uploading||['Awaiting tack approval','Awaiting final QC','QC approved / Released','Completed'].includes(stage)} type="file" accept="image/*" capture="environment" multiple onChange={uploadPhotos}/></label>
        <div className="jobPhotoGrid">{(selected.photos||[]).map(photo=><figure key={photo.id}><a href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.name}/></a><figcaption>{photo.name}<button onClick={()=>removePhoto(photo)}>×</button></figcaption></figure>)}</div>
        {message&&<div className="jobMessage">{message}</div>}

        <div className="jobActions">
          {canStart&&<button className="startJob" onClick={startJob}>Start Job</button>}
          {canSubmitTack&&<button className="finishJob" onClick={submitTack}>Submit Fit-up / Tack Approval</button>}
          {canStartWelding&&<button className="startJob" onClick={startWelding}>Start Welding</button>}
          {canSubmitFinal&&<button className="finishJob" disabled={photoCount<4} onClick={submitFinalQC}>Submit Final QC</button>}
          {canFinishMarine&&<button className="finishJob" onClick={finishMarineJob}>Complete Marine Job</button>}
        </div>

        {workshop&&stage==='Awaiting tack approval'&&<div className="pendingNotice approvalPending">Awaiting tack approval from Flemming or Jakob.</div>}
        {workshop&&stage==='Awaiting final QC'&&<div className="pendingNotice approvalPending">Awaiting final QC from Flemming or Jakob.</div>}
        {workshop&&stage==='QC approved / Released'&&<div className="approvalSuccess">✓ Released by {selected.approvedBy||'Flemming/Jakob'}</div>}
      </main>
    </section>
  </div>
}


function JobApprovals({session,tasks,setTasks,projects}){
  const allowed=canApproveTackAndComplete(session);
  const [reason,setReason]=useState({});

  const workshopTasks=tasks.filter(task=>{
    const project=projects.find(p=>p.name===task.project);
    return isWorkshopProject(project);
  });
  const tackPending=workshopTasks.filter(task=>task.qaStage==='Awaiting tack approval'||task.jobStatus==='Awaiting tack approval');
  const finalPending=workshopTasks.filter(task=>task.qaStage==='Awaiting final QC'||task.jobStatus==='Awaiting final QC');
  const recent=workshopTasks.filter(task=>['Tack approved','QC approved / Released','Needs rework'].includes(task.qaStage)).slice(-12).reverse();

  function update(id,changes){setTasks(tasks.map(task=>task.id===id?{...task,...changes}:task))}

  function approveTack(task){
    if(!allowed)return;
    update(task.id,{
      qaStage:'Tack approved',
      jobStatus:'Tack approved',
      status:'Waiting',
      tackApprovedBy:session.name,
      tackApprovedAt:new Date().toISOString(),
      rejectionReason:''
    });
  }

  function approveFinal(task){
    if(!allowed)return;
    if((task.photos||[]).length<4){
      alert('Final QC cannot be approved until four workshop photos are uploaded.');
      return;
    }
    update(task.id,{
      qaStage:'QC approved / Released',
      jobStatus:'QC approved / Released',
      status:'Completed',
      ...approvalIdentity(session),
      qcApprovedAt:new Date().toISOString(),
      completedAt:new Date().toISOString(),
      rejectionReason:''
    });
  }

  function reject(task,stage){
    if(!allowed)return;
    const text=(reason[task.id]||'').trim();
    if(!text){alert('Enter a rework reason before returning the job.');return;}
    update(task.id,{
      qaStage:'Needs rework',
      jobStatus:'Needs rework',
      status:'Waiting',
      rejectedStage:stage,
      rejectedBy:session.name,
      rejectedAt:new Date().toISOString(),
      rejectionReason:text
    });
    setReason(current=>({...current,[task.id]:''}));
  }

  if(!allowed)return <div className="content"><div className="sectionIntro"><h1>Workshop QC</h1><p>Only Flemming and Jakob can approve workshop fit-up and final QC.</p></div></div>;

  const renderCard=(task,stage)=>{
    const project=projects.find(p=>p.name===task.project);
    const isFinal=stage==='final';
    return <article className="approvalCard workshopApprovalCard" key={task.id}>
      <div className="approvalCardHead">
        <div><small>{task.project} · {project?.location||'Workshop'}</small><h3>{task.title}</h3><p>{task.person} · {isFinal?'Final QC':'Fit-up / Tack approval'}</p></div>
        <span>{(task.photos||[]).length} photos</span>
      </div>
      <div className="approvalPhotos">{(task.photos||[]).map(photo=><a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.name}/></a>)}</div>
      {isFinal&&(task.photos||[]).length<4&&<div className="qcWarning">Final QC locked: four workshop photos are required.</div>}
      <textarea placeholder="Rework reason required when rejecting" value={reason[task.id]||''} onChange={e=>setReason(current=>({...current,[task.id]:e.target.value}))}/>
      <div className="approvalActions">
        {isFinal
          ? <button className="approveButton" disabled={(task.photos||[]).length<4} onClick={()=>approveFinal(task)}>Approve Final QC & Release</button>
          : <button className="approveButton" onClick={()=>approveTack(task)}>Approve Fit-up / Tack</button>}
        <button className="rejectButton" onClick={()=>reject(task,stage)}>Return for Rework</button>
      </div>
    </article>
  };

  return <div className="content approvalsPage">
    <div className="sectionIntro"><div><h1>Workshop QC</h1><p>Workshop-only fit-up approval and final quality control.</p></div><span className="approvalRole">{session.name}</span></div>
    <section className="approvalGrid qcApprovalGrid">
      <div className="panel">
        <div className="panelHead"><h3>Awaiting Fit-up / Tack Approval</h3><span>{tackPending.length}</span></div>
        {tackPending.length?tackPending.map(task=>renderCard(task,'tack')):<div className="empty">No workshop fit-up approvals are waiting.</div>}
      </div>
      <div className="panel">
        <div className="panelHead"><h3>Awaiting Final QC</h3><span>{finalPending.length}</span></div>
        {finalPending.length?finalPending.map(task=>renderCard(task,'final')):<div className="empty">No workshop jobs are waiting for final QC.</div>}
      </div>
    </section>
    <section className="panel qcRecent">
      <div className="panelHead"><h3>Recent Workshop QC Decisions</h3><span>{recent.length}</span></div>
      {recent.map(task=><div className="approvalHistory" key={task.id}><div><b>{task.title}</b><small>{task.project} · {task.person}</small></div><span className={`jobState ${String(task.qaStage).toLowerCase().replaceAll(' ','-')}`}>{task.qaStage}</span></div>)}
      {!recent.length&&<div className="empty">No recent workshop QC decisions.</div>}
    </section>
  </div>
}


function Dashboard({ session, stats, projects, tasks, people, machines, materials, quotes, droneInspections, setActive }) {
  const activeProjects=projects.filter(project=>project.status!=='Completed' && project.lifecycle!=='Archived');
  const workshopProjects=activeProjects.filter(project=>['Workshop','Fabrication'].includes(project.type) || project.location?.toLowerCase().includes('workshop'));
  const marineProjects=activeProjects.filter(project=>['Marine','Vessel','Inspection'].includes(project.type));
  const workshopTaskList=tasks.filter(task=>{
    const project=projects.find(p=>p.name===task.project);
    return isWorkshopProject(project);
  });
  const pendingApprovals=workshopTaskList.filter(task=>['Awaiting tack approval','Awaiting final QC'].includes(task.qaStage)||['Awaiting tack approval','Awaiting final QC'].includes(task.jobStatus));
  const criticalJobs=tasks.filter(task=>(task.priority==='High'||task.priority==='Critical'||task.due==='Overdue') && task.status!=='Completed');
  const peopleWorking=people.filter(person=>!['Free','Off'].includes(person.status));
  const materialAlerts=materials.filter(material=>material.quantity<material.minimum);
  const openDrone=droneInspections.filter(item=>!['Completed','Closed'].includes(item.status));
  const quoteReplies=quotes.filter(quote=>['Draft','Awaiting approval','Sent','Awaiting reply'].includes(quote.status));
  const tackApprovals=workshopTaskList.filter(task=>task.qaStage==='Awaiting tack approval' || task.jobStatus==='Awaiting tack approval');
  const finalApprovals=workshopTaskList.filter(task=>task.qaStage==='Awaiting final QC' || task.jobStatus==='Awaiting final QC');
  const releasedToday=workshopTaskList.filter(task=>task.qaStage==='QC approved / Released' && task.qcApprovedAt && new Date(task.qcApprovedAt).toDateString()===new Date().toDateString());
  const visiblePeople=peopleWorking.slice(0,8);
  const machineStatus=(status)=>{
    if(['Out of service','Fault'].includes(status))return 'fault';
    if(status==='Service')return 'service';
    if(status==='In use')return 'running';
    return 'ready';
  };
  const greeting=new Date().getHours()<12?'GOOD MORNING':new Date().getHours()<18?'GOOD AFTERNOON':'GOOD EVENING';

  return <div className="content phase3Dashboard">
    <section className="commandHero">
      <div>
        <p className="eyebrow">{greeting}, {session.name.toUpperCase()}</p>
        <h1>FSQ Command</h1>
        <p className="commandSubtitle">Marine Operations Platform</p>
        <p>{activeProjects.length} active projects · {pendingApprovals.length} approvals waiting · {peopleWorking.length} people working today</p>
        <div className="heroActions"><button onClick={()=>setActive('projects')}>Open Projects</button><button onClick={()=>setActive('approvals')}>Approval Queue</button></div>
      </div>
      <div className="commandPulse"><div className="pulseRing"/><strong>{criticalJobs.length}</strong><span>CRITICAL JOBS</span></div>
    </section>

    <section className="atlasOperationsPanel">
      <div className="atlasOrb" aria-hidden="true"><span>ATLAS</span></div>
      <div className="atlasStatusText">
        <p className="panelEyebrow">AI OPERATIONS ASSISTANT</p>
        <h2>ATLAS online</h2>
        <p>Good {new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, {session.name}. All systems operational.</p>
      </div>
      <div className="atlasQuickStats">
        <span><b>{activeProjects.length}</b> active projects</span>
        <span><b>{pendingApprovals.length}</b> approvals waiting</span>
        <span><b>{materialAlerts.length}</b> material alerts</span>
        <span><b>{criticalJobs.length}</b> critical jobs</span>
      </div>
      <button onClick={()=>setActive('ai')}>ASK ATLAS</button>
    </section>

    <section className="phase3Kpis">
      <button className="phase3Kpi" onClick={()=>setActive('projects')}><span>ACTIVE PROJECTS</span><strong>{activeProjects.length}</strong><small>{marineProjects.length} marine · {workshopProjects.length} workshop</small></button>
      <button className="phase3Kpi" onClick={()=>setActive('projects')}><span>WORKSHOP JOBS</span><strong>{workshopProjects.length}</strong><small>{tasks.filter(task=>task.status==='In progress'&&workshopProjects.some(p=>p.name===task.project)).length} tasks in progress</small></button>
      <button className={`phase3Kpi ${pendingApprovals.length?'attention':''}`} onClick={()=>setActive('approvals')}><span>AWAITING APPROVAL</span><strong>{pendingApprovals.length}</strong><small>{tackApprovals.length} tack · {finalApprovals.length} final</small></button>
      <button className={`phase3Kpi ${criticalJobs.length?'danger':''}`} onClick={()=>setActive('projects')}><span>CRITICAL JOBS</span><strong>{criticalJobs.length}</strong><small>{criticalJobs.filter(task=>task.due==='Overdue').length} overdue</small></button>
      <button className="phase3Kpi" onClick={()=>setActive('crew')}><span>STAFF WORKING TODAY</span><strong>{peopleWorking.length}</strong><small>{peopleWorking.filter(person=>person.location==='Workshop').length} in workshop</small></button>
      <button className={`phase3Kpi ${materialAlerts.length?'attention':''}`} onClick={()=>setActive('projects')}><span>MATERIAL ALERTS</span><strong>{materialAlerts.length}</strong><small>Below minimum stock</small></button>
      <button className="phase3Kpi" onClick={()=>setActive('projects')}><span>DRONE INSPECTIONS</span><strong>{openDrone.length}</strong><small>{openDrone.reduce((sum,item)=>sum+(item.findings||0),0)} open findings</small></button>
      <button className="phase3Kpi" onClick={()=>setActive('projects')}><span>QUOTATIONS</span><strong>{quoteReplies.length}</strong><small>Awaiting action or reply</small></button>
    </section>

    <section className="phase3Grid">
      <div className="glassPanel liveOperations">
        <div className="panelHead"><div><p className="panelEyebrow">LIVE OPERATIONS</p><h3>Who is where</h3></div><button onClick={()=>setActive('crew')}>Manage people</button></div>
        <div className="livePeopleGrid">{visiblePeople.map(person=><article key={person.id} className="livePerson">
          <div className="avatar">{person.name[0]}</div>
          <div><b>{person.name}</b><small>{person.location} · {person.task}</small></div>
          <span className={`liveState ${person.status==='Working'||person.status==='Busy'||person.status==='On vessel'?'working':person.status==='Available'?'available':'waiting'}`}>{person.status}</span>
        </article>)}</div>
      </div>

      <div className="glassPanel qaPanel">
        <div className="panelHead"><div><p className="panelEyebrow">WORKSHOP QC</p><h3>Approval queue</h3></div><button onClick={()=>setActive('approvals')}>Open queue</button></div>
        <div className="qaMetric"><span>Awaiting tack approval</span><strong>{tackApprovals.length}</strong></div>
        <div className="qaMetric"><span>Awaiting final QC</span><strong>{finalApprovals.length}</strong></div>
        <div className="qaMetric"><span>Workshop QC waiting</span><strong>{pendingApprovals.length}</strong></div>
        <div className="qaMetric released"><span>Released today</span><strong>{releasedToday.length}</strong></div>
        <div className="approvalMiniList">{pendingApprovals.slice(0,4).map(task=><div key={task.id}><span className="statusDot warning"/><div><b>{task.title}</b><small>{task.project} · {task.person}</small></div></div>)}{!pendingApprovals.length&&<p className="emptySmall">No approvals are waiting.</p>}</div>
      </div>

      <div className="glassPanel marinePanel">
        <div className="panelHead"><div><p className="panelEyebrow">MARINE & PROJECTS</p><h3>Active project status</h3></div><button onClick={()=>setActive('projects')}>View all</button></div>
        {activeProjects.slice(0,6).map(project=><article className="commandProjectRow" key={project.id}>
          <div><b>{project.name}</b><small>{project.customer} · {project.location||'Location TBD'}</small></div>
          <div className="commandProjectProgress"><div><span style={{width:`${project.progress||0}%`}}/></div><em>{project.progress||0}%</em></div>
          <span className={`projectState ${String(project.status).toLowerCase().replaceAll(' ','-')}`}>{project.status}</span>
        </article>)}
      </div>

      <div className="glassPanel machinePanel">
        <div className="panelHead"><div><p className="panelEyebrow">WORKSHOP</p><h3>Machine status</h3></div><span>{machines.filter(machine=>['Service','Out of service'].includes(machine.status)).length} need attention</span></div>
        <div className="commandMachineGrid">{machines.map(machine=><article key={machine.id} className={`commandMachine ${machineStatus(machine.status)}`}>
          <span className="machineLight"/><div><b>{machine.name}</b><small>{machine.note}</small></div><em>{machine.status}</em>
        </article>)}</div>
      </div>

      <div className="glassPanel materialPanel">
        <div className="panelHead"><div><p className="panelEyebrow">SUPPLY</p><h3>Materials requiring action</h3></div><span>{materialAlerts.length}</span></div>
        {materialAlerts.map(material=><div className="materialAlertRow" key={material.id}><div><b>{material.name}</b><small>Minimum {material.minimum} {material.unit}</small></div><strong>{material.quantity} {material.unit}</strong></div>)}
        {!materialAlerts.length&&<p className="emptySmall">All materials are above minimum stock.</p>}
      </div>

      <div className="glassPanel priorityPanel">
        <div className="panelHead"><div><p className="panelEyebrow">PRIORITIES</p><h3>Critical and overdue work</h3></div><span>{criticalJobs.length}</span></div>
        {criticalJobs.slice(0,6).map(task=><article className="priorityCommandRow" key={task.id}><span className="alertIcon">!</span><div><b>{task.title}</b><small>{task.project} · {task.person} · {task.due}</small></div><em>{task.status}</em></article>)}
        {!criticalJobs.length&&<p className="emptySmall">No critical jobs.</p>}
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

function Projects({projects,setProjects,deletedProjects,setDeletedProjects,setActive,setActiveProjectId,tasks,setTasks,people,users}) {
  const today = new Date().toISOString().slice(0,10);
  const [showWizard,setShowWizard]=useState(false);
  const [wizardStep,setWizardStep]=useState(1);
  const [filter,setFilter]=useState('Active');
  const [search,setSearch]=useState('');
  const [form,setForm]=useState({
    type:'Workshop',
    customer:'',
    contact:'',
    name:'',
    imo:'',
    lead:'Flemming',
    location:'Workshop',
    startDate:today,
    deadline:'',
    status:'Planning',
    priority:'Medium',
    health:'Green',
    notes:'',
    crew:[]
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
      contact: project.contact || '',
      crew: project.crew || [],
      ...project
    };
  }

  const normalizedProjects = projects.map(normalizeProject);
  const nextProjectNumber = `FSQ-${new Date().getFullYear().toString().slice(-2)}${String(normalizedProjects.length + deletedProjects.length + 1).padStart(4,'0')}`;
  const activeTechnicians=(users||[]).filter(user=>user.active!==false && ['Technician','Welder','Fitter'].includes(user.role));
  const projectManagers=(users||[]).filter(user=>user.active!==false && ['Owner','Project Manager','Engineer'].includes(user.role));
  const isWorkshop=form.type==='Workshop';
  const isMarine=['Vessel','Inspection','Service'].includes(form.type);

  const workshopTasks=[
    'Material preparation',
    'Cutting / machining',
    'Fit-up',
    'Tack approval',
    'Welding',
    'Final QC',
    'Release'
  ];
  const marineTasks=[
    'Mobilisation preparation',
    'Execute assigned work',
    'Upload Work Done',
    'Upload Timesheet',
    'Demobilisation / handover'
  ];

  const requiredFolders=isWorkshop
    ? ['Drawings','WPS','WPQR','Material Certificates','QC Photos','QC Reports','Packing Lists','Archive']
    : ['Method Statements','Risk Assessments','Timesheets','Work Done','Service Reports','Photos','Certificates','Packing Lists','Archive'];

  function resetWizard(){
    setWizardStep(1);
    setForm({
      type:'Workshop',customer:'',contact:'',name:'',imo:'',lead:'Flemming',location:'Workshop',
      startDate:today,deadline:'',status:'Planning',priority:'Medium',health:'Green',notes:'',crew:[]
    });
  }

  function toggleCrew(name){
    setForm(current=>({
      ...current,
      crew:current.crew.includes(name)?current.crew.filter(item=>item!==name):[...current.crew,name]
    }));
  }

  function validateStep(){
    if(wizardStep===1 && (!form.name.trim() || !form.customer.trim())){
      alert('Project name and customer are required.');
      return false;
    }
    if(wizardStep===2 && !form.lead){
      alert('Select a project manager.');
      return false;
    }
    return true;
  }

  function nextStep(){
    if(!validateStep())return;
    setWizardStep(step=>Math.min(3,step+1));
  }

  function add(){
    if(!form.name.trim() || !form.customer.trim()) return;

    const project={
      id:Date.now(),
      ...form,
      projectNo:nextProjectNumber,
      lifecycle:'Active',
      archivedAt:'',
      completedAt:'',
      progress:0,
      next:isWorkshop?'Material preparation':'Mobilisation preparation',
      mobilisation:form.deadline,
      workflow:isWorkshop?'Workshop QC':'Marine documentation',
      requiredFolders
    };

    const standardTaskNames=isWorkshop?workshopTasks:marineTasks;
    const assignee=form.crew[0] || form.lead;
    const createdTasks=standardTaskNames.map((title,index)=>({
      id:Date.now()+index+1,
      title,
      person:assignee,
      priority:index===0?'High':'Normal',
      status:'Planned',
      jobStatus:'Pending',
      qaStage:isWorkshop && title==='Fit-up'?'Pending':'',
      photos:[],
      due:form.deadline||'This week',
      project:form.name,
      projectType:form.type,
      sequence:index+1
    }));

    setProjects([...normalizedProjects,project]);
    setTasks([...(tasks||[]),...createdTasks]);
    setShowWizard(false);
    resetWizard();
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
      <div><h1>Projects</h1><p>Open a complete Workshop or Marine project in three guided steps.</p></div>
      <button className="primaryBtn newProjectButton" onClick={()=>{setShowWizard(!showWizard);if(!showWizard)resetWizard()}}>{showWizard?'Close':'＋ Open New Project'}</button>
    </div>

    <div className="projectToolbar">
      <input className="projectSearch" placeholder="Search project, customer, number or location..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div className="projectFilters">
        {['Active',...typeFilters,'Completed','Archived','All'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}<span>{x==='All'?normalizedProjects.length:typeFilters.includes(x)?normalizedProjects.filter(p=>p.type===x).length:normalizedProjects.filter(p=>p.lifecycle===x).length}</span></button>)}
        <button className={filter==='Trash'?'active trashFilter':'trashFilter'} onClick={()=>setFilter('Trash')}>Trash<span>{deletedProjects.length}</span></button>
      </div>
    </div>

    {showWizard&&<section className="panel projectWizard projectOpeningWizard">
      <div className="wizardHeader">
        <div><h3>Open Project</h3><p>Project number: <b>{nextProjectNumber}</b></p></div>
        <div className="wizardSteps">{[1,2,3].map(step=><button key={step} className={wizardStep===step?'active':wizardStep>step?'done':''} onClick={()=>wizardStep>step&&setWizardStep(step)}><span>{wizardStep>step?'✓':step}</span><small>{step===1?'Project':step===2?'Team & setup':'Review'}</small></button>)}</div>
      </div>

      {wizardStep===1&&<div className="wizardStepBody">
        <div className="projectTypeCards">
          {[['Workshop','Workshop fabrication and QC'],['Vessel','Marine / vessel work'],['Inspection','Inspection job'],['Service','Service job'],['Internal','Internal FSQ project']].map(([type,desc])=><button key={type} className={form.type===type?'active':''} onClick={()=>{update('type',type);if(type==='Workshop')update('location','Workshop')}}><b>{type}</b><small>{desc}</small></button>)}
        </div>
        <div className="wizardGrid">
          <label>Customer *<input value={form.customer} onChange={e=>update('customer',e.target.value)} placeholder="Cadeler" /></label>
          <label>Customer contact<input value={form.contact} onChange={e=>update('contact',e.target.value)} placeholder="Name / email / phone" /></label>
          <label>Project / vessel name *<input value={form.name} onChange={e=>update('name',e.target.value)} placeholder={isWorkshop?'Stainless Frames':'Wind Orca'} /></label>
          <label>IMO number<input value={form.imo} onChange={e=>update('imo',e.target.value)} placeholder={isMarine?'IMO number':'Not required'} disabled={!isMarine} /></label>
          <label>Location<input value={form.location} onChange={e=>update('location',e.target.value)} placeholder={isWorkshop?'Workshop':'Port / vessel location'} /></label>
          <label>Priority<select value={form.priority} onChange={e=>update('priority',e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
          <label>Start date<input type="date" value={form.startDate} onClick={e=>e.currentTarget.showPicker?.()} onFocus={e=>e.currentTarget.showPicker?.()} onChange={e=>update('startDate',e.target.value)} /></label>
          <label>Deadline<input type="date" min={form.startDate} value={form.deadline} onClick={e=>e.currentTarget.showPicker?.()} onFocus={e=>e.currentTarget.showPicker?.()} onChange={e=>update('deadline',e.target.value)} /></label>
          <label className="wizardNotes">Scope / notes<textarea value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Short description of the project scope" /></label>
        </div>
      </div>}

      {wizardStep===2&&<div className="wizardStepBody">
        <div className="wizardGrid compactGrid">
          <label>Project manager<select value={form.lead} onChange={e=>update('lead',e.target.value)}>{projectManagers.length?projectManagers.map(user=><option key={user.id}>{user.name}</option>):<><option>Flemming</option><option>Jakob</option><option>Stefan</option></>}</select></label>
          <label>Initial status<select value={form.status} onChange={e=>update('status',e.target.value)}><option>Planning</option><option>Fabrication</option><option>Inspection</option><option>Mobilisation</option></select></label>
        </div>
        <div className="wizardSetupGrid">
          <div className="wizardSetupPanel">
            <div className="panelHead"><h3>Assign initial crew</h3><span>{form.crew.length} selected</span></div>
            <div className="crewSelector">
              {activeTechnicians.length?activeTechnicians.map(user=><button key={user.id} className={form.crew.includes(user.name)?'active':''} onClick={()=>toggleCrew(user.name)}><span>{user.name[0]}</span><div><b>{user.name}</b><small>{user.role}</small></div><em>{form.crew.includes(user.name)?'Selected':'Add'}</em></button>):people.map(person=><button key={person.id} className={form.crew.includes(person.name)?'active':''} onClick={()=>toggleCrew(person.name)}><span>{person.name[0]}</span><div><b>{person.name}</b><small>Technician</small></div><em>{form.crew.includes(person.name)?'Selected':'Add'}</em></button>)}
            </div>
          </div>
          <div className="wizardSetupPanel">
            <div className="panelHead"><h3>Automatic workflow</h3><span>{isWorkshop?'Workshop QC':'Marine'}</span></div>
            <ol className="workflowPreview">{(isWorkshop?workshopTasks:marineTasks).map(item=><li key={item}>{item}</li>)}</ol>
          </div>
          <div className="wizardSetupPanel">
            <div className="panelHead"><h3>Project folders</h3><span>{requiredFolders.length}</span></div>
            <div className="wizardFolders">{requiredFolders.map(folder=><span key={folder}>{folder}</span>)}</div>
          </div>
        </div>
      </div>}

      {wizardStep===3&&<div className="wizardStepBody reviewProject">
        <div className="reviewHero">
          <div><span className="typeBadge">{form.type}</span><h2>{form.name||'Project name'}</h2><p>{form.customer||'Customer'} · {form.location||'Location TBD'}</p></div>
          <strong>{nextProjectNumber}</strong>
        </div>
        <div className="reviewGrid">
          <div><small>Project manager</small><b>{form.lead}</b></div>
          <div><small>Start date</small><b>{form.startDate}</b></div>
          <div><small>Deadline</small><b>{form.deadline||'Not set'}</b></div>
          <div><small>Priority</small><b>{form.priority}</b></div>
          <div><small>Assigned crew</small><b>{form.crew.length?form.crew.join(', '):'Not assigned yet'}</b></div>
          <div><small>Workflow</small><b>{isWorkshop?'Workshop QC':'Marine documentation'}</b></div>
        </div>
        <div className="creationSummary">
          <h3>FSQ Command will create</h3>
          <p>1 project hub · {(isWorkshop?workshopTasks:marineTasks).length} standard tasks · {requiredFolders.length} project folders</p>
          {isWorkshop?<p className="reviewRule">Workshop rule: Fit-up approval and Final QC by Flemming/Jakob. Four QC photos required before final release.</p>:<p className="reviewRule">Marine rule: No four-photo requirement. Timesheet and Work Done folders are prepared for the later document phase.</p>}
        </div>
      </div>}

      <div className="wizardFooter">
        <button className="secondaryBtn" disabled={wizardStep===1} onClick={()=>setWizardStep(step=>Math.max(1,step-1))}>Back</button>
        {wizardStep<3?<button className="primaryBtn" onClick={nextStep}>Continue</button>:<button className="primaryBtn createProjectBtn" onClick={add}>Open Project</button>}
      </div>
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


function ProjectHub({session,users,project,projects,setProjects,people,tasks,setTasks,documents,materials,setMaterials,quotes,reports,setActive,deletedProjects,setDeletedProjects,setActiveProjectId,droneInspections,setDroneInspections}) {
  const [tab,setTab]=useState('overview');
  const [newTask,setNewTask]=useState('');
  const [newAssignee,setNewAssignee]=useState('Tommy');
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
    setTasks([...tasks,{id:Date.now(),title:newTask.trim(),person:newAssignee,priority:'Normal',status:'Planned',jobStatus:'Pending',photos:[],due:'This week',project:project.name}]);
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
    {tab==='tasks'&&<section className="panel"><div className="hubTaskAdd taskAssignBar"><input placeholder="New project task" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}/><select value={newAssignee} onChange={e=>setNewAssignee(e.target.value)}>{people.filter(person=>getActiveTechnicians(users).some(user=>user.name===person.name)).map(p=><option key={p.id}>{p.name}</option>)}</select><button onClick={addTask}>Assign task</button></div><div className="projectJobTable">{projectTasks.map(t=><div key={t.id}><div><b>{t.title}</b><small>{t.person} · {isWorkshopProject(project)?`${(t.photos||[]).length}/4 QC photos`:`${(t.photos||[]).length} photos`}</small></div><span className={`jobState ${(t.jobStatus||'Pending').toLowerCase().replaceAll(' ','-')}`}>{t.jobStatus||'Pending'}</span></div>)}</div></section>}
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




function InventoryCenter({ session }) {
  const [items,setItems]=useState([]);
  const [history,setHistory]=useState([]);
  const [canManage,setCanManage]=useState(['Owner','Co-Owner'].includes(session.role));
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [category,setCategory]=useState('Alle');
  const [showCreate,setShowCreate]=useState(false);
  const [draft,setDraft]=useState({name:'',sku:'',category:'Materialer',unit:'stk.',issueMode:'none',quantity:0,minimum:'',location:'',supplier:''});

  async function load(){
    setLoading(true);
    try{
      const response=await fetch('/api/inventory',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Lageret kunne ikke indlæses.');
      setItems(data.items||[]);setHistory(data.history||[]);setCanManage(Boolean(data.canManage));setMessage('');
    }catch(error){setMessage(error.message);}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  async function action(payload,success){
    setMessage('Gemmer...');
    try{
      const response=await fetch('/api/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Handlingen fejlede.');
      setMessage(success);await load();return true;
    }catch(error){setMessage(error.message);return false;}
  }

  async function issue(item){
    const labels={gas:'gasflaske',wire:'trådrulle',each:'stk.',meter:'meter',kg:'kg'};
    const variable=['meter','kg'].includes(item.issueMode);
    let quantity=1;
    if(variable){
      const raw=prompt(`Hvor mange ${labels[item.issueMode]} af ${item.name} er brugt?`,'1');
      if(raw===null)return;
      quantity=Number(String(raw).replace(',','.'));
      if(!Number.isFinite(quantity)||quantity<=0){setMessage('Skriv et gyldigt forbrug større end 0.');return;}
    }
    const label=labels[item.issueMode]||item.unit;
    if(!confirm(`Bekræft forbrug af ${quantity} ${label}: ${item.name}?

Forbruget trækkes fra lageret og registreres på ${session.name}.`))return;
    await action({action:'issue',itemId:item.id,quantity},`${item.name}: ${quantity} ${label} registreret på ${session.name}.`);
  }
  async function createItem(event){
    event.preventDefault();
    const ok=await action({action:'create',...draft},`${draft.name} er oprettet.`);
    if(ok){setShowCreate(false);setDraft({name:'',sku:'',category:'Materialer',unit:'stk.',issueMode:'none',quantity:0,minimum:'',location:'',supplier:''});}
  }
  async function adjust(item){
    const raw=prompt(`Justér lager for ${item.name}.\nBrug plus for modtagelse (fx 5) og minus for forbrug (fx -2).`, '1');
    if(raw===null)return;const change=Number(String(raw).replace(',','.'));
    if(!Number.isFinite(change)||change===0){setMessage('Skriv et gyldigt antal.');return;}
    await action({action:'adjust',itemId:item.id,change,note:'Manuel lagerjustering'},`${item.name} er justeret med ${change}.`);
  }
  async function editMinimum(item){
    const raw=prompt(`Minimumslager for ${item.name}.\nLad feltet være tomt, hvis minimum ikke er fastsat endnu.`,item.minimum??'');
    if(raw===null)return;
    const location=prompt(`Lagerplacering for ${item.name}:`,item.location||'') ?? item.location;
    const supplier=prompt(`Leverandør for ${item.name}:`,item.supplier||'') ?? item.supplier;
    const mode=prompt(`Medarbejderknap for ${item.name}:\nSkriv gas, wire, each, meter, kg eller none.`,item.issueMode||'none');
    if(mode===null)return;
    const issueMode=['gas','wire','each','meter','kg'].includes(mode.toLowerCase())?mode.toLowerCase():'none';
    await action({action:'update',itemId:item.id,minimum:raw,location,supplier,issueMode},`${item.name} er opdateret.`);
  }

  const categories=['Alle',...Array.from(new Set(items.map(i=>i.category))).sort()];
  const visible=category==='Alle'?items:items.filter(i=>i.category===category);
  const low=items.filter(i=>i.minimum!=null&&i.quantity<=i.minimum).length;
  const gasItems=items.filter(i=>i.category==='Gasflasker');

  return <section className="inventoryCenter">
    <div className="inventoryHero">
      <div><p className="eyebrow">FSQ WORKSHOP INVENTORY</p><h1>Lager Center</h1><p>Materialer, reservedele, forbrugsvarer og gasflasker samlet ét sted.</p></div>
      {canManage&&<button className="primaryBtn" onClick={()=>setShowCreate(true)}>＋ Opret nyt emne</button>}
    </div>
    {message&&<div className="inventoryMessage">{message}</div>}
    <div className="inventoryStats">
      <div><span>Aktive emner</span><b>{items.length}</b></div>
      <div><span>Gasarter</span><b>{gasItems.length}</b></div>
      <div><span>Under minimum</span><b>{low}</b></div>
      <div><span>Seneste registrering</span><b>{history[0]?.userName||'—'}</b></div>
    </div>

    <div className="inventoryGrid">
      <div className="inventoryMain panel">
        <div className="inventoryToolbar"><h3>Lagerbeholdning</h3><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
        {loading?<div className="emptyState">Indlæser lager...</div>:<div className="inventoryTableWrap"><table className="inventoryTable"><thead><tr><th>Emne</th><th>Kategori</th><th>Placering</th><th>På lager</th><th>Minimum</th><th>Status</th><th>Handling</th></tr></thead><tbody>
          {visible.map(item=>{const isLow=item.minimum!=null&&item.quantity<=item.minimum;return <tr key={item.id}>
            <td><b>{item.name}</b><small>{item.sku||'Automatisk varenr.'}{item.supplier?` · ${item.supplier}`:''}</small></td><td>{item.category}</td><td>{item.location||'—'}</td><td><strong>{item.quantity}</strong> {item.unit}</td><td>{item.minimum==null?'Ikke fastsat':`${item.minimum} ${item.unit}`}</td><td><span className={`stockBadge ${isLow?'low':'ok'}`}>{isLow?'Bestil':'OK'}</span></td><td><div className="inventoryActions">{item.issueMode==='gas'&&<button onClick={()=>issue(item)} disabled={item.quantity<=0}>☐ Skift gas</button>}{item.issueMode==='wire'&&<button onClick={()=>issue(item)} disabled={item.quantity<=0}>☐ Skift tråd</button>}{item.issueMode==='each'&&<button onClick={()=>issue(item)} disabled={item.quantity<=0}>☐ Tag 1 stk.</button>}{item.issueMode==='meter'&&<button onClick={()=>issue(item)} disabled={item.quantity<=0}>☐ Brug meter</button>}{item.issueMode==='kg'&&<button onClick={()=>issue(item)} disabled={item.quantity<=0}>☐ Brug kg</button>}{canManage&&<button onClick={()=>adjust(item)}>± Lager</button>}{canManage&&<button onClick={()=>editMinimum(item)}>Rediger</button>}</div></td>
          </tr>})}
          {!visible.length&&<tr><td colSpan="7" className="emptyState">Ingen emner i denne kategori.</td></tr>}
        </tbody></table></div>}
      </div>
      <aside className="inventoryHistory panel"><h3>Seneste lagerbevægelser</h3>{history.slice(0,12).map(row=><div className="historyRow" key={row.id}><div className={row.change<0?'minus':'plus'}>{row.change>0?'+':''}{row.change}</div><div><b>{row.itemName}</b><span>{row.action} · {row.userName}</span><small>{new Date(row.createdAt).toLocaleString('da-DK')}</small></div></div>)}{!history.length&&<div className="emptyState">Ingen registreringer endnu.</div>}</aside>
    </div>

    {showCreate&&<div className="modalBackdrop" onMouseDown={()=>setShowCreate(false)}><form className="inventoryModal" onSubmit={createItem} onMouseDown={e=>e.stopPropagation()}><div className="modalTitle"><div><p className="eyebrow">LAGER CENTER</p><h2>Opret nyt emne</h2></div><button type="button" onClick={()=>setShowCreate(false)}>×</button></div>
      <label>Navn<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Fx SMO254 plade eller Nitrogen" /></label>
      <div className="formGrid"><label>Varenummer (valgfrit – oprettes automatisk)<input value={draft.sku} onChange={e=>setDraft({...draft,sku:e.target.value})}/></label><label>Kategori<input list="inventoryCategories" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/><datalist id="inventoryCategories">{categories.filter(c=>c!=='Alle').map(c=><option key={c} value={c}/>)}</datalist></label></div>
      <div className="formGrid"><label>Enhed<input value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value})} placeholder="stk., meter, kg, flasker"/></label><label>Startbeholdning<input type="number" step="0.001" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:e.target.value})}/></label></div>
      <label>Medarbejderregistrering<select value={draft.issueMode} onChange={e=>setDraft({...draft,issueMode:e.target.value})}><option value="none">Ingen hurtigknap</option><option value="gas">Skift gasflaske (træk 1)</option><option value="wire">Skift trådrulle (træk 1)</option><option value="each">Tag 1 stk.</option><option value="meter">Registrér forbrug i meter</option><option value="kg">Registrér forbrug i kg</option></select></label>
      <div className="formGrid"><label>Leverandør<input value={draft.supplier} onChange={e=>setDraft({...draft,supplier:e.target.value})} placeholder="Fx Lemvigh-Müller"/></label><label>Placering<input value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})} placeholder="Fx Reol A3 eller Gaslager"/></label></div>
      <div className="formGrid"><label>Minimum (kan udfyldes senere)<input type="number" step="0.001" value={draft.minimum} onChange={e=>setDraft({...draft,minimum:e.target.value})}/></label><label>Ny kategori kan skrives direkte<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})} placeholder="Fx Hydraulik"/></label></div>
      <div className="modalActions"><button type="button" onClick={()=>setShowCreate(false)}>Annuller</button><button className="primaryBtn" type="submit">Opret emne</button></div>
    </form></div>}
  </section>;
}

function ProjectBinder({ documents, setDocuments, projects, session }) {
  const [selectedProject,setSelectedProject]=useState(projects[0]?.name || 'General');
  const [selectedFolder,setSelectedFolder]=useState('Drawings');
  const [selectedDocument,setSelectedDocument]=useState(null);
  const [search,setSearch]=useState('');
  const [message,setMessage]=useState('');
  const [newFolder,setNewFolder]=useState('');
  const [isDragging,setIsDragging]=useState(false);
  const [uploading,setUploading]=useState([]);
  const [loading,setLoading]=useState(true);
  const [customFolders,setCustomFolders]=useStoredState('fsq-v50-custom-folders',{});
  const fileInputRef=useRef(null);

  const projectFolders=[...DEFAULT_BINDER_FOLDERS,...(customFolders[selectedProject]||[])];
  const projectDocs=documents.filter(d=>d.project===selectedProject);
  const filtered=projectDocs.filter(d=>{
    const matchesFolder=d.category===selectedFolder;
    const matchesSearch=`${d.name} ${d.category} ${d.project}`.toLowerCase().includes(search.toLowerCase());
    return matchesFolder&&matchesSearch;
  });

  useEffect(()=>{
    let cancelled=false;
    async function loadDocuments(){
      setLoading(true);
      try{
        const response=await fetch('/api/project-documents',{cache:'no-store'});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Could not load Project Binder');
        if(!cancelled)setDocuments(data.documents||[]);
      }catch(error){
        if(!cancelled)setMessage(`Project Binder: ${error.message}`);
      }finally{
        if(!cancelled)setLoading(false);
      }
    }
    loadDocuments();
    return()=>{cancelled=true};
  },[setDocuments]);

  useEffect(()=>{setSelectedDocument(null)},[selectedProject,selectedFolder]);

  function formatSize(bytes){
    const value=Number(bytes||0);
    if(value<1024)return `${value} B`;
    if(value<1024*1024)return `${Math.round(value/1024)} KB`;
    return `${(value/1024/1024).toFixed(1)} MB`;
  }

  async function processFiles(fileList){
    const files=Array.from(fileList||[]);
    if(!files.length)return;
    if(!selectedFolder){setMessage('Select a folder before uploading.');return}
    for(const file of files){
      const uploadId=`${Date.now()}-${Math.random()}`;
      const versions=documents
        .filter(d=>d.name.toLowerCase()===file.name.toLowerCase()&&d.project===selectedProject&&d.category===selectedFolder)
        .map(d=>Number(d.version)||1);
      const version=versions.length?Math.max(...versions)+1:1;
      setUploading(current=>[...current,{id:uploadId,name:file.name,status:'Uploading'}]);
      setMessage(`Uploading ${file.name} to ${selectedProject} / ${selectedFolder}...`);
      try{
        const form=new FormData();
        form.append('file',file);
        form.append('project',selectedProject);
        form.append('category',selectedFolder);
        form.append('version',String(version));
        const response=await fetch('/api/project-documents',{method:'POST',body:form});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Upload failed');
        setDocuments(current=>[data.document,...current.filter(d=>d.id!==data.document.id)]);
        setSelectedDocument(data.document);
        setUploading(current=>current.map(u=>u.id===uploadId?{...u,status:data.document.status||'Completed'}:u));
        setMessage(`${file.name} uploaded to ${selectedProject} / ${selectedFolder}.`);
      }catch(error){
        setUploading(current=>current.map(u=>u.id===uploadId?{...u,status:`Failed: ${error.message}`}:u));
        setMessage(`${file.name}: ${error.message}`);
      }
    }
    setTimeout(()=>setUploading(current=>current.filter(u=>!String(u.status).startsWith('ATLAS')&&u.status!=='Completed')),5000);
  }

  function uploadFiles(event){
    processFiles(event.target.files);
    event.target.value='';
  }

  function handleDrop(event){
    event.preventDefault();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  }

  function openDocument(doc){
    if(doc?.url)window.open(doc.url,'_blank','noopener,noreferrer');
  }

  async function removeDocument(id){
    const doc=documents.find(item=>item.id===id);
    if(!doc||!window.confirm(`Delete ${doc.name} from Project Binder and ATLAS index?`))return;
    try{
      const response=await fetch(`/api/project-documents?id=${encodeURIComponent(doc.id)}&blob=${encodeURIComponent(doc.blobName)}`,{method:'DELETE'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Delete failed');
      setDocuments(current=>current.filter(d=>d.id!==id));
      if(selectedDocument?.id===id)setSelectedDocument(null);
      setMessage(`${doc.name} deleted.`);
    }catch(error){setMessage(error.message)}
  }

  function addFolder(){
    const folder=newFolder.trim();
    if(!folder)return;
    if(projectFolders.includes(folder)){setMessage('Folder already exists.');return}
    setCustomFolders({...customFolders,[selectedProject]:[...(customFolders[selectedProject]||[]),folder]});
    setSelectedFolder(folder);
    setNewFolder('');
  }

  const counts=projectFolders.reduce((acc,folder)=>{acc[folder]=projectDocs.filter(d=>d.category===folder).length;return acc},{});

  return <div className="content projectBinder">
    <div className="sectionIntro binderIntro">
      <div><h1>Project Binder</h1><p>Upload directly into the selected project folder. ATLAS indexes readable documents automatically.</p></div>
      <div className="binderTotal"><strong>{projectDocs.length}</strong><small>documents in project</small></div>
    </div>

    <section className="binderProjectBar">
      <label>Project<select value={selectedProject} onChange={e=>{setSelectedProject(e.target.value);setSelectedFolder('Drawings')}}>
        <option>General</option>{projects.map(p=><option key={p.id}>{p.name}</option>)}
      </select></label>
      <input placeholder="Search in selected folder..." value={search} onChange={e=>setSearch(e.target.value)} />
      <button className="primaryBtn" onClick={()=>fileInputRef.current?.click()}>+ Upload files</button>
      <input ref={fileInputRef} type="file" multiple hidden onChange={uploadFiles}/>
      <button onClick={()=>setSearch('')}>Clear search</button>
    </section>

    <div className="binderDestination">Upload destination: <b>{selectedProject} / {selectedFolder}</b></div>
    {message&&<div className="documentMessage">{message}</div>}

    <section className="binderEnterpriseLayout">
      <aside className="panel binderFolders">
        <div className="panelHead"><h3>{selectedProject}</h3><span>{projectFolders.length} folders</span></div>
        {projectFolders.map(folder=><button key={folder} className={selectedFolder===folder?'active':''} onClick={()=>setSelectedFolder(folder)}>
          <span>📁 {folder}</span><em>{counts[folder]||0}</em>
        </button>)}
        <div className="newFolderBox"><input placeholder="New folder" value={newFolder} onChange={e=>setNewFolder(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addFolder()}/><button onClick={addFolder}>Add</button></div>
      </aside>

      <main className="panel binderMain">
        <div className="binderHeader">
          <div><small>PROJECT BINDER / {selectedProject.toUpperCase()}</small><h2>📁 {selectedFolder}</h2></div>
          <div className="binderActions"><button className="primaryBtn" onClick={()=>fileInputRef.current?.click()}>+ Upload files</button></div>
        </div>

        <div className={`binderDropZone ${isDragging?'dragging':''}`} onDragEnter={e=>{e.preventDefault();setIsDragging(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setIsDragging(false)}} onDrop={handleDrop} onClick={()=>fileInputRef.current?.click()}>
          <strong>☁ Drag files here or click to upload</strong>
          <span>Files will be uploaded to: {selectedProject} / {selectedFolder}</span>
        </div>

        {uploading.length>0&&<div className="uploadQueue">{uploading.map(item=><div key={item.id}><span>{item.name}</span><em>{item.status}</em></div>)}</div>}

        <div className="binderTableHeader"><span>Name</span><span>Version</span><span>Size</span><span>Uploaded</span><span>Status</span><span/></div>
        {loading?<div className="binderEmpty"><h3>Loading documents...</h3></div>:filtered.length?filtered.map(doc=><div className={`binderRow ${selectedDocument?.id===doc.id?'selected':''}`} key={doc.id}>
          <button className="binderDocName" onClick={()=>setSelectedDocument(doc)}>
            <span className="fileIcon">{doc.name.toLowerCase().endsWith('.pdf')?'PDF':doc.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)?'IMG':doc.name.toLowerCase().match(/\.xlsx?$/)?'XLS':'FILE'}</span>
            <div><b>{doc.name}</b><small>{doc.uploadedBy} · {doc.category}</small></div>
          </button>
          <span className="versionBadge">V{doc.version}</span><span>{doc.size||formatSize(doc.sizeBytes)}</span><span>{doc.date}</span><span className="statusBadge">{doc.status||'Stored'}</span><button className="deleteDocument" onClick={()=>removeDocument(doc.id)}>×</button>
        </div>):<div className="binderEmpty"><div className="binderEmptyIcon">▱</div><h3>No documents in {selectedFolder}</h3><p>Drag files into the upload area above. They will be stored in this exact folder.</p></div>}
      </main>

      <aside className="panel binderPreview">
        {selectedDocument?<>
          <div className="panelHead"><h3>{selectedDocument.name}</h3><button onClick={()=>setSelectedDocument(null)}>×</button></div>
          {selectedDocument.mimeType==='application/pdf'?<iframe title={selectedDocument.name} src={selectedDocument.url}/>:selectedDocument.mimeType?.startsWith('image/')?<img src={selectedDocument.url} alt={selectedDocument.name}/>:<div className="binderPreviewPlaceholder"><span>FILE</span><p>Preview is available by opening the document.</p></div>}
          <div className="binderMeta"><div><small>Location</small><b>{selectedDocument.project} / {selectedDocument.category}</b></div><div><small>Version</small><b>V{selectedDocument.version}</b></div><div><small>Uploaded by</small><b>{selectedDocument.uploadedBy}</b></div><div><small>Status</small><b>{selectedDocument.status}</b></div></div>
          <button className="primaryBtn previewOpen" onClick={()=>openDocument(selectedDocument)}>Open file</button>
        </>:<div className="binderPreviewPlaceholder"><span>ATLAS</span><h3>Select a document</h3><p>Preview, metadata and ATLAS indexing status will appear here.</p></div>}
      </aside>
    </section>

    <section className="binderCommandStrip">
      <div><small>UPLOAD QUEUE</small><b>{uploading.length ? `${uploading.length} active` : 'Ready'}</b><span>{uploading.length ? uploading[uploading.length-1]?.status : 'All uploads processed'}</span></div>
      <div><small>ATLAS PROCESSING</small><b>{filtered.filter(d=>String(d.status||'').toLowerCase().includes('atlas')).length} ready</b><span>Text extraction and indexing</span></div>
      <div><small>STORAGE</small><b>Azure Blob Storage</b><span>{selectedProject} / {selectedFolder}</span></div>
      <div><small>FOLDER INSIGHT</small><b>{filtered.length} documents</b><span>{formatSize(filtered.reduce((sum,d)=>sum+Number(d.sizeBytes||0),0))} total size</span></div>
      <button onClick={()=>setMessage(`ATLAS context selected: ${selectedProject} / ${selectedFolder}`)}>Ask ATLAS about this folder</button>
    </section>
  </div>
}


function getIsoWeek(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-yearStart)/86400000)+1)/7);
}
function addDays(date,days){const d=new Date(date);d.setDate(d.getDate()+days);return d;}
function mondayOf(date){const d=new Date(date);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);d.setHours(0,0,0,0);return d;}

function monthStart(date){return new Date(date.getFullYear(),date.getMonth(),1);}
function monthEnd(date){return new Date(date.getFullYear(),date.getMonth()+1,0);}
function dateKey(date){return date.toISOString().slice(0,10);}

function OperationsPlanner({people,projects}){
  const [view,setView]=useState('planner');
  const [weeks,setWeeks]=useState(4);
  const [offset,setOffset]=useState(0);
  const [monthOffset,setMonthOffset]=useState(0);
  const [entries,setEntries]=useStoredState('fsq-v71-planner',[]);
  const [selectedPerson,setSelectedPerson]=useState('All');
  const [filterType,setFilterType]=useState('All');
  const start=addDays(mondayOf(new Date()),offset*7);
  const days=Array.from({length:weeks*7},(_,i)=>addDays(start,i));
  const dayNames=['Man','Tir','Ons','Tor','Fre','Lør','Søn'];
  const typeColors={Marine:'marine',Workshop:'workshop',Inspection:'inspection',Travel:'travel',Course:'course',Holiday:'holiday',Office:'office',Free:'free'};

  function saveEntry(person,date,currentEntry){
    const defaultText=currentEntry?.text||'';
    const text=window.prompt(`Plan for ${person} - ${date.toLocaleDateString('da-DK')}`,defaultText);
    if(text===null)return;
    const trimmed=text.trim();
    if(!trimmed){
      setEntries(entries.filter(e=>!(e.person===person&&e.date===dateKey(date))));
      return;
    }
    const suggested=currentEntry?.type||projects.find(p=>trimmed.toLowerCase().includes(p.name.toLowerCase()))?.type||'Workshop';
    const type=window.prompt('Type: Marine, Workshop, Inspection, Travel, Course, Holiday, Office, Free',suggested)||suggested;
    const project=currentEntry?.project||projects.find(p=>trimmed.toLowerCase().includes(p.name.toLowerCase()))?.name||'';
    const note=window.prompt('Projekt / ekstra note (valgfrit)',project)||project;
    const key=`${person}|${dateKey(date)}`;
    const next={key,person,date:dateKey(date),text:trimmed,type,project:note};
    setEntries([...entries.filter(e=>e.key!==key),next]);
  }

  const visiblePeople=selectedPerson==='All'?people:people.filter(p=>p.name===selectedPerson);
  const visibleEntries=entries.filter(e=>filterType==='All'||e.type===filterType);

  const currentMonth=new Date(new Date().getFullYear(),new Date().getMonth()+monthOffset,1);
  const monthGridStart=mondayOf(monthStart(currentMonth));
  const monthGridEnd=addDays(mondayOf(addDays(monthEnd(currentMonth),7)),6);
  const monthDays=[];
  for(let d=new Date(monthGridStart);d<=monthGridEnd;d=addDays(d,1))monthDays.push(new Date(d));
  while(monthDays.length>42)monthDays.pop();
  const monthLabel=currentMonth.toLocaleDateString('da-DK',{month:'long',year:'numeric'});

  return <div className="content plannerPage">
    <div className="sectionIntro plannerIntro">
      <div><h1>Operations Planner & Kalender</h1><p>Planlæg ressourcer uge for uge og se alle aktiviteter i en almindelig kalender.</p></div>
      <div className="plannerViewTabs"><button className={view==='planner'?'active':''} onClick={()=>setView('planner')}>Ressourceplan</button><button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}>Månedskalender</button></div>
    </div>

    <div className="plannerFilterBar">
      <label>Medarbejder<select value={selectedPerson} onChange={e=>setSelectedPerson(e.target.value)}><option>All</option>{people.map(p=><option key={p.id}>{p.name}</option>)}</select></label>
      <label>Type<select value={filterType} onChange={e=>setFilterType(e.target.value)}><option>All</option>{Object.keys(typeColors).map(t=><option key={t}>{t}</option>)}</select></label>
      <div className="plannerLegend compact"><span className="legendMarine">Marine</span><span className="legendWorkshop">Workshop</span><span className="legendTravel">Rejse</span><span className="legendHoliday">Ferie</span><span className="legendCourse">Kursus</span></div>
    </div>

    {view==='planner'?<>
      <div className="plannerControls plannerTopControls"><button onClick={()=>setOffset(offset-weeks)}>← Forrige</button><select value={weeks} onChange={e=>setWeeks(Number(e.target.value))}>{[1,2,4,8,12].map(n=><option key={n} value={n}>{n} uger</option>)}</select><button onClick={()=>setOffset(0)}>I dag</button><button onClick={()=>setOffset(offset+weeks)}>Næste →</button></div>
      <div className="plannerScroll"><div className="plannerGrid" style={{gridTemplateColumns:`170px repeat(${days.length},minmax(96px,1fr))`}}><div className="plannerCorner">Medarbejder</div>{days.map((d,i)=><div className={`plannerDayHead ${i%7>=5?'weekend':''}`} key={d.toISOString()}><b>{dayNames[i%7]}</b><span>{d.getDate()}/{d.getMonth()+1}</span><small>Uge {getIsoWeek(d)}</small></div>)}{visiblePeople.map(person=><div className="plannerRow" key={person.id} style={{display:'contents'}}><div className="plannerPerson"><b>{person.name}</b><small>{person.location}</small></div>{days.map((d,i)=>{const key=`${person.name}|${dateKey(d)}`;const entry=visibleEntries.find(e=>e.key===key);return <button className={`plannerCell ${i%7>=5?'weekend':''} ${entry?'booked':''} ${entry?typeColors[entry.type]||'workshop':''}`} key={key} onClick={()=>saveEntry(person.name,d,entries.find(e=>e.key===key))} title="Klik for at oprette eller redigere plan">{entry?<><b>{entry.text}</b>{entry.project&&<small>{entry.project}</small>}</>:'+'}</button>})}</div>)}</div></div>
      <div className="plannerLegend"><span>Alle uger viser mandag-søndag</span><span>{projects.length} projekter tilgængelige</span><span>Klik på en celle for at planlægge</span></div>
    </>:<>
      <div className="calendarToolbar"><button onClick={()=>setMonthOffset(monthOffset-1)}>←</button><button onClick={()=>setMonthOffset(0)}>Denne måned</button><h2>{monthLabel}</h2><button onClick={()=>setMonthOffset(monthOffset+1)}>→</button></div>
      <div className="monthCalendar"><div className="monthWeekdays">{dayNames.map(n=><div key={n}>{n}</div>)}</div><div className="monthGrid">{monthDays.map(d=>{const inMonth=d.getMonth()===currentMonth.getMonth();const dayEntries=visibleEntries.filter(e=>e.date===dateKey(d)&&(selectedPerson==='All'||e.person===selectedPerson));return <div className={`monthDay ${!inMonth?'outside':''} ${[0,6].includes(d.getDay())?'weekend':''}`} key={dateKey(d)}><header><b>{d.getDate()}</b><span>Uge {getIsoWeek(d)}</span></header><div className="monthEvents">{dayEntries.slice(0,6).map(e=><button key={e.key} className={`monthEvent ${typeColors[e.type]||'workshop'}`} onClick={()=>saveEntry(e.person,d,e)} title={`${e.person}: ${e.text}`}><strong>{e.person}</strong><span>{e.text}</span></button>)}{dayEntries.length>6&&<small>+{dayEntries.length-6} flere</small>}</div><button className="monthAdd" onClick={()=>{const person=selectedPerson==='All'?(window.prompt('Medarbejder',people[0]?.name||'')||''):selectedPerson;if(person)saveEntry(person,d,null)}}>+</button></div>})}</div></div>
      <div className="plannerLegend"><span>Klik på + for at tilføje</span><span>Klik på en aktivitet for at redigere eller slette</span><span>Kalenderen bruger samme data som ressourceplanen</span></div>
    </>}
  </div>
}

function SystemHealth({session,users,projects,documents,knowledgeDocuments=[],knowledgeMachines=[]}){
  const allowed=canManagePermissions(session);
  if(!allowed)return <div className="content"><div className="sectionIntro"><h1>System Health</h1><p>Kun Flemming og Jakob har adgang til systemstatus.</p></div></div>;
  const items=[['FSQ Command','Operational'],['Azure App Service','Operational'],['Azure Blob Storage','Configured'],['Shared Database','Azure SQL · Managed Identity'],['User Registry',`${users.filter(u=>u.active).length} active users`],['Project Data',`${projects.length} projects`],['Document Index',`${documents.length} documents`],['ATLAS Knowledge',`${knowledgeDocuments.length} files · ${knowledgeMachines.length} machines`],['Application Version',`v${APP_VERSION}`]];
  return <div className="content healthPage"><div className="sectionIntro"><div><h1>System Health</h1><p>Administratorstatus for FSQ Command.</p></div><div className="healthOverall"><i/> ALL SYSTEMS OPERATIONAL</div></div><div className="healthGrid">{items.map(([name,status])=><article key={name}><div className="healthIcon">◉</div><small>{name}</small><strong>{status}</strong><span>{new Date().toLocaleString('da-DK')}</span></article>)}</div><section className="panel healthNote"><h3>Database status</h3><p>Version 8.0 synkroniserer brugere, rettigheder og driftsdata med Azure SQL. Browserens lokale lager bruges kun som midlertidig fallback. Filer og billeder gemmes fortsat i Azure Blob Storage.</p></section></div>
}

function Admin({session,users,setUsers,people,setPeople,machines,setMachines,materials,setMaterials}) {
  const [newUser,setNewUser]=useState({name:'',role:'Technician',password:'fsq2027'});
  const [message,setMessage]=useState('');
  const [passwordDrafts,setPasswordDrafts]=useState({});
  const [visiblePasswords,setVisiblePasswords]=useState({});
  const owner=canManagePermissions(session);
  const roles=Object.keys(ROLE_DEFINITIONS);

  function cyclePerson(id){const states=['Office','Workshop','Offshore','Travel','Course','Free'];setPeople(people.map(p=>p.id===id?{...p,location:states[(states.indexOf(p.location)+1)%states.length]}:p))}
  function changeRole(id,role){
    if(!owner){setMessage('Only Flemming or Jakob can assign roles and permissions.');return;}
    setUsers(users.map(user=>user.id===id?{...user,role,permissions:[...(ROLE_DEFINITIONS[role]||[])]}:user));
    setMessage('Role and default permissions updated.');
  }
  function togglePermission(id,permission){
    if(!owner){setMessage('Only Flemming or Jakob can assign roles and permissions.');return;}
    setUsers(users.map(user=>user.id===id?{...user,permissions:(user.permissions||[]).includes(permission)?(user.permissions||[]).filter(item=>item!==permission):[...(user.permissions||[]),permission]}:user));
  }
  function toggleActive(id){
    if(!owner){setMessage('Only Flemming or Jakob can lock or unlock users.');return;}
    const target=users.find(user=>user.id===id);
    if(target?.name==='Flemming'){setMessage('The owner account cannot be locked.');return;}
    setUsers(users.map(user=>user.id===id?{...user,active:!user.active}:user));
  }
  function addUser(){
    if(!owner){setMessage('Only Flemming or Jakob can create users.');return;}
    const name=newUser.name.trim();
    if(!name){setMessage('Enter a user name.');return;}
    if(users.some(user=>user.name.toLowerCase()===name.toLowerCase())){setMessage('This user already exists.');return;}
    const role=newUser.role;
    setUsers([...users,{id:Date.now(),name,role,password:newUser.password||'fsq2027',active:true,permissions:[...(ROLE_DEFINITIONS[role]||[])]}]);
    setNewUser({name:'',role:'Technician',password:'fsq2027'});
    setMessage('User created.');
  }
  function changeFolderAccess(id,folder,level){
    if(!owner){setMessage('Only Flemming or Jakob can manage folder access.');return;}
    setUsers(users.map(user=>user.id===id?{...user,folderAccess:{...DEFAULT_FOLDER_ACCESS,...(user.folderAccess||{}),[folder]:level}}:user));
    setMessage('Folder access updated.');
  }
  function setUserPassword(id){
    if(!owner){setMessage('Only Flemming or Jakob can assign passwords.');return;}
    const password=String(passwordDrafts[id]||'');
    if(password.length<6){setMessage('Password must contain at least 6 characters.');return;}
    const target=users.find(user=>user.id===id);
    setUsers(users.map(user=>user.id===id?{...user,password}:user));
    setPasswordDrafts(current=>({...current,[id]:''}));
    setMessage(`Password updated for ${target?.name||'user'}.`);
  }
  function generatePassword(id){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
    let password='';
    for(let i=0;i<12;i+=1) password+=chars[Math.floor(Math.random()*chars.length)];
    setPasswordDrafts(current=>({...current,[id]:password}));
    setVisiblePasswords(current=>({...current,[id]:true}));
  }
  function deleteUser(id){
    if(!owner){setMessage('Only Flemming or Jakob can delete users.');return;}
    const target=users.find(user=>user.id===id);
    if(target?.name==='Flemming'){setMessage('The owner account cannot be deleted.');return;}
    if(window.confirm(`Delete ${target?.name}?`)) setUsers(users.filter(user=>user.id!==id));
  }

  const allPermissions=[...new Set(Object.values(ROLE_DEFINITIONS).flat())];
  return <div className="content"><div className="sectionIntro"><div><h1>Users & Permissions</h1><p>Phase 2 access control for FSQ Command.</p></div><div className={`ownerBadge ${owner?'ok':'locked'}`}>{owner?'OWNER CONTROL: ACTIVE':'READ ONLY'}</div></div>
    {message&&<div className="documentMessage">{message}</div>}
    {!owner&&<div className="permissionWarning">Only Flemming or Jakob can create users, change roles, assign permissions, manage folder access, lock accounts or delete users.</div>}
    <section className="panel userAdminPanel">
      <div className="panelHead"><h3>User accounts</h3><span>{users.filter(user=>user.active).length} active</span></div>
      {owner&&<div className="newUserForm"><input placeholder="Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})}/><select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>{roles.map(role=><option key={role}>{role}</option>)}</select><input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/><button onClick={addUser}>Create user</button></div>}
      <div className="userPermissionList">{users.map(user=><article className={`userPermissionCard ${!user.active?'inactive':''}`} key={user.id}>
        <div className="userPermissionTop"><div className="avatar">{user.name[0]}</div><div><h3>{user.name}</h3><small>{user.active?'Active':'Locked'} · {user.role}</small></div><select disabled={!owner||['Flemming','Jakob'].includes(user.name)} value={user.role} onChange={e=>changeRole(user.id,e.target.value)}>{roles.map(role=><option key={role}>{role}</option>)}</select></div>
        <div className="passwordAdminRow"><div><h4>Login password</h4><small>Flemming and Jakob can assign a new password. The existing password is never displayed.</small></div><div className="passwordControls"><input type={visiblePasswords[user.id]?'text':'password'} disabled={!owner} placeholder="New password (min. 6 characters)" value={passwordDrafts[user.id]||''} onChange={e=>setPasswordDrafts(current=>({...current,[user.id]:e.target.value}))}/><button type="button" disabled={!owner} onClick={()=>setVisiblePasswords(current=>({...current,[user.id]:!current[user.id]}))}>{visiblePasswords[user.id]?'Hide':'Show'}</button><button type="button" disabled={!owner} onClick={()=>generatePassword(user.id)}>Generate</button><button type="button" disabled={!owner} onClick={()=>setUserPassword(user.id)}>Set password</button></div></div>
        <div className="permissionGrid">{allPermissions.map(permission=><label key={permission}><input type="checkbox" disabled={!owner||['Flemming','Jakob'].includes(user.name)} checked={(user.permissions||[]).includes(permission)} onChange={()=>togglePermission(user.id,permission)}/><span>{permission.replaceAll('_',' ')}</span></label>)}</div><div className="folderAccessGrid"><h4>Folder access</h4>{MANAGED_FOLDERS.map(folder=><label key={folder}><span>{folder}</span><select disabled={!owner||['Flemming','Jakob'].includes(user.name)} value={(user.folderAccess||DEFAULT_FOLDER_ACCESS)[folder]||'No Access'} onChange={e=>changeFolderAccess(user.id,folder,e.target.value)}>{FOLDER_ACCESS_LEVELS.map(level=><option key={level}>{level}</option>)}</select></label>)}</div>
        <div className="userActions"><button disabled={!owner||['Flemming','Jakob'].includes(user.name)} onClick={()=>toggleActive(user.id)}>{user.active?'Lock user':'Unlock user'}</button><button className="dangerAction" disabled={!owner||['Flemming','Jakob'].includes(user.name)} onClick={()=>deleteUser(user.id)}>Delete</button></div>
      </article>)}</div>
    </section>
    <div className="dashboardGrid adminSupportGrid"><div className="panel"><h3>Personnel location</h3>{people.map(p=><button className="listRow" key={p.id} onClick={()=>cyclePerson(p.id)}><div><b>{p.name}</b><small>{p.task}</small></div><em>{p.location}</em></button>)}</div><div className="panel"><h3>System resets</h3><button className="primaryBtn" onClick={()=>setMachines(DEFAULT_MACHINES)}>Restore machines</button><button className="primaryBtn" onClick={()=>setMaterials(DEFAULT_MATERIALS)}>Restore materials</button></div></div>
  </div>
}


function KnowledgeBase({session,users,folders,setFolders,machines,setMachines,documents,setDocuments,solutions,setSolutions}) {
  const [tab,setTab]=useState('machineBinder');
  const [selectedFolder,setSelectedFolder]=useState(folders.find(f=>!f.machineId)?.id||null);
  const [selectedMachine,setSelectedMachine]=useState(machines[0]?.id||null);
  const [selectedMachineFolder,setSelectedMachineFolder]=useState(null);
  const [selectedDoc,setSelectedDoc]=useState(null);
  const [folderForm,setFolderForm]=useState({name:'',description:'',accessFolder:'Workshop'});
  const [machineFolderName,setMachineFolderName]=useState('');
  const [machineForm,setMachineForm]=useState({name:'',manufacturer:'',model:'',serial:'',location:'Workshop',notes:''});
  const [question,setQuestion]=useState('');
  const [answer,setAnswer]=useState('');
  const [solutionText,setSolutionText]=useState('');
  const [message,setMessage]=useState('');
  const [uploading,setUploading]=useState(false);
  const canManage=canManagePermissions(session);
  const DEFAULT_MACHINE_FOLDERS=['Manuals','Electrical Drawings','Maintenance','Spare Parts','Service History','Software','Photos'];

  const libraryFolders=folders.filter(f=>!f.machineId);
  const machineFolders=folders.filter(f=>String(f.machineId)===String(selectedMachine));
  const currentMachine=machines.find(m=>String(m.id)===String(selectedMachine));
  const currentMachineFolder=machineFolders.find(f=>String(f.id)===String(selectedMachineFolder));

  useEffect(()=>{
    if(!machines.some(m=>String(m.id)===String(selectedMachine))) setSelectedMachine(machines[0]?.id||null);
  },[machines,selectedMachine]);
  useEffect(()=>{
    const available=folders.filter(f=>String(f.machineId)===String(selectedMachine));
    if(!available.some(f=>String(f.id)===String(selectedMachineFolder))) setSelectedMachineFolder(available[0]?.id||null);
  },[folders,selectedMachine,selectedMachineFolder]);
  useEffect(()=>{
    if(!libraryFolders.some(f=>String(f.id)===String(selectedFolder))) setSelectedFolder(libraryFolders[0]?.id||null);
  },[folders,selectedFolder]);

  function folderAllowed(folder){
    if(canManage)return true;
    const level=(session.folderAccess||{})[folder.accessFolder||'Workshop']||'No Access';
    return level!=='No Access';
  }
  const visibleLibraryFolders=libraryFolders.filter(folderAllowed);
  const visibleDocs=documents.filter(d=>{
    const folder=folders.find(f=>String(f.id)===String(d.folderId));
    return !folder || folderAllowed(folder);
  });
  const libraryDocs=visibleDocs.filter(d=>String(d.folderId)===String(selectedFolder));
  const machineDocs=visibleDocs.filter(d=>String(d.machineId)===String(selectedMachine)&&String(d.folderId)===String(selectedMachineFolder));

  function addFolder(){
    if(!canManage)return setMessage('Kun Flemming og Jakob kan oprette mapper.');
    if(!folderForm.name.trim())return setMessage('Skriv et mappenavn.');
    const folder={id:Date.now(),name:folderForm.name.trim(),description:folderForm.description.trim(),accessFolder:folderForm.accessFolder};
    setFolders([...folders,folder]);setSelectedFolder(folder.id);setFolderForm({name:'',description:'',accessFolder:'Workshop'});setMessage('Ny ATLAS-mappe oprettet.');
  }
  function deleteFolder(id){
    if(!canManage)return;
    if(documents.some(d=>String(d.folderId)===String(id)))return setMessage('Mappen indeholder dokumenter. Flyt eller slet dem først.');
    if(window.confirm('Slet denne mappe?'))setFolders(folders.filter(f=>String(f.id)!==String(id)));
  }
  function addMachine(){
    if(!canManage)return setMessage('Kun Flemming og Jakob kan oprette maskiner.');
    if(!machineForm.name.trim())return setMessage('Skriv maskinens navn.');
    const id=Date.now();
    const machine={...machineForm,id,name:machineForm.name.trim(),status:'Active'};
    const createdFolders=DEFAULT_MACHINE_FOLDERS.map((name,index)=>({id:`${id}-${index}`,name,description:`${name} for ${machine.name}`,accessFolder:'Workshop',machineId:id}));
    setMachines([...machines,machine]);
    setFolders([...folders,...createdFolders]);
    setSelectedMachine(id);setSelectedMachineFolder(createdFolders[0].id);
    setMachineForm({name:'',manufacturer:'',model:'',serial:'',location:'Workshop',notes:''});
    setMessage(`${machine.name} er oprettet med ${createdFolders.length} undermapper.`);
  }
  function deleteMachine(id){
    if(!canManage||!window.confirm('Slet maskinen og dens tomme undermapper?'))return;
    const machineFolderIds=folders.filter(f=>String(f.machineId)===String(id)).map(f=>String(f.id));
    if(documents.some(d=>machineFolderIds.includes(String(d.folderId))))return setMessage('Maskinen indeholder dokumenter. Slet dokumenterne først.');
    setMachines(machines.filter(m=>String(m.id)!==String(id)));
    setFolders(folders.filter(f=>String(f.machineId)!==String(id)));
  }
  function addMachineFolder(){
    if(!canManage)return setMessage('Kun Flemming og Jakob kan oprette undermapper.');
    if(!selectedMachine)return setMessage('Vælg en maskine først.');
    if(!machineFolderName.trim())return setMessage('Skriv navnet på undermappen.');
    const folder={id:`${Date.now()}-mf`,name:machineFolderName.trim(),description:`${machineFolderName.trim()} for ${currentMachine?.name||'maskine'}`,accessFolder:'Workshop',machineId:selectedMachine};
    setFolders([...folders,folder]);setSelectedMachineFolder(folder.id);setMachineFolderName('');setMessage('Undermappen er oprettet.');
  }

  async function uploadKnowledgeFiles(fileList,targetFolderId,targetMachineId=null){
    const files=[...fileList];
    if(!files.length||!targetFolderId)return;
    const targetFolder=folders.find(f=>String(f.id)===String(targetFolderId));
    const targetMachine=machines.find(m=>String(m.id)===String(targetMachineId));
    setUploading(true);setMessage('');
    for(const file of files){
      try{
        const form=new FormData();
        form.append('file',file);
        form.append('folder',targetFolder?.name||'Knowledge');
        form.append('machine',targetMachine?.name||'General');
        form.append('uploadedBy',session.name);
        const response=await fetch('/api/knowledge',{method:'POST',body:form});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'Upload failed');
        const doc={...data.document,id:`${Date.now()}-${Math.random()}`,folderId:targetFolderId,machineId:targetMachineId||null,description:'',tags:[],status:'ATLAS Ready'};
        setDocuments(current=>[...current,doc]);
        setSelectedDoc(doc);
      }catch(error){setMessage(`${file.name}: ${error.message}`)}
    }
    setUploading(false);setMessage(current=>current||'Filer uploadet og klar til ATLAS.');
  }
  async function deleteDocument(doc){
    if(!canManage)return;
    if(!window.confirm(`Slet ${doc.name}?`))return;
    if(doc.blobName){try{await fetch(`/api/knowledge?blob=${encodeURIComponent(doc.blobName)}`,{method:'DELETE'})}catch{}}
    setDocuments(documents.filter(d=>d.id!==doc.id));
    if(selectedDoc?.id===doc.id)setSelectedDoc(null);
  }

  function askAtlas(){
    const q=question.trim();if(!q)return;
    const words=q.toLowerCase().split(/\s+/).filter(w=>w.length>2);
    const docs=visibleDocs.map(d=>({...d,score:words.filter(w=>`${d.name} ${d.description||''} ${(d.tags||[]).join(' ')}`.toLowerCase().includes(w)).length})).filter(d=>d.score>0).sort((a,b)=>b.score-a.score);
    const experiences=solutions.map(x=>({...x,score:words.filter(w=>`${x.question} ${x.solution} ${x.machine||''}`.toLowerCase().includes(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const machine=machines.find(m=>q.toLowerCase().includes(m.name.toLowerCase())||m.model&&q.toLowerCase().includes(m.model.toLowerCase()));
    let text='Jeg fandt ikke en sikker løsning i den lokale viden endnu. Upload den relevante manual eller registrer en verificeret løsning.';
    if(docs.length||experiences.length||machine){
      const lines=[];
      if(machine)lines.push(`Maskine: ${machine.name}${machine.manufacturer?` · ${machine.manufacturer}`:''}${machine.model?` ${machine.model}`:''}. ${machine.notes||''}`);
      if(docs.length)lines.push(`Relevante filer: ${docs.slice(0,3).map(d=>d.name).join(', ')}.`);
      if(experiences.length)lines.push(`Tidligere FSQ-erfaring: ${experiences[0].solution} (${experiences[0].status||'Ubekræftet'}).`);
      lines.push('Kontrollér altid sikkerhedsprocedure, LOTO og den gældende manual før indgreb.');text=lines.join('\n');
    }
    setAnswer(text);
    setSolutions([...solutions,{id:Date.now(),question:q,solution:'',machine:machine?.name||'',askedBy:session.name,date:new Date().toISOString(),status:'Question logged'}]);
  }
  function saveSolution(){
    if(!question.trim()||!solutionText.trim())return setMessage('Skriv både spørgsmål og løsning.');
    setSolutions([...solutions,{id:Date.now(),question:question.trim(),solution:solutionText.trim(),machine:currentMachine?.name||'',askedBy:session.name,date:new Date().toISOString(),status:canManage?'Verified':'Unverified'}]);
    setSolutionText('');setMessage(canManage?'Løsningen er gemt som verificeret FSQ-viden.':'Løsningen er gemt og afventer godkendelse.');
  }
  function verifySolution(id){if(canManage)setSolutions(solutions.map(x=>x.id===id?{...x,status:'Verified',verifiedBy:session.name}:x))}

  const FileList=({items})=><div className="machineBinderFiles">{items.length?items.map(doc=><button key={doc.id} className={selectedDoc?.id===doc.id?'active':''} onClick={()=>setSelectedDoc(doc)}><span className="machineFileIcon">{String(doc.name).split('.').pop().toUpperCase()}</span><div><b>{doc.name}</b><small>{doc.size||'—'} · {doc.uploadedBy||'FSQ'} · {doc.status||'Stored'}</small></div><em>›</em></button>):<div className="machineBinderEmpty"><span>▱</span><b>Ingen dokumenter i denne mappe</b><small>Upload manualer, diagrammer, servicehistorik eller billeder.</small></div>}</div>;

  return <div className="content knowledgePage">
    <div className="sectionIntro"><div><p className="eyebrow">FSQ TECHNICAL KNOWLEDGE</p><h1>Machine Binder</h1><p>Opret maskiner med undermapper, upload manualer og gør dem søgbare for ATLAS.</p></div><div className="knowledgeStatus"><i/> {documents.filter(d=>d.machineId).length} maskinfiler · {machines.length} maskiner</div></div>
    {message&&<div className="documentMessage">{message}</div>}
    <div className="knowledgeTabs">{[['machineBinder','Machine Binder'],['library','Knowledge Library'],['ask','Spørg ATLAS'],['experience','Erfaringer']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>

    {tab==='machineBinder'&&<>
      <div className="machineBinderToolbar panel">
        <div><b>{currentMachine?.name||'Vælg eller opret en maskine'}</b><small>{currentMachine?[currentMachine.manufacturer,currentMachine.model,currentMachine.serial].filter(Boolean).join(' · '):'Manualer, el-diagrammer, service og reservedele samlet ét sted.'}</small></div>
        {canManage&&<button className="primaryBtn" onClick={()=>document.getElementById('machine-create-panel')?.scrollIntoView({behavior:'smooth'})}>+ Opret maskine</button>}
      </div>
      <div className="machineBinderLayout">
        <aside className="panel machineBinderMachines">
          <div className="panelHead"><h3>Maskiner</h3><span>{machines.length}</span></div>
          {machines.map(machine=><button key={machine.id} className={String(selectedMachine)===String(machine.id)?'active':''} onClick={()=>{setSelectedMachine(machine.id);setSelectedDoc(null)}}><span className="machineBinderCog">⚙</span><div><b>{machine.name}</b><small>{[machine.manufacturer,machine.model].filter(Boolean).join(' ')||machine.location||'FSQ machine'}</small></div><em>{documents.filter(d=>String(d.machineId)===String(machine.id)).length}</em></button>)}
          {!machines.length&&<div className="machineBinderEmpty"><b>Ingen maskiner endnu</b><small>Opret den første maskine nedenfor.</small></div>}
        </aside>

        <section className="panel machineBinderFolders">
          <div className="panelHead"><div><p className="panelEyebrow">{currentMachine?.name||'MACHINE'}</p><h3>Undermapper</h3></div><span>{machineFolders.length}</span></div>
          {machineFolders.map(folder=><button key={folder.id} className={String(selectedMachineFolder)===String(folder.id)?'active':''} onClick={()=>{setSelectedMachineFolder(folder.id);setSelectedDoc(null)}}><span>📁</span><div><b>{folder.name}</b><small>{documents.filter(d=>String(d.folderId)===String(folder.id)).length} filer</small></div>{canManage&&<em onClick={e=>{e.stopPropagation();deleteFolder(folder.id)}}>×</em>}</button>)}
          {canManage&&selectedMachine&&<div className="machineFolderCreate"><input value={machineFolderName} onChange={e=>setMachineFolderName(e.target.value)} placeholder="Ny undermappe"/><button onClick={addMachineFolder}>Opret</button></div>}
        </section>

        <section className="panel machineBinderDocuments">
          <div className="panelHead"><div><p className="panelEyebrow">{currentMachine?.name||'MACHINE'} / {currentMachineFolder?.name||'MAPPE'}</p><h3>Dokumenter</h3></div><label className="binderUpload">{uploading?'Uploader...':'+ Upload filer'}<input disabled={uploading||!selectedMachineFolder} type="file" multiple onChange={e=>{uploadKnowledgeFiles(e.target.files,selectedMachineFolder,selectedMachine);e.target.value=''}}/></label></div>
          <label className={`machineDropZone ${!selectedMachineFolder?'disabled':''}`}><span>☁</span><b>Træk filer hertil eller klik for upload</b><small>Destination: {currentMachine?.name||'—'} / {currentMachineFolder?.name||'vælg mappe'}</small><input disabled={uploading||!selectedMachineFolder} type="file" multiple onChange={e=>{uploadKnowledgeFiles(e.target.files,selectedMachineFolder,selectedMachine);e.target.value=''}}/></label>
          <FileList items={machineDocs}/>
        </section>

        <aside className="panel machineBinderPreview">
          {selectedDoc?<><div className="panelHead"><h3>{selectedDoc.name}</h3>{canManage&&<button className="dangerAction" onClick={()=>deleteDocument(selectedDoc)}>Slet</button>}</div>
            <div className="machinePreviewIcon">{String(selectedDoc.name).split('.').pop().toUpperCase()}</div>
            <dl><div><dt>Maskine</dt><dd>{currentMachine?.name||'—'}</dd></div><div><dt>Mappe</dt><dd>{folders.find(f=>String(f.id)===String(selectedDoc.folderId))?.name||'—'}</dd></div><div><dt>Størrelse</dt><dd>{selectedDoc.size||'—'}</dd></div><div><dt>Uploadet af</dt><dd>{selectedDoc.uploadedBy||'—'}</dd></div><div><dt>Status</dt><dd className="atlasReady">● {selectedDoc.status||'Stored'}</dd></div></dl>
            <div className="machinePreviewActions"><a href={selectedDoc.url} target="_blank" rel="noreferrer">Åbn dokument</a><a href={selectedDoc.url} download>Download</a></div>
          </>:<div className="machineBinderEmpty preview"><div className="atlasOrb"><span>ATLAS</span></div><b>Vælg et dokument</b><small>Preview, metadata og ATLAS-status vises her.</small></div>}
        </aside>
      </div>

      {canManage&&<section id="machine-create-panel" className="panel machineCreateWide"><div><p className="panelEyebrow">MACHINE REGISTRY</p><h3>Opret ny maskine</h3><p>Maskinen oprettes automatisk med standardmapper til manualer, el, vedligehold, reservedele, service, software og billeder.</p></div><div className="machineCreateFields"><label>Navn<input value={machineForm.name} onChange={e=>setMachineForm({...machineForm,name:e.target.value})}/></label><label>Producent<input value={machineForm.manufacturer} onChange={e=>setMachineForm({...machineForm,manufacturer:e.target.value})}/></label><label>Model<input value={machineForm.model} onChange={e=>setMachineForm({...machineForm,model:e.target.value})}/></label><label>Serienummer<input value={machineForm.serial} onChange={e=>setMachineForm({...machineForm,serial:e.target.value})}/></label><label>Placering<input value={machineForm.location} onChange={e=>setMachineForm({...machineForm,location:e.target.value})}/></label><label className="wide">Noter<textarea value={machineForm.notes} onChange={e=>setMachineForm({...machineForm,notes:e.target.value})}/></label><button className="primaryBtn wide" onClick={addMachine}>Opret maskine med undermapper</button></div></section>}
    </>}

    {tab==='library'&&<div className="knowledgeLibrary"><aside className="knowledgeFolders panel"><div className="panelHead"><h3>Knowledge-mapper</h3><span>{visibleLibraryFolders.length}</span></div>{visibleLibraryFolders.map(folder=><button key={folder.id} className={String(selectedFolder)===String(folder.id)?'active':''} onClick={()=>{setSelectedFolder(folder.id);setSelectedDoc(null)}}><div><b>{folder.name}</b><small>{folder.description}</small></div>{canManage&&<span onClick={e=>{e.stopPropagation();deleteFolder(folder.id)}}>×</span>}</button>)}{canManage&&<div className="knowledgeCreate"><h4>Ny mappe</h4><input placeholder="Mappenavn" value={folderForm.name} onChange={e=>setFolderForm({...folderForm,name:e.target.value})}/><input placeholder="Beskrivelse" value={folderForm.description} onChange={e=>setFolderForm({...folderForm,description:e.target.value})}/><select value={folderForm.accessFolder} onChange={e=>setFolderForm({...folderForm,accessFolder:e.target.value})}>{MANAGED_FOLDERS.map(f=><option key={f}>{f}</option>)}</select><button onClick={addFolder}>Opret mappe</button></div>}</aside><section className="panel knowledgeFiles"><div className="panelHead"><div><h3>{folders.find(f=>String(f.id)===String(selectedFolder))?.name||'Vælg mappe'}</h3><small>Generel godkendt FSQ-viden</small></div><label className="binderUpload">{uploading?'Uploader...':'Upload filer'}<input disabled={uploading||!selectedFolder} type="file" multiple onChange={e=>{uploadKnowledgeFiles(e.target.files,selectedFolder,null);e.target.value=''}}/></label></div><FileList items={libraryDocs}/></section></div>}

    {tab==='ask'&&<div className="knowledgeAskGrid"><section className="panel atlasAskPanel"><div className="atlasOrb"><span>ATLAS</span></div><h2>Hvad skal du have hjælp til?</h2><textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Eksempel: Hvad betyder alarm 201 på plasmaskæreren?"/><button className="primaryBtn" onClick={askAtlas}>Søg i FSQ-viden</button>{answer&&<div className="atlasKnowledgeAnswer"><b>ATLAS</b><p>{answer}</p></div>}</section><section className="panel"><h3>Gem løsning fra arbejdet</h3><p className="muted">Medarbejdere kan registrere den løsning, der virkede. Flemming eller Jakob kan verificere den.</p><textarea value={solutionText} onChange={e=>setSolutionText(e.target.value)} placeholder="Hvad var årsagen, og hvad løste problemet?"/><button onClick={saveSolution}>Gem løsning</button></section></div>}

    {tab==='experience'&&<section className="panel"><div className="panelHead"><h3>Spørgsmål og løsninger</h3><span>{solutions.length}</span></div><div className="experienceList">{solutions.length?solutions.slice().reverse().map(item=><article key={item.id}><div><span className={`experienceState ${item.status==='Verified'?'verified':'pending'}`}>{item.status}</span><h3>{item.question}</h3><p>{item.solution||'Der er endnu ikke registreret en løsning.'}</p><small>{item.askedBy} · {new Date(item.date).toLocaleString('da-DK')} {item.machine?`· ${item.machine}`:''}</small></div>{canManage&&item.solution&&item.status!=='Verified'&&<button onClick={()=>verifySolution(item.id)}>Verificer</button>}</article>):<div className="empty">Ingen erfaringer er registreret endnu.</div>}</div></section>}
  </div>
}

function AI({session,chat,setChat,voice,stats,context}) {
  const [text,setText]=useState('');
  const [speechError,setSpeechError]=useState('');
  const [mode,setMode]=useState('assistant');
  const [useWeb,setUseWeb]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sources,setSources]=useState([]);
  const [status,setStatus]=useState(null);
  const developerAllowed=String(session?.name||'').trim().toLowerCase()==='flemming' && session?.role==='Owner';

  useEffect(()=>{fetch('/api/atlas/status',{cache:'no-store'}).then(r=>r.json()).then(setStatus).catch(()=>{})},[]);

  async function send(value=text){
    const q=value.trim();
    if(!q||busy)return;
    setChat(c=>[...c,{from:'user',text:q}]);
    setText('');setBusy(true);setError('');setSources([]);
    try{
      const response=await fetch('/api/atlas/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,mode,useWeb:useWeb||mode==='research',context:{stats,...context}})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.detail||data.error||`HTTP ${response.status}`);
      setChat(c=>[...c,{from:'ai',text:data.answer}]);
      setSources(data.sources||[]);
      speak(data.answer,voice);
    }catch(err){const message=`ATLAS fejl: ${err.message}`;setError(message);setChat(c=>[...c,{from:'ai',text:message}]);}
    finally{setBusy(false)}
  }

  const speech=useSpeechRecognition({
    onResult: transcript=>{setText(transcript);setSpeechError('');send(transcript)},
    onError: error=>setSpeechError(error==='not-supported'?'Talegenkendelse understøttes ikke. Brug Microsoft Edge eller Chrome.':'Kontrollér, at browseren har adgang til mikrofonen.')
  });

  return <div className="content aiLayout atlasBrainPage">
    <div className="sectionIntro"><div><p className="eyebrow">FSQ INTELLIGENCE LAYER</p><h1>ATLAS BRAIN</h1><p>FSQ Knowledge først · officiel online research som supplement · alle svar logges.</p></div><button className={`atlasMic ${speech.listening?'listening':''}`} onClick={speech.toggleListening}>{speech.listening?'● ATLAS lytter...':'🎙 Tal til ATLAS'}</button></div>
    <div className="atlasBrainToolbar">
      <div className="atlasModes">
        <button className={mode==='assistant'?'active':''} onClick={()=>setMode('assistant')}>Assistant</button>
        <button className={mode==='research'?'active':''} onClick={()=>{setMode('research');setUseWeb(true)}}>Research</button>
        {developerAllowed&&<button className={mode==='developer'?'active developer':''} onClick={()=>setMode('developer')}>Developer · Flemming</button>}
      </div>
      <label className="webToggle"><input type="checkbox" checked={useWeb} onChange={e=>setUseWeb(e.target.checked)} disabled={mode==='research'}/> Online research</label>
      <div className="brainStatus"><i className={status?.ok?'online':''}/>{status?.ok?'Brain online':'Connecting'}{status&&` · ${status.ApprovedKnowledge||0} approved`}</div>
    </div>
    {mode==='developer'&&<div className="developerNotice"><b>ATLAS Developer</b><span>Kun Flemming har adgang. Denne version analyserer og planlægger kodeændringer; den ændrer eller deployer ikke uden en senere godkendelsesfunktion.</span></div>}
    {speechError&&<div className="error">{speechError}</div>}{error&&<div className="error">{error}</div>}
    <div className="atlasBrainGrid">
      <div className="chatPanel atlasChat">
        {chat.map((m,i)=><div key={i} className={`bubble ${m.from}`}>{m.text}</div>)}
        {busy&&<div className="bubble ai atlasThinking">ATLAS undersøger FSQ-viden{useWeb||mode==='research'?' og online kilder':''}…</div>}
        <div className="chatInput"><textarea rows="2" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={mode==='developer'?'Beskriv den funktion eller fejl, ATLAS skal analysere…':'Spørg ATLAS om projekter, teknik, dokumenter eller online research…'}/><button className="micMini" onClick={speech.toggleListening}>{speech.listening?'●':'🎙'}</button><button disabled={busy} onClick={()=>send()}>{busy?'Arbejder…':'Send'}</button></div>
      </div>
      <aside className="atlasSourcePanel panel"><div className="panelHead"><h3>Kilder</h3><span>{sources.length}</span></div>{sources.length?sources.map((source,i)=><article key={i}><span>{source.type==='Online'?'🌐':'▤'}</span><div><b>{source.type}</b>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>:<small>{source.title}</small>}</div></article>):<div className="empty">Kilder vises efter næste svar.</div>}<hr/><small>Prioritet: FSQ approved knowledge → producent/klasse → øvrige pålidelige online kilder.</small></aside>
    </div>
  </div>
}

function ModulePlaceholder({title}) { return <div className="content"><div className="sectionIntro"><h1>{title}</h1><p>This module is included in the navigation and ready for connection to the shared database.</p></div><div className="panel placeholder"><div className="core small"><div className="coreRing r1"/><div className="coreDot"/></div><h3>{title} module</h3><p>UI foundation ready. Database, files and approval workflows are the next deployment layer.</p></div></div> }

export default function Page(){
  const [session,setSession]=useState(null);
  const [users,setUsersLocal]=useState([]);
  const [loadingUsers,setLoadingUsers]=useState(true);
  const [startupError,setStartupError]=useState('');

  async function loadUsers(authenticated=false){
    try{
      const response=await fetch(authenticated?'/api/users':'/api/auth/users',{cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(response.ok){setUsersLocal(normalizeUserRegistry(data));setStartupError('');}
      else setStartupError(data.detail || data.error || `HTTP ${response.status}`);
    }catch(error){setStartupError(error?.message || 'Could not contact login service');}finally{setLoadingUsers(false);}
  }
  useEffect(()=>{loadUsers(false)},[]);
  useEffect(()=>{if(session)loadUsers(true)},[session]);

  async function setUsers(next){
    const value=typeof next==='function'?next(users):next;
    setUsersLocal(normalizeUserRegistry(value));
    try{
      const response=await fetch('/api/users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
      if(response.ok)setUsersLocal(normalizeUserRegistry(await response.json()));
      else console.error('User update failed',await response.text());
    }catch(error){console.error('User update failed',error);}
  }
  async function logout(){try{await fetch('/api/auth/logout',{method:'POST'})}catch{}setSession(null);loadUsers(false)}
  if(loadingUsers)return <main className="loginShell"><section className="loginPanel"><h1>FSQ COMMAND</h1><p>Connecting to Azure SQL…</p></section></main>;
  if(startupError && !session)return <main className="loginShell"><section className="loginPanel"><h1>FSQ COMMAND</h1><div className="error">Azure SQL connection failed: {startupError}</div><p className="muted">Open /api/diagnostics/database for technical details.</p><button className="primaryBtn" onClick={()=>{setLoadingUsers(true);loadUsers(false)}}>TRY AGAIN</button></section></main>;
  return session?<AppShell session={session} onLogout={logout} users={users} setUsers={setUsers}/>:<Login onLogin={setSession} users={users}/>;
}
