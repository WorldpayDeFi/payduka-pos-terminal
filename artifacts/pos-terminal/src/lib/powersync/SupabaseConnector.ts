import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from "@powersync/web";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL ?? "";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "/api";

const isValidUrl = (url: string) => {
  try { return url.startsWith("http://") || url.startsWith("https://"); }
  catch { return false; }
};

export const supabase: SupabaseClient | null =
  isValidUrl(SUPABASE_URL) && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    if (!supabase) throw new Error("Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw new Error(`Supabase auth failed: ${error.message}`);
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (!newSession) throw new Error("Could not establish Supabase session");
      return { endpoint: POWERSYNC_URL, token: newSession.access_token };
    }

    return { endpoint: POWERSYNC_URL, token: session.access_token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const response = await fetch(`${BACKEND_URL}/sync/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: transaction.crud }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed (${response.status}): ${text}`);
      }

      await transaction.complete();
    } catch (err) {
      console.error("[PayDuka] Sync upload error:", err);
    }
  }
}
