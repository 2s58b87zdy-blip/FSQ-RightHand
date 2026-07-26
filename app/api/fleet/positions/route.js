import { readSession } from '../../../../lib/auth';
import { getAllowedProjectNames, getStateValue } from '../../../../lib/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AIS_URL = 'wss://stream.aisstream.io/v0/stream';
const CACHE_MS = 75_000;
let positionCache = new Map();
let cacheUpdatedAt = 0;

function cleanMmsi(value) {
  const mmsi = String(value || '').trim();
  return /^\d{7,9}$/.test(mmsi) ? mmsi : '';
}

function manualPosition(project) {
  const latitude = Number(project?.aisLat);
  const longitude = Number(project?.aisLon);
  return {
    latitude,
    longitude,
    hasPosition: project?.aisLat !== '' && project?.aisLat !== null && project?.aisLat !== undefined &&
      project?.aisLon !== '' && project?.aisLon !== null && project?.aisLon !== undefined &&
      Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  };
}

function vesselRecord(project, live) {
  const manual = manualPosition(project);
  const useLive = Boolean(live && Number.isFinite(live.latitude) && Number.isFinite(live.longitude));
  return {
    projectId: project.id,
    projectNo: String(project.projectNo || ''),
    name: String(project.name || 'Unnamed vessel'),
    customer: String(project.customer || ''),
    mmsi: cleanMmsi(project.mmsi),
    imo: String(project.imo || ''),
    crew: Array.isArray(project.crew) ? project.crew.map(String).slice(0, 30) : [],
    progress: Math.max(0, Math.min(100, Number(project.progress) || 0)),
    latitude: useLive ? live.latitude : manual.latitude,
    longitude: useLive ? live.longitude : manual.longitude,
    speed: useLive ? live.speed : null,
    course: useLive ? live.course : null,
    heading: useLive ? live.heading : null,
    navigationStatus: useLive ? live.navigationStatus : '',
    updatedAt: useLive ? live.updatedAt : (project.aisUpdatedAt || null),
    hasPosition: useLive || manual.hasPosition,
    source: useLive ? 'AISstream' : 'Manual'
  };
}

async function messageText(data) {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  if (data && typeof data.text === 'function') return data.text();
  return String(data || '');
}

function extractPosition(payload) {
  const metadata = payload?.MetaData || {};
  const message = payload?.Message || {};
  const report = message.PositionReport || message.StandardClassBPositionReport || message.ExtendedClassBPositionReport;
  const mmsi = cleanMmsi(metadata.MMSI || report?.UserID || report?.MMSI);
  const latitude = Number(metadata.latitude ?? metadata.Latitude ?? report?.Latitude);
  const longitude = Number(metadata.longitude ?? metadata.Longitude ?? report?.Longitude);
  if (!mmsi || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    mmsi,
    latitude,
    longitude,
    speed: Number.isFinite(Number(report?.Sog)) ? Number(report.Sog) : null,
    course: Number.isFinite(Number(report?.Cog)) ? Number(report.Cog) : null,
    heading: Number.isFinite(Number(report?.TrueHeading)) ? Number(report.TrueHeading) : null,
    navigationStatus: String(report?.NavigationalStatus ?? ''),
    updatedAt: metadata.time_utc || metadata.TimeUtc || new Date().toISOString()
  };
}

async function fetchLivePositions(apiKey, mmsis) {
  return new Promise(resolve => {
    const found = new Map();
    let settled = false;
    let socket;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket?.close(); } catch {}
      resolve(found);
    };
    const timer = setTimeout(finish, 5_500);
    try {
      socket = new WebSocket(AIS_URL);
      socket.addEventListener('open', () => socket.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FiltersShipMMSI: mmsis,
        FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport']
      })));
      socket.addEventListener('message', async event => {
        try {
          const position = extractPosition(JSON.parse(await messageText(event.data)));
          if (!position || !mmsis.includes(position.mmsi)) return;
          found.set(position.mmsi, position);
          if (found.size === mmsis.length) finish();
        } catch {}
      });
      socket.addEventListener('error', finish);
      socket.addEventListener('close', finish);
    } catch {
      finish();
    }
  });
}

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const allProjects = await getStateValue('fsq-v40-projects');
    const allowed = await getAllowedProjectNames(session);
    const projects = (Array.isArray(allProjects) ? allProjects : [])
      .filter(project => ['Vessel', 'Inspection', 'Service', 'Marine'].includes(project?.type))
      .filter(project => !['Completed', 'Archived'].includes(project?.lifecycle))
      .filter(project => project?.status !== 'Completed')
      .filter(project => allowed === null || allowed.has(String(project?.name || '')));

    const mmsis = [...new Set(projects.map(project => cleanMmsi(project.mmsi)).filter(Boolean))].slice(0, 50);
    const apiKey = String(process.env.AISSTREAM_API_KEY || '').trim();
    const websocketAvailable = typeof WebSocket === 'function';
    let livePositions = new Map(positionCache);

    if (apiKey && websocketAvailable && mmsis.length && Date.now() - cacheUpdatedAt > CACHE_MS) {
      const fresh = await fetchLivePositions(apiKey, mmsis);
      for (const [mmsi, position] of fresh) positionCache.set(mmsi, position);
      cacheUpdatedAt = Date.now();
      livePositions = new Map(positionCache);
    }

    const vessels = projects.map(project => vesselRecord(project, livePositions.get(cleanMmsi(project.mmsi))));
    const configured = Boolean(apiKey && websocketAvailable);
    return Response.json({
      configured,
      source: configured ? 'AISstream + manual fallback' : 'Manual fallback',
      note: !apiKey ? 'AISSTREAM_API_KEY is not configured.' : !websocketAvailable ? 'WebSocket is unavailable in this Node runtime.' : '',
      vessels,
      refreshedAt: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Fleet positions failed', error);
    return Response.json({ error: 'Fleet positions could not be loaded.' }, { status: 503 });
  }
}
