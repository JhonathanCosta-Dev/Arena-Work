export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_path: string | null;
          banner_path: string | null;
          role: Database['public']['Enums']['app_role'];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_path?: string | null;
          banner_path?: string | null;
          role?: Database['public']['Enums']['app_role'];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          avatar_path?: string | null;
          banner_path?: string | null;
          role?: Database['public']['Enums']['app_role'];
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_settings: {
        Row: {
          id: number;
          name: string | null;
          icon_path: string | null;
          banner_path: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Record<PropertyKey, never>;
        Update: Record<PropertyKey, never>;
        Relationships: [];
      };
      sports: {
        Row: {
          id: string;
          slug: string;
          name: string;
          is_active: boolean;
          rules: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          is_active?: boolean;
          rules?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          is_active?: boolean;
          rules?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          sport_id: string;
          name: string;
          slug: string;
          starts_at: string;
          ends_at: string;
          status: Database['public']['Enums']['season_status'];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sport_id: string;
          name: string;
          slug: string;
          starts_at: string;
          ends_at: string;
          status?: Database['public']['Enums']['season_status'];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          starts_at?: string;
          ends_at?: string;
          status?: Database['public']['Enums']['season_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seasons_sport_id_fkey';
            columns: ['sport_id'];
            isOneToOne: false;
            referencedRelation: 'sports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seasons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          season_id: string;
          created_by: string;
          request_id: string;
          status: Database['public']['Enums']['match_status'];
          played_at: string;
          confirmed_by: string | null;
          confirmed_at: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          created_by: string;
          request_id: string;
          status?: Database['public']['Enums']['match_status'];
          played_at?: string;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: Database['public']['Enums']['match_status'];
          played_at?: string;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          version?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'seasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      match_sides: {
        Row: {
          id: string;
          match_id: string;
          side: number;
          score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          side: number;
          score: number;
          created_at?: string;
        };
        Update: { score?: number };
        Relationships: [
          {
            foreignKeyName: 'match_sides_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      match_participants: {
        Row: {
          match_id: string;
          side_id: string;
          profile_id: string;
          created_at: string;
        };
        Insert: {
          match_id: string;
          side_id: string;
          profile_id: string;
          created_at?: string;
        };
        Update: Record<PropertyKey, never>;
        Relationships: [
          {
            foreignKeyName: 'match_participants_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_participants_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_participants_side_fk';
            columns: ['side_id', 'match_id'];
            isOneToOne: false;
            referencedRelation: 'match_sides';
            referencedColumns: ['id', 'match_id'];
          },
        ];
      };
      match_disputes: {
        Row: {
          id: string;
          match_id: string;
          opened_by: string;
          reason: string | null;
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          opened_by: string;
          reason?: string | null;
        };
        Update: {
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      season_results: {
        Row: {
          id: string;
          season_id: string;
          profile_id: string;
          final_position: number;
          points: number;
          wins: number;
          losses: number;
          matches_played: number;
          win_rate: number;
          best_streak: number;
          snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          profile_id: string;
          final_position: number;
          points: number;
          wins: number;
          losses: number;
          matches_played: number;
          win_rate: number;
          best_streak: number;
          snapshot?: Json;
          created_at?: string;
        };
        Update: Record<PropertyKey, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: number;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Update: Record<PropertyKey, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      register_match: {
        Args: {
          p_request_id: string;
          p_opponent_id: string;
          p_score_self: number;
          p_score_opponent: number;
        };
        Returns: string;
      };
      confirm_match: { Args: { p_match_id: string }; Returns: undefined };
      dispute_match: {
        Args: { p_match_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: undefined;
      };
      admin_start_season: { Args: { p_season_id: string }; Returns: undefined };
      admin_finish_season: { Args: { p_season_id: string }; Returns: undefined };
      admin_create_season: {
        Args: { p_name: string; p_start_date: string; p_end_date: string; p_timezone: string };
        Returns: string;
      };
      admin_update_season: {
        Args: {
          p_season_id: string;
          p_name: string;
          p_start_date: string;
          p_end_date: string;
          p_timezone: string;
        };
        Returns: undefined;
      };
      update_my_profile: {
        Args: { p_name: string; p_avatar_path: string | null; p_banner_path: string | null };
        Returns: undefined;
      };
      admin_update_company: {
        Args: { p_name: string | null; p_icon_path: string | null; p_banner_path: string | null };
        Returns: undefined;
      };
      admin_set_profile_active: {
        Args: { p_profile_id: string; p_active: boolean };
        Returns: undefined;
      };
      admin_resolve_dispute: {
        Args: {
          p_match_id: string;
          p_resolution: string;
          p_score_side_1?: number | null;
          p_score_side_2?: number | null;
        };
        Returns: undefined;
      };
      admin_cancel_match: {
        Args: { p_match_id: string; p_reason: string };
        Returns: undefined;
      };
      current_user_is_active: { Args: Record<PropertyKey, never>; Returns: boolean };
      current_user_is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_match_participant: {
        Args: { p_match_id: string; p_profile_id: string };
        Returns: boolean;
      };
      can_view_match: { Args: { p_match_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: 'employee' | 'admin';
      season_status: 'scheduled' | 'active' | 'finished';
      match_status: 'pending_confirmation' | 'confirmed' | 'disputed' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
};
