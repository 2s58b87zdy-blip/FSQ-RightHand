import { readSession } from '../../../../lib/auth';
import { getAllowedProjectNames, getStateValue } from '../../../../lib/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AIS_URL = 'wss://stream.aisstream.io/v0/stream';
let positionCache = new Map();
let cacheUpdatedAt = 0;
let streamSocket = null;
let streamApiKey = '';
let streamMmsis = '';
let streamState = 'idle';
let streamError = '';
let streamOpenedAt = null;
let lastMessageAt = null;

function cleanMmsi(value) {
  const mmsi = String(value || '').trim();
  return /^\d{9}$/.test(mmsi) ? mmsi : '';
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
    source: useLive ? 'AISstream' : manual.hasPosition ? 'Manual' : 'Waiting'
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

function ensureLiveStream(apiKey, mmsis) {
  const signature = [...mmsis].sort().join(',');
  const socketActive = streamSocket && [0, 1].includes(streamSocket.readyState);
  if (socketActive && streamApiKey === apiKey && streamMmsis === signature) return;

  try { streamSocket?.close(); } catch {}
  streamSocket = null;
  streamApiKey = apiKey;
  streamMmsis = signature;
  streamState = 'connecting';
  streamError = '';
  streamOpenedAt = null;

  try {
    const socket = new WebSocket(AIS_URL);
    streamSocket = socket;
    socket.addEventListener('open', () => {
      streamState = 'listening';
      streamOpenedAt = new Date().toISOString();
      socket.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FiltersShipMMSI: mmsis,
        FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport']
      }));
    });
    socket.addEventListener('message', async event => {
      try {
        const payload = JSON.parse(await messageText(event.data));
        const serviceError = payload?.Error || payload?.error ||
          (payload?.MessageType === 'Error' ? payload?.Message : '');
        if (serviceError) {
          streamState = 'error';
          streamError = typeof serviceError === 'string' ? serviceError : JSON.stringify(serviceError);
          return;
        }
        const position = extractPosition(payload);
        if (!position || !mmsis.includes(position.mmsi)) return;
        positionCache.set(position.mmsi, position);
        cacheUpdatedAt = Date.now();
        lastMessageAt = position.updatedAt || new Date().toISOString();
        streamState = 'receiving';
      } catch {
        streamError = 'AISstream returned an unreadable message.';
      }
    });
    socket.addEventListener('error', () => {
      streamState = 'error';
      streamError = 'Could not connect to AISstream. Check the API key and Azure outbound network access.';
    });
    socket.addEventListener('close', event => {
      if (streamSocket !== socket) return;
      streamSocket = null;
      if (streamState !== 'error') {
        streamState = 'disconnected';
        streamError = event?.reason || `AISstream closed the connection (code ${event?.code || 'unknown'}).`;
      }
    });
  } catch (error) {
    streamState = 'error';
    streamError = error?.message || 'AISstream connection could not be started.';
  }
}

async function waitForFirstPosition(mmsis, timeoutMs = 12_000) {
  if (mmsis.some(mmsi => positionCache.has(mmsi))) return;
  const started = Date.now();
  while (Date.now() - started < timeoutMs && !['error', 'disconnected'].includes(streamState)) {
    await new Promise(resolve => setTimeout(resolve, 250));
    if (mmsis.some(mmsi => positionCache.has(mmsi))) return;
  }
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
    if (apiKey && websocketAvailable && mmsis.length) {
      ensureLiveStream(apiKey, mmsis);
      await waitForFirstPosition(mmsis);
    }

    const livePositions = new Map(positionCache);
    const vessels = projects.map(project => vesselRecord(project, livePositions.get(cleanMmsi(project.mmsi))));
    const configured = Boolean(apiKey && websocketAvailable);
    const liveCount = vessels.filter(vessel => vessel.source === 'AISstream').length;
    const connectionStatus = !configured ? 'not-configured' :
      !mmsis.length ? 'missing-mmsi' :
      streamState === 'receiving' && liveCount ? 'live' :
      streamState;
    const note = !apiKey ? 'AISSTREAM_API_KEY is not configured.' :
      !websocketAvailable ? 'WebSocket is unavailable in this Node runtime.' :
      !mmsis.length ? 'Add a valid 9-digit MMSI to the vessel project.' :
      streamError || (liveCount ? '' : 'Connected to AISstream and waiting for the vessel to transmit a new position.');
    return Response.json({
      configured,
      source: configured ? 'AISstream + manual fallback' : 'Manual fallback',
      connectionStatus,
      note,
      trackedMmsis: mmsis.length,
      liveCount,
      streamOpenedAt,
      lastMessageAt,
      cacheUpdatedAt: cacheUpdatedAt ? new Date(cacheUpdatedAt).toISOString() : null,
      vessels,
      refreshedAt: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Fleet positions failed', error);
    return Response.json({ error: 'Fleet positions could not be loaded.' }, { status: 503 });
  }
}
