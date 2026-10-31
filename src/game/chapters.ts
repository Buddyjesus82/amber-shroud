/** v186: chapter release switch. A released chapter opens in place when the chapter before it ends.
 *  Unreleased chapters are reached only by the tester code (LEAD-N3X7). Flip one line to release. */
export const RELEASED_CHAPTERS = {
  two: true, // Chapter Two (Into the Maw)
} as const

export function isChapterReleased(n: keyof typeof RELEASED_CHAPTERS): boolean {
  return RELEASED_CHAPTERS[n] as boolean
}
