export const TASK_MESSAGES = {
  TASK_NOT_FOUND: 'Task not found',
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  INVALID_FREQUENCY: 'Invalid task frequency type',
  INVALID_DATE_RANGE: 'Invalid date range provided',
  INVALID_TIME_FORMAT: 'Invalid time format',
} as const;

export const TASK_FREQUENCY = {
  ONCE: 'ONCE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export const TASK_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  OVERDUE: 'OVERDUE',
} as const;

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
