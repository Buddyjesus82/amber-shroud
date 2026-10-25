/** v163: the nine side-trouble spot scenes (data in ../rumorJobs.ts). No kit or catalog import here: see that file. */
import type { Scene } from '../types'
import { RUMOR_JOBS, spotChoices } from '../rumorJobs'

const HUB_OF: Record<string, string> = { prisoner: 'camp04', outcast: 'spine', vessel: 'threshold' }

export const rumorSpotScenes: Scene[] = RUMOR_JOBS.map((j) => ({
  id: j.spotScene,
  hubId: HUB_OF[j.door],
  kind: 'story',
  title: j.spot,
  body: j.body,
  choices: spotChoices(j),
}))
