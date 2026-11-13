/** After Kallik, "Ask if there is anything new" walks this list and then starts over. */
export const KAELEN_ASKS = [
  '"Keep your voice down. The Seeker patrols run these wire-runs twice an hour, and they don\'t like scavengers trading in the open."',
  '"Found these salvage strips off an old Cartel haul. Clean metal, no static. Take \'em or leave \'em, I ain\'t holding stock till dusk."',
  '"You look half-drained, traveler. Outcast roads take the water right out of you. Drink a Drop if you\'ve got one before you look at my shelves."',
  '"The fringe is tightening up. Word is the Seeker patrols are moving crates down toward the Citadel. Means more guards, less margin."',
  '"I don\'t ask where you got your scrap, and you don\'t ask where I got mine. That\'s the only rule that keeps us breathing out here."',
  '"You want something that bites, go talk to the Cartel. I only deal in things that keep people upright."',
  '"Look at your hands. Cut to pieces. You need a thicker wrap before you touch iron again."',
  '"The wind\'s shifting from the north. Means a dust-choke by morning. Stock up or get under cover while the gaps are still clear."',
] as const

export function kaelenAsk(flags: { kaelenRumorAt?: boolean | string | number }): { line: string; next: number } {
  const raw = Number(flags.kaelenRumorAt ?? 0)
  const n = KAELEN_ASKS.length
  const i = Number.isFinite(raw) ? ((Math.floor(raw) % n) + n) % n : 0
  return { line: KAELEN_ASKS[i], next: (i + 1) % n }
}
