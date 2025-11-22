import { getSupabaseServiceClient } from "@/lib/supabase";

export type UserProfile = {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    provider: string | null;
};

export async function getUsersByIds(
    userIds: string[],
): Promise<Map<string, UserProfile>> {
    if (userIds.length === 0) {
        return new Map();
    }

    const supabase = getSupabaseServiceClient();
    const uniqueIds = [...new Set(userIds)];

    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, provider")
        .in("id", uniqueIds);

    if (error) {
        console.error("Failed to fetch profiles:", error);
        return new Map();
    }

    const profileMap = new Map<string, UserProfile>();

    profiles?.forEach((profile) => {
        profileMap.set(profile.id, {
            id: profile.id,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            provider: profile.provider,
        });
    });

    return profileMap;
}
