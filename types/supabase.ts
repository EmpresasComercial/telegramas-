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
      account_user: {
        Row: {
          id: string
          saldo_disponivel: number
          senha_saque: string | null
          total_recarregado: number
          total_retirado: number
          updated_at: string
        }
        Insert: {
          id: string
          saldo_disponivel?: number
          senha_saque?: string | null
          total_recarregado?: number
          total_retirado?: number
          updated_at?: string
        }
        Update: {
          id?: string
          saldo_disponivel?: number
          senha_saque?: string | null
          total_recarregado?: number
          total_retirado?: number
          updated_at?: string
        }
        Relationships: []
      }
      atendimento_links: {
        Row: {
          created_at: string | null
          facebook_url: string | null
          id: string
          link_app_atualizado: string | null
          splash_message: string | null
          telegram_url: string | null
          video_hub_url: string | null
          whatsapp_gerente_url: string | null
          whatsapp_grupo_vendas_url: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          facebook_url?: string | null
          id?: string
          link_app_atualizado?: string | null
          splash_message?: string | null
          telegram_url?: string | null
          video_hub_url?: string | null
          whatsapp_gerente_url?: string | null
          whatsapp_grupo_vendas_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          facebook_url?: string | null
          id?: string
          link_app_atualizado?: string | null
          splash_message?: string | null
          telegram_url?: string | null
          video_hub_url?: string | null
          whatsapp_gerente_url?: string | null
          whatsapp_grupo_vendas_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      bancos_arrecadacao_mcpn: {
        Row: {
          created_at: string | null
          iban: string
          id: string
          nome_banco: string
          nome_proprietario: string
        }
        Insert: {
          created_at?: string | null
          iban: string
          id?: string
          nome_banco: string
          nome_proprietario: string
        }
        Update: {
          created_at?: string | null
          iban?: string
          id?: string
          nome_banco?: string
          nome_proprietario?: string
        }
        Relationships: []
      }
      bonus_equipe_mcpn: {
        Row: {
          created_at: string | null
          descricao: string | null
          from_user_id: string | null
          id: string
          nivel: number
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          from_user_id?: string | null
          id?: string
          nivel: number
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          from_user_id?: string | null
          id?: string
          nivel?: number
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_bonus_from_user_final"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bonus_user_final"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_gruop: {
        Row: {
          data_registrada: string
          id: number
          mensagem: string
          reacoes_emojis: string
          uid_emissor: string
          url_imagen_conversa: string
        }
        Insert: {
          data_registrada?: string
          id?: number
          mensagem: string
          reacoes_emojis?: string
          uid_emissor: string
          url_imagen_conversa?: string
        }
        Update: {
          data_registrada?: string
          id?: number
          mensagem?: string
          reacoes_emojis?: string
          uid_emissor?: string
          url_imagen_conversa?: string
        }
        Relationships: []
      }
      contas_bancarias_mcpn: {
        Row: {
          created_at: string
          iban: string
          nome_banco: string
          nome_completo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          iban: string
          nome_banco: string
          nome_completo: string
          user_id: string
        }
        Update: {
          created_at?: string
          iban?: string
          nome_banco?: string
          nome_completo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_banco_account_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redeem: {
        Row: {
          coupon_id: string | null
          created_at: string
          id: string
          status: boolean
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          status?: boolean
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          status?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_coupon_redeem_source"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_coupon_redeem_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean
          codigo_cupom: string
          created_at: string
          id: string
          usos_restantes: number | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo_cupom: string
          created_at?: string
          id?: string
          usos_restantes?: number | null
          valor: number
        }
        Update: {
          ativo?: boolean
          codigo_cupom?: string
          created_at?: string
          id?: string
          usos_restantes?: number | null
          valor?: number
        }
        Relationships: []
      }
      equipe_mcpn: {
        Row: {
          created_at: string | null
          id: number
          nivel_direto: number | null
          patrocinador_id: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          nivel_direto?: number | null
          patrocinador_id?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          nivel_direto?: number | null
          patrocinador_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_equipe_patrocinador"
            columns: ["patrocinador_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_equipe_user"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_suporte_mcpn: {
        Row: {
          created_at: string | null
          id: string
          mensagem: string
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mensagem: string
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mensagem?: string
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_feedback_account_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_audit_mcpn: {
        Row: {
          action_type: string | null
          created_at: string | null
          details: Json | null
          id: number
          ip_address: unknown
          success: boolean | null
          usuario_id: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address: unknown
          success?: boolean | null
          usuario_id?: string
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: unknown
          success?: boolean | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ip_audit_account_user"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_mcpn: {
        Row: {
          codigo_captcha: string | null
          codigo_convite_ref: string | null
          codigo_meu_refferal: string
          created_at: string
          device_id: string | null
          id: string
          ip_registro: unknown
          telefone: string
        }
        Insert: {
          codigo_captcha?: string | null
          codigo_convite_ref?: string | null
          codigo_meu_refferal: string
          created_at?: string
          device_id?: string | null
          id: string
          ip_registro?: unknown
          telefone: string
        }
        Update: {
          codigo_captcha?: string | null
          codigo_convite_ref?: string | null
          codigo_meu_refferal?: string
          created_at?: string
          device_id?: string | null
          id?: string
          ip_registro?: unknown
          telefone?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          duracao_dias: number
          id: string
          imagem_url: string | null
          limite_compra: number | null
          nome: string
          preco: number
          renda_diaria: number
          storage_size: string | null
          updated_at: string | null
          url_download_setup: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          duracao_dias: number
          id?: string
          imagem_url?: string | null
          limite_compra?: number | null
          nome: string
          preco: number
          renda_diaria: number
          storage_size?: string | null
          updated_at?: string | null
          url_download_setup?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          duracao_dias?: number
          id?: string
          imagem_url?: string | null
          limite_compra?: number | null
          nome?: string
          preco?: number
          renda_diaria?: number
          storage_size?: string | null
          updated_at?: string | null
          url_download_setup?: string | null
        }
        Relationships: []
      }
      recargas_mcpn: {
        Row: {
          banco_origem: string
          id: string
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          banco_origem: string
          id?: string
          status?: string
          user_id: string
          valor: number
        }
        Update: {
          banco_origem?: string
          id?: string
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_recargas_user_final"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      recharges_usdt_mcpn: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          tx_hash: string | null
          user_id: string
          valor_usdt: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          tx_hash?: string | null
          user_id: string
          valor_usdt: number
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          tx_hash?: string | null
          user_id?: string
          valor_usdt?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_recharges_usdt_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      renda_diaria_mcpn: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          user_produto_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          user_produto_id?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          user_produto_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_renda_diaria_account_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_renda_user_produto"
            columns: ["user_produto_id"]
            isOneToOne: false
            referencedRelation: "user_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      retiradas_mcpn: {
        Row: {
          created_at: string
          dados_bancarios_snapshot: Json
          id: string
          status: string
          user_id: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          created_at?: string
          dados_bancarios_snapshot: Json
          id?: string
          status?: string
          user_id: string
          valor_bruto: number
          valor_liquido?: number
        }
        Update: {
          created_at?: string
          dados_bancarios_snapshot?: Json
          id?: string
          status?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_retiradas_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      social_proofs_mcpn: {
        Row: {
          comentario: string
          created_at: string | null
          id: string
          imagem_url: string
          status: string | null
          user_id: string
          valor: number
        }
        Insert: {
          comentario: string
          created_at?: string | null
          id?: string
          imagem_url: string
          status?: string | null
          user_id: string
          valor: number
        }
        Update: {
          comentario?: string
          created_at?: string | null
          id?: string
          imagem_url?: string
          status?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_social_proof_account_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
      usdt_config_mcpn: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          endereco_carteira: string
          id: number
          taxa_cambio: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          endereco_carteira: string
          id?: number
          taxa_cambio?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          endereco_carteira?: string
          id?: number
          taxa_cambio?: number | null
        }
        Relationships: []
      }
      user_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          dias_restantes: number | null
          id: string
          preco_pago: number
          produto_id: string | null
          renda_diaria: number
          storage_size: string | null
          url_download_setup: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim: string
          data_inicio?: string
          dias_restantes?: number | null
          id?: string
          preco_pago: number
          produto_id?: string | null
          renda_diaria: number
          storage_size?: string | null
          url_download_setup?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias_restantes?: number | null
          id?: string
          preco_pago?: number
          produto_id?: string | null
          renda_diaria?: number
          storage_size?: string | null
          url_download_setup?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_produtos_account_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacoes_usuarios_mcpn: {
        Row: {
          bi_numero: string | null
          created_at: string | null
          frente_path: string | null
          nome: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          verso_path: string | null
        }
        Insert: {
          bi_numero?: string | null
          created_at?: string | null
          frente_path?: string | null
          nome?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          verso_path?: string | null
        }
        Update: {
          bi_numero?: string | null
          created_at?: string | null
          frente_path?: string | null
          nome?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          verso_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_verificacao_account_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "account_user"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_historico_geral: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buy_product_mcpn: { Args: { p_product_id: string }; Returns: Json }
      collect_daily_earnings: { Args: never; Returns: Json }
      confirm_recharge_mcpn: {
        Args: {
          p_bank_name: string
          p_image_path: string
          p_recharge_id: string
        }
        Returns: Json
      }
      distribute_purchase_commission: {
        Args: { p_amount: number; p_buyer_id: string }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      get_approved_social_proofs_mcpn: {
        Args: never
        Returns: {
          comentario: string
          created_at: string
          id: string
          imagem_url: string
          user_id: string
          valor: number
        }[]
      }
      get_available_products_mcpn: {
        Args: never
        Returns: {
          descricao: string
          duracao_dias: number
          id: string
          imagem_url: string
          limite_compra: number
          nome: string
          preco: number
          renda_diaria: number
          size: string
        }[]
      }
      get_client_ip_mcpn: { Args: never; Returns: unknown }
      get_collection_bank_by_id_mcpn: {
        Args: { p_bank_id: string }
        Returns: {
          iban: string
          id: string
          nome_banco: string
          nome_proprietario: string
        }[]
      }
      get_collection_bank_details_mcpn: {
        Args: { p_bank_id: string }
        Returns: {
          iban: string
          id: string
          nome_banco: string
          nome_proprietario: string
        }[]
      }
      get_collection_banks_mcpn: {
        Args: never
        Returns: {
          created_at: string
          iban: string
          id: string
          nome_banco: string
          nome_proprietario: string
        }[]
      }
      get_daily_ops_status_mcpn: { Args: never; Returns: Json }
      get_general_history_mcpn: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          status: string
          type: string
        }[]
      }
      get_my_account_data: {
        Args: never
        Returns: {
          lucro_acumulado: number
          saldo_disponivel: number
          telefone: string
          total_comissao_equipe: number
          total_recarregado: number
          total_retirado: number
        }[]
      }
      get_my_bank_accounts_mcpn: {
        Args: never
        Returns: {
          bank_name: string
          created_at: string
          iban: string
          id: string
          owner_name: string
        }[]
      }
      get_my_purchased_products_mcpn: {
        Args: never
        Returns: {
          ativo: boolean
          data_fim: string
          data_inicio: string
          dias_restantes: number
          id: string
          preco_pago: number
          produto_imagem: string
          produto_nome: string
          storage_size: string
          url_download_setup: string
        }[]
      }
      get_my_recharges_mcpn: {
        Args: never
        Returns: {
          banco_origem: string
          chave_transacao: string
          created_at: string
          id: string
          status: string
          valor: number
        }[]
      }
      get_my_settings_data_mcpn: {
        Args: never
        Returns: {
          invite_code: string
          phone: string
        }[]
      }
      get_my_team_detailed: {
        Args: never
        Returns: {
          created_at: string
          membro_id: string
          nivel: number
          telefone: string
          total_investido: number
          total_recarregado: number
        }[]
      }
      get_my_usdt_recharges_mcpn: {
        Args: never
        Returns: {
          created_at: string
          id: string
          status: string
          tx_hash: string
          valor_usdt: number
        }[]
      }
      get_my_verification_status_mcpn: {
        Args: never
        Returns: {
          status: string
        }[]
      }
      get_my_withdrawals_mcpn: {
        Args: never
        Returns: {
          banco_destino: string
          created_at: string
          iban_snapshot: string
          id: string
          status: string
          valor_bruto: number
          valor_liquido: number
        }[]
      }
      get_product_details_mcpn: {
        Args: { p_id: string }
        Returns: {
          descricao: string
          duracao_dias: number
          id: string
          imagem_url: string
          limite_compra: number
          nome: string
          preco: number
          renda_diaria: number
          size: string
        }[]
      }
      get_withdraw_info_mcpn: {
        Args: never
        Returns: {
          balance: number
          bank_id: string
          bank_name: string
          has_bank: boolean
          has_pending: boolean
          iban: string
          is_verified: boolean
        }[]
      }
      link_bank_account_mcpn: {
        Args: { p_bank_name: string; p_holder_name: string; p_iban: string }
        Returns: Json
      }
      log_ip_audit_mcpn: {
        Args: {
          p_action: string
          p_details?: Json
          p_success: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      process_withdrawal_request: {
        Args: { p_amount: number; p_bank_id: string; p_password: string }
        Returns: Json
      }
      redeem_coupon_mcpn: { Args: { p_code: string }; Returns: Json }
      remove_bank_account_mcpn: { Args: { p_id: string }; Returns: Json }
      request_recharge_kz_mcpn: {
        Args: { p_amount: number; p_bank_id?: string }
        Returns: Json
      }
      request_recharge_mcpn: {
        Args: { p_amount: number; p_bank_name: string }
        Returns: Json
      }
      request_recharge_usdt_mcpn: {
        Args: { p_amount_usdt: number }
        Returns: Json
      }
      save_bank_data_mcpn: {
        Args: { p_bank_name: string; p_holder_name: string; p_iban: string }
        Returns: Json
      }
      secure_registration_mcpn:
        | { Args: { p_invite_code: string; p_phone: string }; Returns: Json }
        | {
            Args: {
              p_device_id?: string
              p_invite_code: string
              p_phone: string
            }
            Returns: Json
          }
      submit_identity_verification_mcpn: {
        Args: {
          p_bi_numero: string
          p_frente_path: string
          p_nome: string
          p_verso_path: string
        }
        Returns: Json
      }
      submit_social_proof_mcpn: {
        Args: { p_comentario: string; p_imagem_url: string; p_valor: number }
        Returns: Json
      }
      submit_support_feedback_mcpn: {
        Args: { p_mensagem: string }
        Returns: Json
      }
      toggle_reaction_mcpn: {
        Args: { p_emoji: string; p_message_id: number; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      status_verificacao_type: "pendente" | "aprovado" | "rejeitado"
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
      status_verificacao_type: ["pendente", "aprovado", "rejeitado"],
    },
  },
} as const
