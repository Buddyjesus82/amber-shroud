/**
 * SCAFFOLD: a Silas job for the Outcast door, in the shape of Jaxson's inside job
 * (campJob.ts). Flag names only; nothing reads or sets the job flags yet.
 *
 * What already exists for it to plug into:
 *   - `silasOwed` is set today when Silas gives the mercy Drop (`silasOwedDrop`) or puts
 *     the Red Maw heading on his tab (`silasOwedHeading`). Doing the job is the natural way
 *     to clear that debt.
 *   - `strayNotice` wakes the Spine hunt (content/spineHunter.ts). A job could set or clear it.
 *
 * TODO(designer): what Silas wants done, where on the Spine it happens, what it pays
 * (a gated second exit like Jaxson's hotwired Strider?), and what refusing costs.
 */
export const SILAS_JOB_LIVE = false

export const SILAS_JOB_FLAGS = {
  offered: 'silasJobOffered',
  taken: 'silasJobTaken',
  done: 'silasJobDone',
  refused: 'silasJobRefused',
  /** Live today. Any Silas debt. */
  owed: 'silasOwed',
  /** Live today. Debt from the mercy Drop. */
  owedDrop: 'silasOwedDrop',
  /** Live today. Debt from the heading on his tab. */
  owedHeading: 'silasOwedHeading',
} as const
