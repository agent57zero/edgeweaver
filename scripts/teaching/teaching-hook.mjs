// teaching-hook.mjs - A7 teaching-moment hook (IMPLEMENTATION §7.2; checklist 03; gate G4).
// Alan's reaction emoji on a message flags that exchange's episode metadata.teaching_moment=true;
// the night loop's consolidation lifts flagged episodes to candidate lessons automatically. The
// emoji constant is gate G4 (parked: Alan picks 👁 / ⭐ / 🌱) - until then a placeholder is read
// from flags.json so the whole hook is built and testable now.
export const TEACHING_EMOJI_PLACEHOLDER = "🌱";

export function teachingEmoji(flags) {
  return flags?.components?.A7_teaching_hook?.teaching_emoji || TEACHING_EMOJI_PLACEHOLDER;
}

export function isTeachingReaction(emoji, flags) {
  return emoji === teachingEmoji(flags);
}

// flagEpisode(episode, emoji, flags) -> {changed, episode}. Sets metadata.teaching_moment=true
// only when the reaction matches the configured (placeholder) teaching emoji.
export function flagEpisode(episode, emoji, flags) {
  if (!isTeachingReaction(emoji, flags)) return { changed: false, episode };
  episode.metadata = { ...(episode.metadata || {}), teaching_moment: true };
  return { changed: true, episode };
}

// Night-loop consolidation lift: flagged episodes become pending candidate lessons.
export function liftTeachingMoments(episodes) {
  return (episodes || [])
    .filter((e) => e.metadata?.teaching_moment === true)
    .map((e) => ({
      kind: "candidate_lesson",
      from_episode: e.id ?? null,
      source: "teaching_moment",
      summary: (e.content || "").slice(0, 200),
      status: "pending",
    }));
}
