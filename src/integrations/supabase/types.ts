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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ausencias: {
        Row: {
          abono_pecuniario: boolean
          colaborador_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          decimo_terceiro_antecipado: boolean
          dias: number | null
          dias_abono: number | null
          id: string
          observacao: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Insert: {
          abono_pecuniario?: boolean
          colaborador_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          decimo_terceiro_antecipado?: boolean
          dias?: number | null
          dias_abono?: number | null
          id?: string
          observacao?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Update: {
          abono_pecuniario?: boolean
          colaborador_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          decimo_terceiro_antecipado?: boolean
          dias?: number | null
          dias_abono?: number | null
          id?: string
          observacao?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          cargo: string
          created_at: string
          custo_mensal_terceirizado: number | null
          data_admissao: string
          diretoria: string
          duracao_contrato: string | null
          empresa_terceirizada: string | null
          foto_url: string | null
          genero: Database["public"]["Enums"]["genero"]
          gerencia: string
          gestor_contrato: string | null
          grupo: number
          id: string
          lideranca: boolean
          matricula: string | null
          nivel_complexidade: Database["public"]["Enums"]["nivel_complexidade"]
          nome: string
          origem_recurso: string | null
          tipo_vinculo: Database["public"]["Enums"]["tipo_vinculo"]
          trajetoria: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo: string
          created_at?: string
          custo_mensal_terceirizado?: number | null
          data_admissao: string
          diretoria: string
          duracao_contrato?: string | null
          empresa_terceirizada?: string | null
          foto_url?: string | null
          genero: Database["public"]["Enums"]["genero"]
          gerencia: string
          gestor_contrato?: string | null
          grupo: number
          id?: string
          lideranca?: boolean
          matricula?: string | null
          nivel_complexidade: Database["public"]["Enums"]["nivel_complexidade"]
          nome: string
          origem_recurso?: string | null
          tipo_vinculo: Database["public"]["Enums"]["tipo_vinculo"]
          trajetoria: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string
          created_at?: string
          custo_mensal_terceirizado?: number | null
          data_admissao?: string
          diretoria?: string
          duracao_contrato?: string | null
          empresa_terceirizada?: string | null
          foto_url?: string | null
          genero?: Database["public"]["Enums"]["genero"]
          gerencia?: string
          gestor_contrato?: string | null
          grupo?: number
          id?: string
          lideranca?: boolean
          matricula?: string | null
          nivel_complexidade?: Database["public"]["Enums"]["nivel_complexidade"]
          nome?: string
          origem_recurso?: string | null
          tipo_vinculo?: Database["public"]["Enums"]["tipo_vinculo"]
          trajetoria?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_encargos: {
        Row: {
          created_at: string
          data_vigencia: string
          id: string
          nome: string
          taxa: number
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_vigencia?: string
          id?: string
          nome: string
          taxa: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_vigencia?: string
          id?: string
          nome?: string
          taxa?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      custos_mensais: {
        Row: {
          colaborador_id: string
          created_at: string
          custo_anual: number
          custo_mensal: number
          decimo_terceiro: number
          ferias: number
          fgts: number
          id: string
          inss: number
          internet: number
          mes_referencia: string
          pis: number
          plano_saude: number
          salario_base: number
          seguro: number
          um_terco_ferias: number
          vr_va: number
          vt: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          custo_anual?: number
          custo_mensal?: number
          decimo_terceiro?: number
          ferias?: number
          fgts?: number
          id?: string
          inss?: number
          internet?: number
          mes_referencia: string
          pis?: number
          plano_saude?: number
          salario_base?: number
          seguro?: number
          um_terco_ferias?: number
          vr_va?: number
          vt?: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          custo_anual?: number
          custo_mensal?: number
          decimo_terceiro?: number
          ferias?: number
          fgts?: number
          id?: string
          inss?: number
          internet?: number
          mes_referencia?: string
          pis?: number
          plano_saude?: number
          salario_base?: number
          seguro?: number
          um_terco_ferias?: number
          vr_va?: number
          vt?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_mensais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes: {
        Row: {
          created_at: string
          id: string
          mes_referencia: string
          nome_arquivo: string
          qtd_registros: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes_referencia: string
          nome_arquivo: string
          qtd_registros?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mes_referencia?: string
          nome_arquivo?: string
          qtd_registros?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      origens_recurso: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tabela_salarial: {
        Row: {
          created_at: string
          faixa_fim: number
          faixa_inicio: number
          grupo: number
          id: string
          nivel_complexidade: string
          trajetoria: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faixa_fim: number
          faixa_inicio: number
          grupo?: number
          id?: string
          nivel_complexidade: string
          trajetoria: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          faixa_fim?: number
          faixa_inicio?: number
          grupo?: number
          id?: string
          nivel_complexidade?: string
          trajetoria?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "leitura"
      genero: "masculino" | "feminino" | "outro"
      nivel_complexidade:
        | "junior"
        | "pleno"
        | "senior"
        | "especialista"
        | "master"
        | "assistente"
        | "gerente_01"
        | "gerente_02"
        | "gerente_03"
      tipo_ausencia: "ferias" | "licenca_medica" | "licenca_maternidade"
      tipo_vinculo: "clt" | "terceirizado"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "gestor", "leitura"],
      genero: ["masculino", "feminino", "outro"],
      nivel_complexidade: [
        "junior",
        "pleno",
        "senior",
        "especialista",
        "master",
        "assistente",
        "gerente_01",
        "gerente_02",
        "gerente_03",
      ],
      tipo_ausencia: ["ferias", "licenca_medica", "licenca_maternidade"],
      tipo_vinculo: ["clt", "terceirizado"],
    },
  },
} as const
