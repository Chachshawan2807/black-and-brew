export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export interface Shift {
  id: string;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  created_at?: string;
  status: 'scheduled' | 'completed' | 'swapped' | 'cancelled' | 'on_leave';
  metadata: {
    location?: string;
    notes?: string;
    remark?: string;
    is_management?: boolean;
    [key: string]: unknown;
  };
  profiles?: Profile | null;
}

