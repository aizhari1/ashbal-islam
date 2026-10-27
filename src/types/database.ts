export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'supervisor' | 'teacher' | 'parent' | 'student'
export type StudentStatus = 'نشط' | 'موقوف' | 'منسحب' | 'تجريبي' | 'مؤجل'
export type AttendanceStatus = 'حاضر' | 'غائب' | 'متأخر' | 'معذور' | 'تجريبي'
export type SubscriptionType = 'شهري' | 'باقة' | 'تجريبي' | 'حر'
export type PaymentStatus = 'مدفوع' | 'جزئي' | 'معلق' | 'ملغي'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          code: string | null
          full_name: string
          role: UserRole
          email: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          code?: string | null
          full_name: string
          role?: UserRole
          email?: string | null
          phone?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      teachers: {
        Row: {
          id: string
          code: string
          name: string
          email: string | null
          phone: string | null
          profile_id: string | null
          rate_percent: number
          max_capacity: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          email?: string | null
          phone?: string | null
          profile_id?: string | null
          rate_percent?: number
          max_capacity?: number
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['teachers']['Insert']>
      }
      students: {
        Row: {
          id: string
          code: string
          name: string
          teacher_id: string | null
          parent_id: string | null
          status: StudentStatus
          subscription_type: SubscriptionType | null
          session_duration: number | null
          age: number | null
          country: string | null
          email: string | null
          phone: string | null
          amount_due: number
          currency: string
          price_per_session: number | null
          join_date: string | null
          last_session_num: number | null
          last_session_date: string | null
          monthly_sessions: number | null
          notes: string | null
          package_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          teacher_id?: string | null
          parent_id?: string | null
          status?: StudentStatus
          subscription_type?: SubscriptionType | null
          session_duration?: number | null
          age?: number | null
          country?: string | null
          email?: string | null
          phone?: string | null
          amount_due?: number
          currency?: string
          price_per_session?: number | null
          join_date?: string | null
          last_session_num?: number | null
          last_session_date?: string | null
          monthly_sessions?: number | null
          notes?: string | null
          package_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }
      packages: {
        Row: {
          id: string
          name: string
          sessions_count: number
          duration_minutes: number
          price: number
          currency: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sessions_count: number
          duration_minutes?: number
          price: number
          currency?: string
          description?: string | null
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['packages']['Insert']>
      }
      attendance: {
        Row: {
          id: string
          student_id: string
          teacher_id: string | null
          session_date: string
          status: AttendanceStatus
          session_num: number | null
          hifz_from: string | null
          hifz_to: string | null
          muraja_from: string | null
          muraja_to: string | null
          tajweed_notes: string | null
          rating: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          teacher_id?: string | null
          session_date: string
          status: AttendanceStatus
          session_num?: number | null
          hifz_from?: string | null
          hifz_to?: string | null
          muraja_from?: string | null
          muraja_to?: string | null
          tajweed_notes?: string | null
          rating?: number | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
      }
      payments: {
        Row: {
          id: string
          student_id: string
          amount: number
          currency: string
          status: PaymentStatus
          payment_date: string
          method: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          amount: number
          currency?: string
          status?: PaymentStatus
          payment_date: string
          method?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      schedule_entries: {
        Row: {
          id: string
          student_id: string | null
          teacher_id: string | null
          day_of_week: number | null
          start_time: string | null
          duration_minutes: number | null
          session_date: string | null
          status: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          teacher_id?: string | null
          day_of_week?: number | null
          start_time?: string | null
          duration_minutes?: number | null
          session_date?: string | null
          status?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['schedule_entries']['Insert']>
      }
      activity_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
        }
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>
      }
      settings: {
        Row: { key: string; value: string; updated_at: string }
        Insert: { key: string; value: string }
        Update: { value?: string }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      student_status: StudentStatus
      attendance_status: AttendanceStatus
    }
  }
}
