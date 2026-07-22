function cleanNames(names) {
  return [...new Set((Array.isArray(names) ? names : []).map(name => String(name || '').trim()).filter(Boolean))];
}

function plannerType(project) {
  const type = String(project?.type || '').toLowerCase();
  if (type === 'workshop') return 'Workshop';
  if (type.includes('inspection')) return 'Inspection';
  if (['vessel', 'marine', 'service'].includes(type)) return 'Marine';
  return 'Office';
}

export function projectPlannerEntries(project, crewNames) {
  if (!project?.id || !project?.name) return [];
  const crew = cleanNames(crewNames);
  const startValue = project.startDate || new Date().toISOString().slice(0, 10);
  const endValue = project.deadline || startValue;
  const start = new Date(`${startValue}T00:00:00Z`);
  const requestedEnd = new Date(`${endValue}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return [];
  const end = Number.isNaN(requestedEnd.getTime()) || requestedEnd < start ? start : requestedEnd;
  const entries = [];
  for (let date = new Date(start), days = 0; date <= end && days < 366; date.setUTCDate(date.getUTCDate() + 1), days += 1) {
    const dateValue = date.toISOString().slice(0, 10);
    for (const person of crew) {
      entries.push({
        key: `${person}|${dateValue}`,
        person,
        date: dateValue,
        text: project.name,
        type: plannerType(project),
        project: project.name,
        projectId: project.id,
        source: 'project'
      });
    }
  }
  return entries;
}

export function syncProjectCrewEntries(currentEntries, project, crewNames) {
  const current = Array.isArray(currentEntries) ? currentEntries : [];
  const projectId = String(project?.id || '');
  const withoutOldAutomaticEntries = current.filter(entry => !(
    entry?.source === 'project' && String(entry?.projectId || '') === projectId
  ));
  const occupiedKeys = new Set(withoutOldAutomaticEntries.map(entry => String(entry?.key || '')));
  const automaticEntries = projectPlannerEntries(project, crewNames).filter(entry => !occupiedKeys.has(entry.key));
  return [...withoutOldAutomaticEntries, ...automaticEntries];
}
