export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          title: string | null
          company: string | null
          location: string | null
          bio: string | null
          avatar_url: string | null
          cover_image_url: string | null
          connections_count: number
          followers_count: number
          posts_count: number
          verified: boolean
          secondary_email: string | null
          secondary_email_verified: boolean
          secondary_email_verified_at: string | null
          is_eu_user: boolean
          country_code: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          title?: string | null
          company?: string | null
          location?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          connections_count?: number
          followers_count?: number
          posts_count?: number
          verified?: boolean
          secondary_email?: string | null
          secondary_email_verified?: boolean
          secondary_email_verified_at?: string | null
          is_eu_user?: boolean
          country_code?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          title?: string | null
          company?: string | null
          location?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_image_url?: string | null
          connections_count?: number
          followers_count?: number
          posts_count?: number
          verified?: boolean
          secondary_email?: string | null
          secondary_email_verified?: boolean
          secondary_email_verified_at?: string | null
          is_eu_user?: boolean
          country_code?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          company: string
          department: string | null
          location: string
          job_type: string
          description: string
          skills: string[]
          benefits: string[]
          remote_available: boolean
          urgent_hiring: boolean
          experience_level: string
          application_deadline: string | null
          contact_email: string | null
          created_by: string
          status: string
          applications_count: number
          views_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          company: string
          department?: string | null
          location: string
          job_type: string
          description: string
          skills: string[]
          benefits: string[]
          remote_available?: boolean
          urgent_hiring?: boolean
          experience_level: string
          application_deadline?: string | null
          contact_email?: string | null
          created_by: string
          status?: string
          applications_count?: number
          views_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          company?: string
          department?: string | null
          location?: string
          job_type?: string
          description?: string
          skills?: string[]
          benefits?: string[]
          remote_available?: boolean
          urgent_hiring?: boolean
          experience_level?: string
          application_deadline?: string | null
          contact_email?: string | null
          created_by?: string
          status?: string
          applications_count?: number
          views_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_id: string
          applicant_id: string
          status: string
          resume_url: string | null
          cover_letter: string | null
          rating: number | null
          shortlisted: boolean
          notes: string | null
          applied_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          applicant_id: string
          status?: string
          resume_url?: string | null
          cover_letter?: string | null
          rating?: number | null
          shortlisted?: boolean
          notes?: string | null
          applied_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          applicant_id?: string
          status?: string
          resume_url?: string | null
          cover_letter?: string | null
          rating?: number | null
          shortlisted?: boolean
          notes?: string | null
          applied_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          author_id: string
          content: string
          image_url: string | null
          likes_count: number
          comments_count: number
          shares_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          image_url?: string | null
          likes_count?: number
          comments_count?: number
          shares_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          content?: string
          image_url?: string | null
          likes_count?: number
          comments_count?: number
          shares_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          read?: boolean
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          participant_1: string
          participant_2: string
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          participant_1: string
          participant_2: string
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          participant_1?: string
          participant_2?: string
          last_message_at?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          actionable: boolean
          priority: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          actionable?: boolean
          priority?: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          actionable?: boolean
          priority?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      admin_invites: {
        Row: {
          id: string
          email: string
          token: string
          expires_at: string
          accepted: boolean
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          token: string
          expires_at: string
          accepted?: boolean
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          token?: string
          expires_at?: string
          accepted?: boolean
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_connection_safely: {
        Args: {
          connection_id: string
        }
        Returns: boolean
      }
      create_notification_safely: {
        Args: {
          notification_type: string
          notification_title: string
          notification_message: string
          target_user_id: string
          notification_actionable?: boolean
          notification_priority?: string
          notification_metadata?: Json | null
        }
        Returns: Database['public']['Tables']['notifications']['Row']
      }
      delete_conversation_safely: {
        Args: {
          conversation_id: string
          user_id: string
        }
        Returns: boolean
      }
      check_connection_permissions: {
        Args: {
          connection_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}