import { generateUUID } from './utils.ts';
import type { Database } from './database.types.ts';
import {
  DEMO_ASSETS,
  DEMO_CATEGORIES,
  DEMO_DOCUMENTS,
  DEMO_EXPENSES,
  DEMO_HOME,
  DEMO_HOME_MEMBERS,
  DEMO_PARTS,
  DEMO_PROFILE,
  DEMO_REMINDERS,
  DEMO_SUBSCRIPTION,
  DEMO_USER,
  DEMO_USER_ID,
  DEMO_UTILITIES,
} from './mock-data.ts';

type Listener = () => void;
type AuthListener = (event: string, session: any) => void;

class MockStore {
  homes: any[] = JSON.parse(JSON.stringify([DEMO_HOME]));
  home_members: any[] = JSON.parse(JSON.stringify(DEMO_HOME_MEMBERS));
  profiles: any[] = JSON.parse(JSON.stringify([DEMO_PROFILE]));
  asset_categories: any[] = JSON.parse(JSON.stringify(DEMO_CATEGORIES));
  assets: any[] = JSON.parse(JSON.stringify(DEMO_ASSETS));
  reminders: any[] = JSON.parse(JSON.stringify(DEMO_REMINDERS));
  utility_providers: any[] = JSON.parse(JSON.stringify(DEMO_UTILITIES));
  expenses: any[] = JSON.parse(JSON.stringify(DEMO_EXPENSES));
  parts: any[] = JSON.parse(JSON.stringify(DEMO_PARTS));
  subscriptions: any[] = JSON.parse(JSON.stringify([DEMO_SUBSCRIPTION]));
  documents: any[] = JSON.parse(JSON.stringify(DEMO_DOCUMENTS));

  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.warn('[MockStore] listener error:', err);
      }
    }
  }

  reset() {
    this.homes = JSON.parse(JSON.stringify([DEMO_HOME]));
    this.home_members = JSON.parse(JSON.stringify(DEMO_HOME_MEMBERS));
    this.profiles = JSON.parse(JSON.stringify([DEMO_PROFILE]));
    this.asset_categories = JSON.parse(JSON.stringify(DEMO_CATEGORIES));
    this.assets = JSON.parse(JSON.stringify(DEMO_ASSETS));
    this.reminders = JSON.parse(JSON.stringify(DEMO_REMINDERS));
    this.utility_providers = JSON.parse(JSON.stringify(DEMO_UTILITIES));
    this.expenses = JSON.parse(JSON.stringify(DEMO_EXPENSES));
    this.parts = JSON.parse(JSON.stringify(DEMO_PARTS));
    this.subscriptions = JSON.parse(JSON.stringify([DEMO_SUBSCRIPTION]));
    this.documents = JSON.parse(JSON.stringify(DEMO_DOCUMENTS));
    this.notify();
  }
}

export const mockStore = new MockStore();

let currentMockSession: any = {
  user: DEMO_USER,
  access_token: 'mock-demo-access-token',
  token_type: 'bearer',
  expires_in: 3600 * 24 * 365,
  refresh_token: 'mock-refresh-token',
};

const authListeners = new Set<AuthListener>();

class MockQueryBuilder<T = any> {
  private tableName: string;
  private filters: Array<(row: any) => boolean> = [];
  private sortFn: ((a: any, b: any) => number) | null = null;
  private limitCount: number | null = null;
  private selectFields: string = '*';
  private isSingle = false;
  private isMaybeSingle = false;
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = '*'): MockQueryBuilder<T> {
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any): MockQueryBuilder<T> {
    this.filters.push((row) => row && row[column] === value);
    return this;
  }

  is(column: string, value: any): MockQueryBuilder<T> {
    this.filters.push((row) => row && row[column] === value);
    return this;
  }

  neq(column: string, value: any): MockQueryBuilder<T> {
    this.filters.push((row) => row && row[column] !== value);
    return this;
  }

  in(column: string, values: any[]): MockQueryBuilder<T> {
    this.filters.push((row) => row && values.includes(row[column]));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): MockQueryBuilder<T> {
    const ascending = options?.ascending ?? true;
    this.sortFn = (a, b) => {
      const valA = a?.[column];
      const valB = b?.[column];
      if (valA === valB) return 0;
      if (valA == null) return ascending ? 1 : -1;
      if (valB == null) return ascending ? -1 : 1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return ascending ? valA - valB : valB - valA;
      }
      return ascending
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    };
    return this;
  }

  limit(count: number): MockQueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  single(): MockQueryBuilder<T extends Array<infer U> ? U : T> {
    this.isSingle = true;
    return this as any;
  }

  maybeSingle(): MockQueryBuilder<(T extends Array<infer U> ? U : T) | null> {
    this.isMaybeSingle = true;
    return this as any;
  }

  returns<R = any>(): MockQueryBuilder<R> {
    return this as any;
  }

  upsert(payload: any, options?: { onConflict?: string }): MockQueryBuilder<any> {
    this.operation = 'upsert';
    this.payload = { data: payload, options };
    return this;
  }

  insert(payload: any): MockQueryBuilder<any> {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any): MockQueryBuilder<any> {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete(): MockQueryBuilder<any> {
    this.operation = 'delete';
    return this;
  }

  private execute() {
    const tableData: any[] = (mockStore as any)[this.tableName] ?? [];

    if (this.operation === 'upsert') {
      const { data, options } = this.payload;
      const items = Array.isArray(data) ? data : [data];
      const conflictCol = options?.onConflict || 'id';
      const results: any[] = [];

      for (const item of items) {
        const existingIndex = tableData.findIndex(
          (row) => row && row[conflictCol] === item[conflictCol]
        );
        if (existingIndex >= 0) {
          tableData[existingIndex] = {
            ...tableData[existingIndex],
            ...item,
            updated_at: Date.now(),
          };
          results.push(tableData[existingIndex]);
        } else {
          const newItem = { id: generateUUID(), created_at: Date.now(), ...item };
          tableData.push(newItem);
          results.push(newItem);
        }
      }
      mockStore.notify();

      if (this.isSingle) {
        return { data: results[0] ?? null, error: null };
      }
      return { data: Array.isArray(data) ? results : results[0], error: null };
    }

    if (this.operation === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const insertedItems = items.map((item) => ({
        id: generateUUID(),
        created_at: Date.now(),
        ...item,
      }));
      tableData.push(...insertedItems);
      mockStore.notify();

      if (this.isSingle) {
        return { data: insertedItems[0] ?? null, error: null };
      }
      return { data: Array.isArray(this.payload) ? insertedItems : insertedItems[0], error: null };
    }

    if (this.operation === 'update') {
      const matching = tableData.filter((row) => this.filters.every((f) => f(row)));
      for (const row of matching) {
        Object.assign(row, this.payload);
      }
      mockStore.notify();

      if (this.isSingle) {
        return { data: matching[0] ?? null, error: null };
      }
      return { data: matching, error: null };
    }

    if (this.operation === 'delete') {
      const remaining = tableData.filter((row) => !this.filters.every((f) => f(row)));
      (mockStore as any)[this.tableName] = remaining;
      mockStore.notify();
      return { data: null, error: null };
    }

    // Default: 'select'
    let results = tableData.filter((row) => this.filters.every((f) => f(row)));

    // Handle home_members inner join on homes: select('profile_id, homes!inner(*)')
    if (this.tableName === 'home_members' && this.selectFields.includes('homes!inner(*)')) {
      results = results.map((m) => {
        const matchedHome = mockStore.homes.find((h) => h.id === m.home_id) ?? mockStore.homes[0];
        return {
          ...m,
          homes: matchedHome,
        };
      });
    }

    if (this.sortFn) {
      results = [...results].sort(this.sortFn);
    }

    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      if (results.length === 0) {
        return { data: null, error: { message: 'Row not found in mock store', code: 'PGRST116' } };
      }
      return { data: results[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: results[0] ?? null, error: null };
    }

    return { data: results, error: null };
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onFulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const outcome = this.execute();
    return Promise.resolve(outcome as { data: T; error: any }).then(onFulfilled, onRejected);
  }
}

export type MockDbClient = {
  from<K extends keyof Database['public']['Tables']>(
    tableName: K
  ): MockQueryBuilder<Database['public']['Tables'][K]['Row'][]>;
  from<T = any>(tableName: string): MockQueryBuilder<T[]>;
  rpc(fnName: string, args?: any): Promise<{ data: any; error: any }>;
  auth: {
    getUser(): Promise<{ data: { user: any }; error: any }>;
    getSession(): Promise<{ data: { session: any }; error: any }>;
    onAuthStateChange(cb: (event: string, session: any) => void): {
      data: { subscription: { unsubscribe: () => void } };
    };
    signInWithOtp(options: { email: string; options?: any }): Promise<{ data: any; error: any }>;
    verifyOtp(options: {
      email: string;
      token: string;
      type?: string;
    }): Promise<{ data: any; error: any }>;
    signOut(): Promise<{ error: any }>;
  };
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        payload: any,
        options?: any
      ): Promise<{ data: { path: string } | null; error: any }>;
      createSignedUrl(
        path: string,
        expiresIn: number
      ): Promise<{ data: { signedUrl: string } | null; error: any }>;
      remove(paths: string[]): Promise<{ data: any; error: any }>;
    };
  };
  channel(channelName: string): any;
  removeChannel(ch: any): void;
  removeAllChannels(): Promise<any>;
  getChannels(): any[];
};

export function createMockSupabaseClient(): MockDbClient {
  const activeChannels = new Map<string, any>();

  const client: MockDbClient = {
    from(tableName: string) {
      return new MockQueryBuilder(tableName);
    },

    channel(channelName: string) {
      const channelUnsubscribes: Array<() => void> = [];
      const channelObj = {
        topic: channelName,
        on(_type: string, _filter: any, callback: () => void) {
          const unsub = mockStore.subscribe(callback);
          channelUnsubscribes.push(unsub);
          return channelObj;
        },
        subscribe(callback?: (status: string) => void) {
          if (callback) {
            setTimeout(() => callback('SUBSCRIBED'), 0);
          }
          return channelObj;
        },
        unsubscribe() {
          for (const unsub of channelUnsubscribes) {
            try {
              unsub();
            } catch {}
          }
          channelUnsubscribes.length = 0;
          activeChannels.delete(channelName);
          return Promise.resolve('ok');
        },
      };

      activeChannels.set(channelName, channelObj);
      return channelObj;
    },

    async removeChannel(channel: any) {
      if (!channel) return 'ok';
      if (typeof channel.unsubscribe === 'function') {
        try {
          await channel.unsubscribe();
        } catch {}
      }
      if (channel.topic) {
        activeChannels.delete(channel.topic);
      }
      return 'ok';
    },

    async removeAllChannels() {
      for (const channel of Array.from(activeChannels.values())) {
        if (typeof channel.unsubscribe === 'function') {
          try {
            await channel.unsubscribe();
          } catch {}
        }
      }
      activeChannels.clear();
      return ['ok'];
    },

    getChannels() {
      return Array.from(activeChannels.values());
    },

    async rpc(functionName: string, params: any = {}) {
      switch (functionName) {
        case 'create_onboarding_home': {
          const homeId = generateUUID();
          const newHome = {
            id: homeId,
            street: params.p_street,
            city: params.p_city,
            state: params.p_state,
            zip: params.p_zip,
            property_type: params.p_property_type,
            water_source: params.p_water_source,
            waste_system: params.p_waste_system,
            has_sprinklers: params.p_has_sprinklers ?? false,
            sprinkler_zone_count: 4,
            year_built: 2020,
            acreage: 0.25,
            lat: 30.2672,
            lng: -97.7431,
            created_by_user_id: currentMockSession?.user?.id ?? DEMO_USER_ID,
          };
          mockStore.homes.push(newHome);
          mockStore.home_members.push({
            id: generateUUID(),
            home_id: homeId,
            profile_id: currentMockSession?.user?.id ?? DEMO_USER_ID,
            role: 'owner',
            joined_at: Date.now(),
            invited_at: null,
          });

          if (params.p_septic_reminder_due_date) {
            mockStore.reminders.push({
              id: generateUUID(),
              home_id: homeId,
              title: 'Pump septic tank',
              due_date: params.p_septic_reminder_due_date,
              recurrence_rule: 'INTERVAL=3;UNIT=year',
              status: 'pending',
              source: 'auto',
              created_by_id: currentMockSession?.user?.id ?? DEMO_USER_ID,
            });
          }

          mockStore.notify();
          return { data: null, error: null };
        }

        case 'create_utility_provider_with_bill_reminder': {
          const providerId = generateUUID();
          mockStore.utility_providers.push({
            id: providerId,
            home_id: params.p_home_id,
            type: params.p_type,
            provider_name: params.p_provider_name,
            account_number: params.p_account_number,
            website: params.p_website,
            bill_due_day: params.p_bill_due_day,
          });

          mockStore.reminders.push({
            id: generateUUID(),
            home_id: params.p_home_id,
            utility_provider_id: providerId,
            title: `${params.p_provider_name} bill due`,
            due_date: params.p_next_due_date,
            due_mileage: null,
            recurrence_rule: 'INTERVAL=1;UNIT=month',
            status: 'pending',
            source: 'bill',
            auto_key: null,
            created_by_id: currentMockSession?.user?.id ?? DEMO_USER_ID,
          });

          mockStore.notify();
          return { data: null, error: null };
        }

        case 'accept_auto_reminders': {
          const reminders = params.p_reminders ?? [];
          for (const r of reminders) {
            mockStore.reminders.push({
              id: generateUUID(),
              home_id: params.p_home_id,
              asset_id: r.asset_id ?? null,
              title: r.title,
              due_date: r.due_date,
              due_mileage: r.due_mileage ?? null,
              recurrence_rule: r.recurrence_rule,
              status: 'pending',
              source: 'auto',
              auto_key: r.auto_key ?? null,
              created_by_id: currentMockSession?.user?.id ?? DEMO_USER_ID,
              part_id: null,
              calendar_event_id: null,
              google_event_id: null,
              next_reminder_id: null,
              notification_id: null,
              snoozed_until: null,
              undo_expires_at: null,
              utility_provider_id: null,
              completed_at: null,
            });
          }
          mockStore.notify();
          return { data: null, error: null };
        }

        case 'complete_reminder': {
          const target = mockStore.reminders.find((r) => r.id === params.p_reminder_id);
          if (target) {
            target.status = 'completed';
            target.completed_at = params.p_completed_at;
            target.undo_expires_at = params.p_undo_expires_at;

            if (params.p_next_reminder_id && params.p_next_due_date) {
              mockStore.reminders.push({
                ...target,
                id: params.p_next_reminder_id,
                due_date: params.p_next_due_date,
                due_mileage: params.p_next_due_mileage ?? null,
                status: 'pending',
                completed_at: null,
                undo_expires_at: null,
                next_reminder_id: null,
                notification_id: null,
                calendar_event_id: null,
              });
            }

            if (params.p_current_mileage && target.asset_id) {
              const asset = mockStore.assets.find((a) => a.id === target.asset_id);
              if (asset) {
                asset.mileage = params.p_current_mileage;
                asset.mileage_updated_at = Date.now();
              }
            }
          }
          mockStore.notify();
          return { data: null, error: null };
        }

        case 'delete_asset_category': {
          mockStore.asset_categories = mockStore.asset_categories.filter(
            (c) => c.id !== params.p_category_id
          );
          for (const a of mockStore.assets) {
            if (a.category_id === params.p_category_id) {
              a.category_id = params.p_destination_category_id ?? null;
            }
          }
          mockStore.notify();
          return { data: null, error: null };
        }

        default:
          console.warn(`[MockStore] Unhandled RPC call: ${functionName}`);
          return { data: null, error: null };
      }
    },

    auth: {
      async getSession() {
        return { data: { session: currentMockSession }, error: null };
      },

      async getUser() {
        return { data: { user: currentMockSession?.user ?? null }, error: null };
      },

      onAuthStateChange(callback: AuthListener) {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                authListeners.delete(callback);
              },
            },
          },
        };
      },

      async signInWithOtp({ email }: { email?: string }) {
        const user = {
          ...DEMO_USER,
          email: email || DEMO_USER.email,
        };
        currentMockSession = {
          user,
          access_token: 'mock-demo-access-token',
          token_type: 'bearer',
          expires_in: 3600 * 24 * 365,
          refresh_token: 'mock-refresh-token',
        };
        authListeners.forEach((cb) => cb('SIGNED_IN', currentMockSession));
        return { data: {}, error: null };
      },

      async verifyOtp({ email }: { email?: string; token?: string }) {
        const user = {
          ...DEMO_USER,
          email: email || DEMO_USER.email,
        };
        currentMockSession = {
          user,
          access_token: 'mock-demo-access-token',
          token_type: 'bearer',
          expires_in: 3600 * 24 * 365,
          refresh_token: 'mock-refresh-token',
        };
        authListeners.forEach((cb) => cb('SIGNED_IN', currentMockSession));
        return { data: { session: currentMockSession, user }, error: null };
      },

      async signOut() {
        currentMockSession = null;
        authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
    },

    storage: {
      from(_bucket: string) {
        return {
          async upload(path: string, _payload: any) {
            return { data: { path }, error: null };
          },
          async createSignedUrl(path: string, _expiresIn: number) {
            return {
              data: {
                signedUrl:
                  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
              },
              error: null,
            };
          },
          async remove(_paths: string[]) {
            return { data: null, error: null };
          },
        };
      },
    },
  };

  return client;
}
