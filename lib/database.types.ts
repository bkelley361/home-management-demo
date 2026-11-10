export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      asset_categories: {
        Row: {
          asset_type: string;
          color_key: string | null;
          home_id: string;
          icon_key: string;
          id: string;
          legacy_kind: string | null;
          name: string;
        };
        Insert: {
          asset_type: string;
          color_key?: string | null;
          home_id: string;
          icon_key: string;
          id?: string;
          legacy_kind?: string | null;
          name: string;
        };
        Update: {
          asset_type?: string;
          color_key?: string | null;
          home_id?: string;
          icon_key?: string;
          id?: string;
          legacy_kind?: string | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_categories_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
      assets: {
        Row: {
          asset_type: string;
          brand: string | null;
          category_id: string | null;
          home_id: string;
          id: string;
          install_date: number | null;
          location_in_home: string | null;
          make: string | null;
          mileage: number | null;
          mileage_updated_at: number | null;
          model: string | null;
          model_number: string | null;
          name: string | null;
          purchase_date: number | null;
          purchase_price_cents: number | null;
          registered_at: number | null;
          registration_confirmation: string | null;
          registration_status: string | null;
          serial_number: string | null;
          trim: string | null;
          vin: string | null;
          warranty_expires_at: number | null;
          year: number | null;
        };
        Insert: {
          asset_type: string;
          brand?: string | null;
          category_id?: string | null;
          home_id: string;
          id?: string;
          install_date?: number | null;
          location_in_home?: string | null;
          make?: string | null;
          mileage?: number | null;
          mileage_updated_at?: number | null;
          model?: string | null;
          model_number?: string | null;
          name?: string | null;
          purchase_date?: number | null;
          purchase_price_cents?: number | null;
          registered_at?: number | null;
          registration_confirmation?: string | null;
          registration_status?: string | null;
          serial_number?: string | null;
          trim?: string | null;
          vin?: string | null;
          warranty_expires_at?: number | null;
          year?: number | null;
        };
        Update: {
          asset_type?: string;
          brand?: string | null;
          category_id?: string | null;
          home_id?: string;
          id?: string;
          install_date?: number | null;
          location_in_home?: string | null;
          make?: string | null;
          mileage?: number | null;
          mileage_updated_at?: number | null;
          model?: string | null;
          model_number?: string | null;
          name?: string | null;
          purchase_date?: number | null;
          purchase_price_cents?: number | null;
          registered_at?: number | null;
          registration_confirmation?: string | null;
          registration_status?: string | null;
          serial_number?: string | null;
          trim?: string | null;
          vin?: string | null;
          warranty_expires_at?: number | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'assets_category_id_home_id_asset_type_fkey';
            columns: ['category_id', 'home_id', 'asset_type'];
            isOneToOne: false;
            referencedRelation: 'asset_categories';
            referencedColumns: ['id', 'home_id', 'asset_type'];
          },
          {
            foreignKeyName: 'assets_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          asset_id: string | null;
          content_type: string | null;
          doc_type: string;
          home_id: string;
          id: string;
          size_bytes: number | null;
          storage_path: string;
          title: string;
          uploaded_at: number;
          uploaded_by_id: string | null;
        };
        Insert: {
          asset_id?: string | null;
          content_type?: string | null;
          doc_type: string;
          home_id: string;
          id?: string;
          size_bytes?: number | null;
          storage_path: string;
          title: string;
          uploaded_at: number;
          uploaded_by_id?: string | null;
        };
        Update: {
          asset_id?: string | null;
          content_type?: string | null;
          doc_type?: string;
          home_id?: string;
          id?: string;
          size_bytes?: number | null;
          storage_path?: string;
          title?: string;
          uploaded_at?: number;
          uploaded_by_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_asset_id_home_id_fkey';
            columns: ['asset_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id', 'home_id'];
          },
          {
            foreignKeyName: 'documents_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_uploaded_by_id_fkey';
            columns: ['uploaded_by_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      expenses: {
        Row: {
          amount_cents: number;
          asset_id: string | null;
          category: string;
          created_by_id: string;
          description: string | null;
          home_id: string;
          id: string;
          incurred_at: number;
          notes: string | null;
          vendor: string | null;
        };
        Insert: {
          amount_cents: number;
          asset_id?: string | null;
          category: string;
          created_by_id: string;
          description?: string | null;
          home_id: string;
          id?: string;
          incurred_at: number;
          notes?: string | null;
          vendor?: string | null;
        };
        Update: {
          amount_cents?: number;
          asset_id?: string | null;
          category?: string;
          created_by_id?: string;
          description?: string | null;
          home_id?: string;
          id?: string;
          incurred_at?: number;
          notes?: string | null;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_asset_id_home_id_fkey';
            columns: ['asset_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id', 'home_id'];
          },
          {
            foreignKeyName: 'expenses_created_by_id_fkey';
            columns: ['created_by_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'expenses_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
      google_calendar_links: {
        Row: {
          backend_token_ref: string;
          calendar_id: string;
          id: string;
          profile_id: string;
          sync_enabled: boolean;
        };
        Insert: {
          backend_token_ref: string;
          calendar_id: string;
          id?: string;
          profile_id: string;
          sync_enabled: boolean;
        };
        Update: {
          backend_token_ref?: string;
          calendar_id?: string;
          id?: string;
          profile_id?: string;
          sync_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'google_calendar_links_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      home_members: {
        Row: {
          home_id: string;
          id: string;
          invited_at: number | null;
          joined_at: number | null;
          profile_id: string;
          role: string;
        };
        Insert: {
          home_id: string;
          id?: string;
          invited_at?: number | null;
          joined_at?: number | null;
          profile_id: string;
          role: string;
        };
        Update: {
          home_id?: string;
          id?: string;
          invited_at?: number | null;
          joined_at?: number | null;
          profile_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'home_members_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'home_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      homes: {
        Row: {
          acreage: number | null;
          city: string;
          created_by_user_id: string;
          has_sprinklers: boolean;
          id: string;
          lat: number | null;
          lng: number | null;
          property_type: string;
          sprinkler_zone_count: number | null;
          state: string;
          street: string;
          waste_system: string;
          water_source: string;
          year_built: number | null;
          zip: string;
        };
        Insert: {
          acreage?: number | null;
          city: string;
          created_by_user_id: string;
          has_sprinklers: boolean;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          property_type: string;
          sprinkler_zone_count?: number | null;
          state: string;
          street: string;
          waste_system: string;
          water_source: string;
          year_built?: number | null;
          zip: string;
        };
        Update: {
          acreage?: number | null;
          city?: string;
          created_by_user_id?: string;
          has_sprinklers?: boolean;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          property_type?: string;
          sprinkler_zone_count?: number | null;
          state?: string;
          street?: string;
          waste_system?: string;
          water_source?: string;
          year_built?: number | null;
          zip?: string;
        };
        Relationships: [];
      };
      parts: {
        Row: {
          asset_id: string;
          brand: string | null;
          home_id: string;
          id: string;
          last_replaced_date: number | null;
          notes: string | null;
          part_name: string;
          part_number: string | null;
          replacement_rule: string | null;
          source_link: string | null;
        };
        Insert: {
          asset_id: string;
          brand?: string | null;
          home_id: string;
          id?: string;
          last_replaced_date?: number | null;
          notes?: string | null;
          part_name: string;
          part_number?: string | null;
          replacement_rule?: string | null;
          source_link?: string | null;
        };
        Update: {
          asset_id?: string;
          brand?: string | null;
          home_id?: string;
          id?: string;
          last_replaced_date?: number | null;
          notes?: string | null;
          part_name?: string;
          part_number?: string | null;
          replacement_rule?: string | null;
          source_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'parts_asset_id_home_id_fkey';
            columns: ['asset_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id', 'home_id'];
          },
          {
            foreignKeyName: 'parts_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
      parts_lookup_cache: {
        Row: {
          asset_type: string;
          cache_key: string;
          created_at: string;
          grounded: boolean;
          model: string;
          provider: string;
          query: string;
          result: Json;
          updated_at: string;
        };
        Insert: {
          asset_type: string;
          cache_key: string;
          created_at?: string;
          grounded?: boolean;
          model: string;
          provider: string;
          query: string;
          result: Json;
          updated_at?: string;
        };
        Update: {
          asset_type?: string;
          cache_key?: string;
          created_at?: string;
          grounded?: boolean;
          model?: string;
          provider?: string;
          query?: string;
          result?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          display_name: string | null;
          phone: string | null;
          user_id: string;
        };
        Insert: {
          display_name?: string | null;
          phone?: string | null;
          user_id: string;
        };
        Update: {
          display_name?: string | null;
          phone?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          asset_id: string | null;
          auto_key: string | null;
          calendar_event_id: string | null;
          completed_at: number | null;
          created_by_id: string;
          due_date: number;
          due_mileage: number | null;
          google_event_id: string | null;
          home_id: string;
          id: string;
          next_reminder_id: string | null;
          notification_id: string | null;
          part_id: string | null;
          recurrence_rule: string;
          snoozed_until: number | null;
          source: string | null;
          status: string;
          title: string;
          undo_expires_at: number | null;
          utility_provider_id: string | null;
        };
        Insert: {
          asset_id?: string | null;
          auto_key?: string | null;
          calendar_event_id?: string | null;
          completed_at?: number | null;
          created_by_id: string;
          due_date: number;
          due_mileage?: number | null;
          google_event_id?: string | null;
          home_id: string;
          id?: string;
          next_reminder_id?: string | null;
          notification_id?: string | null;
          part_id?: string | null;
          recurrence_rule: string;
          snoozed_until?: number | null;
          source?: string | null;
          status: string;
          title: string;
          undo_expires_at?: number | null;
          utility_provider_id?: string | null;
        };
        Update: {
          asset_id?: string | null;
          auto_key?: string | null;
          calendar_event_id?: string | null;
          completed_at?: number | null;
          created_by_id?: string;
          due_date?: number;
          due_mileage?: number | null;
          google_event_id?: string | null;
          home_id?: string;
          id?: string;
          next_reminder_id?: string | null;
          notification_id?: string | null;
          part_id?: string | null;
          recurrence_rule?: string;
          snoozed_until?: number | null;
          source?: string | null;
          status?: string;
          title?: string;
          undo_expires_at?: number | null;
          utility_provider_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_asset_id_home_id_fkey';
            columns: ['asset_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id', 'home_id'];
          },
          {
            foreignKeyName: 'reminders_created_by_id_fkey';
            columns: ['created_by_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'reminders_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_next_reminder_id_home_id_fkey';
            columns: ['next_reminder_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'reminders';
            referencedColumns: ['id', 'home_id'];
          },
          {
            foreignKeyName: 'reminders_part_id_home_id_fkey';
            columns: ['part_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'parts';
            referencedColumns: ['id', 'home_id'];
          },
          {
            foreignKeyName: 'reminders_utility_provider_id_home_id_fkey';
            columns: ['utility_provider_id', 'home_id'];
            isOneToOne: false;
            referencedRelation: 'utility_providers';
            referencedColumns: ['id', 'home_id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          expires_at: number | null;
          id: string;
          lookup_count: number | null;
          lookup_day: string | null;
          product_id: string | null;
          status: string;
          trial_ends_at: number | null;
          updated_at: number;
          user_id: string;
        };
        Insert: {
          expires_at?: number | null;
          id?: string;
          lookup_count?: number | null;
          lookup_day?: string | null;
          product_id?: string | null;
          status: string;
          trial_ends_at?: number | null;
          updated_at: number;
          user_id: string;
        };
        Update: {
          expires_at?: number | null;
          id?: string;
          lookup_count?: number | null;
          lookup_day?: string | null;
          product_id?: string | null;
          status?: string;
          trial_ends_at?: number | null;
          updated_at?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      utility_providers: {
        Row: {
          account_number: string | null;
          bill_due_day: number | null;
          home_id: string;
          id: string;
          provider_name: string;
          type: string;
          website: string | null;
        };
        Insert: {
          account_number?: string | null;
          bill_due_day?: number | null;
          home_id: string;
          id?: string;
          provider_name: string;
          type: string;
          website?: string | null;
        };
        Update: {
          account_number?: string | null;
          bill_due_day?: number | null;
          home_id?: string;
          id?: string;
          provider_name?: string;
          type?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'utility_providers_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_auto_reminders: {
        Args: { p_home_id: string; p_reminders: Json };
        Returns: {
          asset_id: string | null;
          auto_key: string | null;
          calendar_event_id: string | null;
          completed_at: number | null;
          created_by_id: string;
          due_date: number;
          due_mileage: number | null;
          google_event_id: string | null;
          home_id: string;
          id: string;
          next_reminder_id: string | null;
          notification_id: string | null;
          part_id: string | null;
          recurrence_rule: string;
          snoozed_until: number | null;
          source: string | null;
          status: string;
          title: string;
          undo_expires_at: number | null;
          utility_provider_id: string | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'reminders';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      complete_reminder: {
        Args: {
          p_completed_at: number;
          p_current_mileage?: number;
          p_next_due_date?: number;
          p_next_due_mileage?: number;
          p_next_reminder_id?: string;
          p_reminder_id: string;
          p_undo_expires_at: number;
        };
        Returns: undefined;
      };
      create_onboarding_home: {
        Args: {
          p_city: string;
          p_has_sprinklers: boolean;
          p_property_type: string;
          p_septic_reminder_due_date?: number;
          p_state: string;
          p_street: string;
          p_waste_system: string;
          p_water_source: string;
          p_zip: string;
        };
        Returns: {
          home_id: string;
          membership_id: string;
          profile_id: string;
        }[];
      };
      create_utility_provider_with_bill_reminder: {
        Args: {
          p_account_number: string;
          p_bill_due_day: number;
          p_home_id: string;
          p_next_due_date: number;
          p_provider_name: string;
          p_type: string;
          p_website: string;
        };
        Returns: {
          provider_id: string;
          reminder_id: string;
        }[];
      };
      delete_asset_category: {
        Args: { p_category_id: string; p_destination_category_id?: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
