
export interface NormalizedWatchEntry {
  id: string | number; // themeId for local, mediaId for AniList
  title: string;
  animeTitle?: string;
  episodeCount?: number;
  lastWatchedAt: Date;
  source: 'AniList' | 'Local';
  image: string;
  type?: string; // OP, ED, etc. (for local)
  slug?: string; // (for local)
}

export function normalizeAniListEntry(entry: any): NormalizedWatchEntry {
  const media = entry.media || entry;
  return {
    id: media.id,
    title: media.title.english || media.title.romaji,
    episodeCount: media.episodes,
    lastWatchedAt: new Date(entry.updatedAt * 1000 || Date.now()), // AniList uses seconds
    source: 'AniList',
    image: media.coverImage.large,
  };
}

export function normalizeLocalEntry(entry: any): NormalizedWatchEntry {
  const theme = entry.themeId;
  return {
    id: theme._id,
    title: theme.songTitle,
    animeTitle: theme.animeTitle,
    lastWatchedAt: new Date(entry.viewedAt),
    source: 'Local',
    image: theme.animeCoverImageSmall || theme.animeCoverImage,
    type: theme.type,
    slug: theme.slug,
  };
}

export function mergeWatchHistory(
  localEntries: NormalizedWatchEntry[],
  remoteEntries: NormalizedWatchEntry[]
): NormalizedWatchEntry[] {
  const mergedMap = new Map<string | number, NormalizedWatchEntry>();

  // Add remote entries first
  remoteEntries.forEach(entry => {
    mergedMap.set(entry.id, entry);
  });

  // Add local entries, taking precedence on conflict
  // We use animeTitle or title to match if ids are different (AniList ID vs MongoDB ID)
  // However, local entries have anilistId in their themeId.
  // Let's refine the merge logic to use anilistId if available.
  
  // Re-evaluating: local entries are themes, AniList entries are media (anime).
  // A user might have watched multiple themes for the same anime.
  // The requirement says "merge and deduplicate entries".
  // If they are different types of data (Anime vs Theme), maybe we should group them?
  // But the prompt says "common schema (title, id, episode count, last watched date, source)".
  // This suggests we should treat them as similar items.
  
  // If a local entry (theme) belongs to an anime that is also in the AniList list,
  // we should probably keep the local entry's detail but maybe mark it?
  // "local entries taking precedence on conflict"
  
  // Let's use title + animeTitle as a key for deduplication if IDs don't match.
  
  localEntries.forEach(local => {
    // Try to find a matching remote entry by anilistId or title
    let matchKey: string | number = local.id;
    
    // In a real scenario, we'd check if local.anilistId === remote.id
    // For now, let's use a combination of title and animeTitle for a safer merge if IDs differ
    const localKey = `${local.animeTitle || ''}-${local.title}`.toLowerCase();
    
    // Check if any remote entry matches this local entry
    const remoteMatch = remoteEntries.find(remote => {
      const remoteKey = remote.title.toLowerCase();
      return remoteKey === local.title.toLowerCase() || (local.animeTitle && remoteKey === local.animeTitle.toLowerCase());
    });

    if (remoteMatch) {
      mergedMap.delete(remoteMatch.id);
    }
    
    mergedMap.set(local.id, local);
  });

  return Array.from(mergedMap.values()).sort(
    (a, b) => b.lastWatchedAt.getTime() - a.lastWatchedAt.getTime()
  );
}
