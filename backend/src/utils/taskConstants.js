const TASK_STATUSES = ["To Do", "In Progress", "In Review", "Done"];

const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"];

function isValidStatus(status) {
  return TASK_STATUSES.includes(status);
}

function isValidPriority(priority) {
  return TASK_PRIORITIES.includes(priority);
}

function canTransitionStatus(currentStatus, nextStatus) {
  if (!isValidStatus(currentStatus) || !isValidStatus(nextStatus)) {
    return false;
  }

  const currentIndex = TASK_STATUSES.indexOf(currentStatus);
  const nextIndex = TASK_STATUSES.indexOf(nextStatus);

  return nextIndex >= currentIndex;
}

module.exports = {
  TASK_STATUSES,
  TASK_PRIORITIES,
  isValidStatus,
  isValidPriority,
  canTransitionStatus,
};
