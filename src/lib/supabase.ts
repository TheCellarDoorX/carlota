import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      game_state: {
        Row: {
          id: number;
          my_image: string | null;
          their_image: string | null;
          my_points: number;
          their_points: number;
          current_user: string | null;
          is_setup: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          my_image?: string | null;
          their_image?: string | null;
          my_points?: number;
          their_points?: number;
          current_user?: string | null;
          is_setup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          my_image?: string | null;
          their_image?: string | null;
          my_points?: number;
          their_points?: number;
          current_user?: string | null;
          is_setup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      history: {
        Row: {
          id: number;
          person: string;
          amount: number;
          reason: string;
          given_by: string | null;
          disputed: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          person: string;
          amount: number;
          reason: string;
          given_by?: string | null;
          disputed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          person?: string;
          amount?: number;
          reason?: string;
          given_by?: string | null;
          disputed?: boolean;
          created_at?: string;
        };
      };
      disputes: {
        Row: {
          id: number;
          entry_id: number;
          dispute_reason: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: number;
          entry_id: number;
          dispute_reason: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: number;
          entry_id?: number;
          dispute_reason?: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
      };
    };
  };
};
