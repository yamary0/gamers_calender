import type { User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    throw new Error(error.message);
  }

  return data.user ?? null;
}
