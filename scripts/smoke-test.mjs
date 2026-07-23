import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { extractDocumentText } from '../lib/documentText.js';
import { detectImageMime, downloadHeaders, isAllowedDocument, safeSegment } from '../lib/files.js';
import { assignmentLabel, isTaskAssignedTo, taskAssignees } from '../lib/taskAssignments.js';
import { projectPlannerEntries, syncProjectCrewEntries } from '../lib/plannerSync.js';
import { parseAtlasActionOutput, rankKnowledge } from '../lib/atlas.js';
import fs from 'node:fs';

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Secure test');
sheet.addRow(['Project', 'Status']);
sheet.addRow(['Wind Orca', 'Ready']);
const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
const extracted = await extractDocumentText(
  xlsxBuffer,
  'test.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
);
assert.match(extracted, /Wind Orca/);
assert.match(extracted, /Ready/);

assert.equal(isAllowedDocument('manual.pdf'), true);
assert.equal(isAllowedDocument('payload.html'), false);
assert.equal(safeSegment('../../secret'), '..-..-secret');
assert.equal(detectImageMime(Buffer.from([0xff,0xd8,0xff,0x00,0,0,0,0,0,0,0,0])), 'image/jpeg');
assert.equal(detectImageMime(Buffer.from('<svg></svg>')), null);

const riskyHeaders = downloadHeaders({ contentType: 'text/html', filename: 'test.html', inline: true });
assert.match(riskyHeaders.get('Content-Disposition'), /^attachment/);
assert.equal(riskyHeaders.get('X-Content-Type-Options'), 'nosniff');

const sharedTask = { person: 'Tommy', assignees: ['Tommy', 'Jakob', 'Tommy'] };
assert.deepEqual(taskAssignees(sharedTask), ['Tommy', 'Jakob']);
assert.equal(isTaskAssignedTo(sharedTask, 'jakob'), true);
assert.equal(isTaskAssignedTo(sharedTask, 'Flemming'), false);
assert.equal(assignmentLabel(sharedTask), 'Tommy, Jakob');
assert.equal(isTaskAssignedTo({ person: 'Tommy' }, 'Tommy'), true);

const plannedProject = { id: 42, name: 'Wind Test', type: 'Vessel', startDate: '2026-07-20', deadline: '2026-07-22' };
const automaticPlan = projectPlannerEntries(plannedProject, ['Tommy', 'Jakob']);
assert.equal(automaticPlan.length, 6);
assert.equal(automaticPlan[0].source, 'project');
assert.equal(automaticPlan[0].type, 'Marine');
const manualEntry = { key: 'Tommy|2026-07-21', person: 'Tommy', date: '2026-07-21', text: 'Kursus', type: 'Course' };
const syncedPlan = syncProjectCrewEntries([manualEntry], plannedProject, ['Tommy']);
assert.equal(syncedPlan.filter(entry => entry.source === 'project').length, 2);
assert.equal(syncedPlan.find(entry => entry.key === manualEntry.key)?.text, 'Kursus');

const atlasOutput = parseAtlasActionOutput('Jeg klarer det.\nATLAS_ACTIONS_JSON: {"actions":[{"type":"create_task","project":"Wind Test","title":"Kontrollér svejsning","people":["Tommy","Jakob"]}]}');
assert.equal(atlasOutput.answer, 'Jeg klarer det.');
assert.equal(atlasOutput.actions[0].type, 'create_task');
assert.deepEqual(atlasOutput.actions[0].people, ['Tommy','Jakob']);
assert.equal(parseAtlasActionOutput('Svar uden handling').actions.length, 0);
const rankedKnowledge = rankKnowledge([{Title:'Andet',Content:'Generelt'},{Title:'Svejsning',Content:'WPS kontrol'}], 'Hjælp med WPS svejsning', 1);
assert.equal(rankedKnowledge[0].Title, 'Svejsning');

const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
const serviceWorker = fs.readFileSync('public/sw.js', 'utf8');
assert.match(serviceWorker, /pathname\.startsWith\('\/api\/'\)/);

const pageSource = fs.readFileSync('app/page.js', 'utf8');
const myJobsSource = pageSource.slice(pageSource.indexOf('function MyJobs('), pageSource.indexOf('function Dashboard('));
const knowledgeSource = pageSource.slice(pageSource.indexOf('function KnowledgeBase('), pageSource.indexOf('function AI('));
assert.doesNotMatch(myJobsSource, /machineDragActive|machineDragDepth/);
assert.match(knowledgeSource, /const \[machineDragActive,setMachineDragActive\]=useState\(false\)/);
assert.match(knowledgeSource, /onDrop=\{machineDrop\}/);
assert.match(pageSource, /\['knowledge', 'Machine Binder', '▤'\]/);
const stylesSource = fs.readFileSync('app/styles.css', 'utf8');
assert.match(stylesSource, /@media\(max-width:1650px\)\{\.machineBinderLayout\{grid-template-columns:/);
assert.match(stylesSource, /\.machineBinderDocuments,\.machineBinderPreview\{grid-column:1\/-1;min-height:auto\}/);
assert.match(stylesSource, /\.machineFolderCreate input\{width:100%;min-width:0\}/);

console.log('Smoke tests passed (documents, downloads, crew assignment, Machine Binder and mobile app).');
