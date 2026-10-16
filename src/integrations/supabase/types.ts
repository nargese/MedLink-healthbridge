export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          cible: string | null
          created_at: string
          details: Json | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          cible?: string | null
          created_at?: string
          details?: Json | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          cible?: string | null
          created_at?: string
          details?: Json | null
          id?: never
        }
        Relationships: []
      }
      cliniques: {
        Row: {
          adresse: string | null
          id: string
          nom: string
          ville: string
        }
        Insert: {
          adresse?: string | null
          id?: string
          nom: string
          ville: string
        }
        Update: {
          adresse?: string | null
          id?: string
          nom?: string
          ville?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          contenu: string
          created_at: string
          id: string
          patient_id: string
          praticien_id: string | null
          rendez_vous_id: string | null
          titre: string
          type: Database["public"]["Enums"]["doc_type"]
        }
        Insert: {
          contenu: string
          created_at?: string
          id?: string
          patient_id: string
          praticien_id?: string | null
          rendez_vous_id?: string | null
          titre: string
          type?: Database["public"]["Enums"]["doc_type"]
        }
        Update: {
          contenu?: string
          created_at?: string
          id?: string
          patient_id?: string
          praticien_id?: string | null
          rendez_vous_id?: string | null
          titre?: string
          type?: Database["public"]["Enums"]["doc_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_praticien_id_fkey"
            columns: ["praticien_id"]
            isOneToOne: false
            referencedRelation: "praticiens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_rendez_vous_id_fkey"
            columns: ["rendez_vous_id"]
            isOneToOne: false
            referencedRelation: "rendez_vous"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: number
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: never
          success: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: never
          success?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lu: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lu?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lu?: boolean
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      praticien_cliniques: {
        Row: {
          clinique_id: string
          praticien_id: string
        }
        Insert: {
          clinique_id: string
          praticien_id: string
        }
        Update: {
          clinique_id?: string
          praticien_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "praticien_cliniques_clinique_id_fkey"
            columns: ["clinique_id"]
            isOneToOne: false
            referencedRelation: "cliniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "praticien_cliniques_praticien_id_fkey"
            columns: ["praticien_id"]
            isOneToOne: false
            referencedRelation: "praticiens"
            referencedColumns: ["id"]
          },
        ]
      }
      praticiens: {
        Row: {
          created_at: string
          id: string
          nom: string
          specialite: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          specialite: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          specialite?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          date_naissance: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          date_naissance?: string | null
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          date_naissance?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      rendez_vous: {
        Row: {
          clinique_id: string
          created_at: string
          debut: string
          id: string
          motif: string | null
          patient_id: string
          praticien_id: string
          statut: Database["public"]["Enums"]["rdv_statut"]
        }
        Insert: {
          clinique_id: string
          created_at?: string
          debut: string
          id?: string
          motif?: string | null
          patient_id: string
          praticien_id: string
          statut?: Database["public"]["Enums"]["rdv_statut"]
        }
        Update: {
          clinique_id?: string
          created_at?: string
          debut?: string
          id?: string
          motif?: string | null
          patient_id?: string
          praticien_id?: string
          statut?: Database["public"]["Enums"]["rdv_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "rendez_vous_clinique_id_fkey"
            columns: ["clinique_id"]
            isOneToOne: false
            referencedRelation: "cliniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendez_vous_praticien_id_fkey"
            columns: ["praticien_id"]
            isOneToOne: false
            referencedRelation: "praticiens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      creneaux_pris: {
        Args: { _jour: string; _praticien: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_aal2: { Args: never; Returns: boolean }
      is_my_patient: { Args: { _patient: string }; Returns: boolean }
      is_staff_admin: { Args: never; Returns: boolean }
      log_access: {
        Args: { _action: string; _cible: string }
        Returns: undefined
      }
      login_locked: { Args: { _email: string }; Returns: boolean }
      my_praticien_id: { Args: never; Returns: string }
      record_login: {
        Args: { _email: string; _success: boolean }
        Returns: undefined
      }
      stats_anonymes: {
        Args: never
        Returns: {
          clinique: string
          mois: string
          specialite: string
          statut: string
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "patient" | "praticien" | "admin"
      doc_type: "resultat" | "compte_rendu" | "ordonnance"
      rdv_statut: "confirme" | "annule" | "termine"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "praticien", "admin"],
      doc_type: ["resultat", "compte_rendu", "ordonnance"],
      rdv_statut: ["confirme", "annule", "termine"],
    },
  },
} as const
