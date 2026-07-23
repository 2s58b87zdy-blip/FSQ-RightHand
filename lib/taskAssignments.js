export function taskAssignees(task) {
  const names = Array.isArray(task?.assignees) && task.assignees.length
    ? task.assignees
    : [task?.person];
  return [...new Set(names.map(name => String(name || '').trim()).filter(Boolean))];
}

export function isTaskAssignedTo(task, userName) {
  const target = String(userName || '').trim().toLowerCase();
  return Boolean(target && taskAssignees(task).some(name => name.toLowerCase() === target));
}

export function assignmentLabel(task) {
  return taskAssignees(task).join(', ') || 'Ikke tildelt';
}

export function taskHasActiveProject(task, projects) {
  const projectName = String(task?.project || '').trim();
  if (!projectName || projectName.toLowerCase() === 'general') return true;
  return (Array.isArray(projects) ? projects : []).some(project =>
    String(project?.name || '').trim().toLowerCase() === projectName.toLowerCase()
  );
}
