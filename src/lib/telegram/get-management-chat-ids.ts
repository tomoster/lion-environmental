import type { SupabaseClient } from "@supabase/supabase-js";

export async function getManagementChatIds(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("workers")
    .select("telegram_chat_id")
    .eq("role", "management")
    .not("telegram_chat_id", "is", null);
  return (data ?? []).map((w) => w.telegram_chat_id!);
}

export async function getOfficeChatIds(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("workers")
    .select("telegram_chat_id")
    .eq("role", "office")
    .not("telegram_chat_id", "is", null);
  return (data ?? []).map((w) => w.telegram_chat_id!);
}
