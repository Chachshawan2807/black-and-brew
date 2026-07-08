export interface MaintenanceServiceRecord {
  id?: string;
  equipment: string;
  work_details?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  recommended_frequency?: string | null;
  status?: string | null;
  detected_problem?: string | null;
  task_type?: string | null;
}

export type MaintenanceUrgencyGroup =
  | 'overdue'
  | 'within_7_days'
  | 'within_30_days'
  | 'within_90_days'
  | 'later';

export interface UpcomingMaintenanceTask {
  id: string;
  equipment: string;
  advice: string;
  dueDate: string;
  urgency: MaintenanceUrgencyGroup;
}
