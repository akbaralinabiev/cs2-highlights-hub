import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export function toClip(row) {
  const videoUrl = row.video_path
    ? supabase.storage.from("highlights").getPublicUrl(row.video_path).data.publicUrl
    : null;

  return {
    id: row.id,
    title: row.title,
    map: row.map,
    tags: row.tags ?? [],
    featured: row.featured,
    is_published: row.is_published,
    videoPath: row.video_path,
    videoUrl,
    createdAt: row.created_at,
    date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
      .format(new Date(row.created_at)),
  };
}
