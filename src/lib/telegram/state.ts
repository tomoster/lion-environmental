import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationState {
  state_type: string;
  payload: Record<string, unknown>;
}

export async function getState(
  supabase: SupabaseClient,
  chatId: string
): Promise<ConversationState | null> {
  const { data } = await supabase
    .from("telegram_state")
    .select("state_type, payload")
    .eq("chat_id", chatId)
    .single();

  if (!data) return null;
  return {
    state_type: data.state_type,
    payload: (data.payload as Record<string, unknown>) ?? {},
  };
}

export async function setState(
  supabase: SupabaseClient,
  chatId: string,
  stateType: string,
  payload: Record<string, unknown> = {}
) {
  await supabase.from("telegram_state").upsert(
    {
      chat_id: chatId,
      state_type: stateType,
      payload,
      created_at: new Date().toISOString(),
    },
    { onConflict: "chat_id" }
  );
}

export async function clearState(supabase: SupabaseClient, chatId: string) {
  await supabase.from("telegram_state").delete().eq("chat_id", chatId);
}
