import { getScene, resolveBody } from './content'
import { FIRST_DROP_GOAL, firstDropPending } from './firstDrop'
import { helpEntries } from './help'
import { SPINE_HUNTERS } from './content/spineHunter'
import { pressureFace } from './hunter'
import { check } from './logic'
import { compassLine, compassMoves, type CompassMove } from './map'
import { personAtScene } from './people'
import type { Effect, GameState, ItemId, Scene } from './types'

export type LookDir = CompassMove['dir']

const HONEST = "Nothing here you haven\'t already seen."

const ROOM_REST = new Set(['around', 'here', 'room', 'area', 'place', 'scene'])

const DIR_WORD: Record<string, LookDir> = {
  north: 'North',
  n: 'North',
  south: 'South',
  s: 'South',
  east: 'East',
  e: 'East',
  west: 'West',
  w: 'West',
}

/** One clause about what a road actually opens onto. Not the scene\'s own prose. */
const WAY: Record<string, string> = {
  'camp:guard': 'steam, batons, and the west bolt',
  'camp:vents': 'screaming pipes, not the station bolt',
  'camp:bay': 'three skiffs, Pike in the north bay, Sarn east, Vetch south',
  'camp:yard': 'the vats and the scrape-line',
  'camp:cages': 'the pens and Oil-Tooth\'s bunk',
  'camp:lean': 'Oil-Tooth\'s stall',
  'camp:wire': 'the razor line, and Kaelen when he is selling',
  'camp:tower': 'the tower, and Valerius if he is in it',
  'spine:ridge': 'noon rock and no kind shadow',
  'spine:shade': 'Silas\'s tent',
  'spine:well': 'a dry throat of stone',
  'spine:hound': 'Shard-Hound prints in the wash',
  'thresh:court': 'the Court',
  'thresh:cell': 'the false-vessel cell',
  'thresh:sift': 'Kaelen\'s pack, off the hymn',
  'thresh:paddock': 'the Striders',
  'thresh:guard': 'the court guard post',
  'maw:rim': 'the Approach and the ribs',
  'maw:market': 'Zafir\'s stall',
  'maw:stilt': 'stilt shade',
  'maw:smoke': 'skiff smoke on the rim',
  'maw:lip': 'the Hollow Lip',
  'maw:tuner': 'the wreck',
}

function norm(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function has(state: GameState, id: ItemId): boolean {
  return (state.items[id] ?? 0) > 0
}

function on(state: GameState, flag: string): boolean {
  return !!state.flags[flag]
}

function proseOf(state: GameState, scene: Scene): string {
  const person = personAtScene(scene.id)
  const base = person && state.flags[person.metFlag] && person.later[scene.id] ? person.later[scene.id] : scene.body
  return resolveBody(scene, (c) => check(c, state), base)
}

export function classifyLook(
  bare: string,
): { kind: 'room' } | { kind: 'dir'; dir: LookDir } | { kind: 'target'; target: string } | null {
  const t = bare.trim().toLowerCase()
  const expanded = t === 'l' || t.startsWith('l ') ? t.replace(/^l\b/, 'look') : t
  if (
    /^(?:look|look around|look here|search|examine|inspect|examine room|examine here|inspect room|search room|search here|look room)$/.test(
      expanded,
    )
  ) {
    return { kind: 'room' }
  }
  const m = expanded.match(/^(?:look around|look at|look|search|examine|inspect|scan|check)(?:\s+around)?\s+(.+)$/)
  if (!m) return null
  const rest = m[1].replace(/^the\s+/, '').trim()
  if (!rest || ROOM_REST.has(rest)) return { kind: 'room' }
  const dirKey = rest.replace(/^(?:to\s+)?(?:the\s+)?/, '')
  const dir = DIR_WORD[dirKey]
  if (dir && !dirKey.includes(' ')) return { kind: 'dir', dir }
  return { kind: 'target', target: rest }
}

export function directedLookFlash(state: GameState, dir: LookDir): string {
  const moves = compassMoves(state).filter((move) => move.dir === dir)
  if (!moves.length) return `Nothing marked lies ${dir.toLowerCase()}.`
  if (moves.length === 1) {
    const hint = WAY[moves[0].sceneId]
    return hint ? `${dir} is ${moves[0].name}, ${hint}.` : `${dir} is ${moves[0].name}.`
  }
  return `${dir} holds ${moves.map((move) => move.name).join(' and ')}.`
}

export function overlayLook(state: GameState): string {
  const face = pressureFace(state)
  if (face === 'Sybella') return 'Sybella is the one on this ground. Stay, defy, or run. The rock under her can wait.'
  if (face === 'Valerius') return 'Valerius is here himself. Pay, fight, or hide. The handler was the warning.'
  if (face === 'Court Guard') return 'A court guard has you in the hymn. Fight, hide, or answer him.'
  for (const h of Object.values(SPINE_HUNTERS)) if (face === h.face) return h.look
  return 'The Hound-handler has the leash. The hound stays on it. Pay, fight, or hide.'
}

export function pressureLookFlash(state: GameState): string {
  return `${overlayLook(state)}\n${compassLine(state)}`
}

function push(lines: string[], text: string | null | undefined) {
  const t = text?.replace(/\s+/g, ' ').trim()
  if (t) lines.push(t)
}

function fresh(sentence: string, body: string): boolean {
  const s = norm(sentence)
  if (s.length < 12) return true
  return !norm(body).toLowerCase().includes(s.toLowerCase())
}

/** Hooks already in the scene data. Null means that hook is spent or not here. */
function authored(state: GameState, scene: Scene): string[] {
  const id = scene.id
  const lines: string[] = []
  const door = state.door

  if (id === 'camp:bay') {
    if (on(state, 'striderHot')) push(lines, 'The ride is the dunes, heading or not.')
    const bolt = !on(state, 'bayPikeTook') && has(state, 'wrench')
    if (!on(state, 'lashCord') && bolt) {
      push(lines, "A lash cord hangs on a post in Pike's bay, and the wrench will turn a resin bolt out of his skiff's rear leg.")
    } else if (!on(state, 'lashCord')) {
      push(lines, "A lash cord hangs on a post in Pike's bay.")
    } else if (bolt) {
      push(lines, "The wrench will turn a resin bolt out of the rear leg of Pike's skiff.")
    }
    if (!on(state, 'baySarnTook')) push(lines, "Sarn's crate has a pile of scrap twists beside the counted bolts.")
    if (!on(state, 'bayVetchTook')) push(lines, "Vetch has copper wire on a crate in her bay.")
    if (has(state, 'wrench') && !on(state, 'wrenchBayTrade') && lines.length < 4) {
      push(
        lines,
        on(state, 'lashCord')
          ? 'The wrench will still buy scrap from Sarn, or a small Drop from Vetch.'
          : "The wrench will buy Pike's cord, scrap from Sarn, or a small Drop from Vetch.",
      )
    }
    if (!lines.length) push(lines, 'Their pockets are already lighter.')
    return lines.slice(0, 4)
  }

  if (id === 'camp:bay-pike') {
    push(lines, 'Pike answers short if you talk to him.')
    if (!on(state, 'lashCord')) push(lines, 'A lash cord hangs coiled on a post at the left of the bay.')
    if (!on(state, 'bayPikeTook')) {
      if (has(state, 'wrench')) {
        push(lines, 'A resin bolt with a corporate tag sits in the knee joint of a rear leg, on the side Pike is not working. The wrench will turn it out.')
      } else if (!on(state, 'wrenchBayTrade')) {
        push(lines, 'A resin bolt with a corporate tag sits in the knee joint of a rear leg, on the side Pike is not working. It is threaded tight and needs a wrench.')
      }
    }
    if (has(state, 'wrench') && !on(state, 'wrenchBayTrade') && !on(state, 'lashCord')) {
      push(lines, 'Pike will trade the cord for the wrench.')
    }
    if (!lines.length) push(lines, 'Pike keeps scraping. Nothing else in his bay is loose.')
    return lines
  }

  if (id === 'camp:bay-sarn') {
    push(lines, 'Sarn answers in counts if you talk to him.')
    if (!on(state, 'baySarnTook')) push(lines, 'Counted rows of bolts and a small pile of scrap twists sit on his crate.')
    else push(lines, 'The rows of bolts on his crate are counted again. The scrap pile is one twist short.')
    if (has(state, 'wrench') && !on(state, 'wrenchBayTrade')) push(lines, 'Sarn will count you a twist of scrap for the wrench.')
    return lines
  }

  if (id === 'camp:bay-vetch') {
    push(lines, 'Vetch lifts the mask if you talk to her.')
    if (state.flags.wrenchBayTrade !== 'vetch') {
      push(lines, 'A Drop vial sits under her skiff, by a leg.')
      if (has(state, 'wrench') && !on(state, 'wrenchBayTrade')) push(lines, 'Vetch will trade the vial for the wrench.')
    }
    if (!on(state, 'bayVetchTook')) push(lines, 'A coil of copper wire sits on a crate at the right.')
    if (!lines.length) push(lines, 'Vetch keeps welding. Nothing else in her bay is loose.')
    return lines
  }

  if (id === 'camp:cages') {
    if (!on(state, 'shivTaken')) push(lines, 'A bar in your cage is loose enough to work free.')
    if (!on(state, 'jaxsonInside')) push(lines, 'Oil-Tooth will hand you the oversized wrench if you take the inside job.')
    else if (!on(state, 'guardDown')) push(lines, 'The west steam-vent at the guard station is what the wrench is for.')
    else push(lines, 'The station is down. He will be under a hull at the bay.')
    if (on(state, 'jaxsonFavor') && !on(state, 'jaxsonStash')) {
      push(lines, 'Scrap sits under his pallet if you search the stash he owes you.')
    }
    return lines
  }

  if (id === 'camp:yard') {
    if (on(state, 'relicRumor') && !on(state, 'relicTaken') && !on(state, 'relicSeen')) {
      push(lines, "Kaelen\'s hoard is in the third vat\'s shadow. That seam is here.")
    }
    if (!on(state, 'vatDripTaken')) push(lines, 'The cooling vats still have a seam a hand could search.')
    if (!on(state, 'jaxsonInside')) push(lines, "Oil-Tooth\'s inside job is still open at his stall.")
    else if (!on(state, 'guardDown')) push(lines, 'The sabotage is the west steam-vent at the guard station.')
    if (!on(state, 'skim:camp:yard')) push(lines, 'The yard grit will give up a drip if you skim it. The Cartel can trace that.')
    return lines
  }

  if (id === 'camp:vats') {
    push(lines, 'The Drop on the cheap bolt will come off in a hand.')
    if (has(state, 'wrench') && !on(state, 'wrenchVat')) push(lines, 'The wrench seats that bolt with less noise.')
    if (on(state, 'relicRumor') && !on(state, 'relicTaken') && !on(state, 'relicSeen')) {
      push(lines, 'The clerk-mark crate in this shadow is a different job from the Drop.')
    }
    return lines
  }

  if (id === 'camp:vents') {
    push(lines, 'The pipes carry amber and the Cartel rhythm if you listen. No heading in them.')
    if (!on(state, 'skim:camp:vents')) push(lines, 'A drip in the pipe-scream will fill a glass. The Cartel can trace it.')
    if (!on(state, 'jaxsonInside')) push(lines, "The bolt at the guard station is Oil-Tooth's job.")
    else if (!on(state, 'guardDown')) push(lines, 'The west bolt at the guard station is the job throat.')
    else push(lines, 'The station is already coughing into this corridor.')
    return lines
  }

  if (id === 'camp:shiv') {
    push(lines, 'Keep the bar and it is a shiv. Break it and it is scrap.')
    return lines
  }

  if (id === 'camp:lean') {
    if (!on(state, 'jaxsonInside')) push(lines, 'The oversized wrench is the inside job. He hotwires after you crack the station.')
    else if (!on(state, 'guardDown')) push(lines, 'The wrench is already yours. The west steam-vent is the next walk.')
    else if (!on(state, 'striderHot')) push(lines, 'The station is down. He is under a hull at the bay.')
    else push(lines, 'The Strider is live. The dunes will take it, heading or not.')
    return lines
  }

  if (id === 'camp:jaxson') {
    push(lines, 'Ask him how to beat Valerius and he lays out the plan.')
    if (!on(state, 'jaxsonInside')) push(lines, 'Ask him for the wrench. The station comes after. Kaelen is a different counter.')
    else if (!on(state, 'guardDown')) push(lines, 'He has already given you the job. The vent is west of here.')
    else push(lines, 'He will be at the bay if the station is already down.')
    return lines
  }

  if (id === 'camp:jaxson-cache') {
    push(lines, 'Rumors are at the Wire.')
    return lines
  }

  if (id === 'camp:jaxson-drop') {
    if (!on(state, 'jaxsonDropGiven') && on(state, 'striderHot')) push(lines, 'He will flick you a skimmed Drop if you are riding.')
    else push(lines, 'Thirst can wait. The station and the bay will not.')
    return lines
  }

  if (id === 'camp:tower') {
    if (!on(state, 'overseerChip')) push(lines, "A clerk\'s chip hangs where a palm can take it. The count will miss it.")
    else push(lines, 'The chip hook is empty.')
    return lines
  }

  if (id === 'camp:valerius') {
    if (has(state, 'shiv')) push(lines, 'The shiv in your sleeve is a language he speaks.')
    if (has(state, 'scrip')) push(lines, 'Ironwood paper in your hem is the kind of leash he trusts.')
    if (!lines.length) push(lines, 'Step back and you are in the tower shade again.')
    return lines
  }

  if (id === 'camp:wire') {
    if (on(state, 'wireCut')) push(lines, 'The hole you paid for is still in the wire.')
    else push(lines, 'Past the wire the haze goes red if you stare it down.')
    if (on(state, 'relicRumor') || on(state, 'wireCut')) push(lines, 'The fence-hole back to the Pens is paid for.')
    else push(lines, 'The fence-hole back to the Pens opens once you pay Kaelen for a lead or the hole.')
    return lines
  }

  if (id === 'camp:guard') {
    if (!on(state, 'jaxsonInside')) push(lines, 'The west bolt stays shut until you take Oil-Tooth\'s wrench.')
    else if (!on(state, 'guardDown')) push(lines, 'You have the wrench. The west steam-vent is the bolt he named.')
    else push(lines, 'The vent is already open. The bay is where the hotwire happens.')
    if (on(state, 'bleedIntel') && !on(state, 'guardDown')) push(lines, 'Kaelen sold you the hour. The bolt is still yours to crack.')
    return lines
  }

  if (id === 'camp:sabotage') {
    if (on(state, 'guardDown')) push(lines, 'The bolt is already spent. The bay is the other half of the job.')
    else if (on(state, 'ventPatrol')) push(lines, 'A clerk is on the bolt with a baton. Scrap them off it, or leave the joint alone.')
    else push(lines, 'The bolt is empty for a breath. A quiet crack still reaches the Cartel.')
    return lines
  }

  if (id === 'camp:gate') {
    push(lines, 'The handler has the shock-leash out. Walking in is a fight or a collar.')
    return lines
  }

  if (id === 'camp:hunter' || id === 'camp:forced') {
    push(lines, 'The sweep is the ground. Ride, run, or hold. Lingering writes your name.')
    return lines
  }

  if (id === 'camp:kaelen' || id === 'thresh:kaelen' || id === 'roam:kaelen') {
    push(lines, 'Buy, sell, or ask him for a rumor.')
    if (id === 'roam:kaelen' && on(state, 'heardWalkingAmber')) push(lines, 'Ask him about the Walking Amber and he gives it in a whisper.')
    return lines
  }

  if (id === 'camp:kaelen-rumors' || id === 'thresh:kaelen-rumors') {
    push(lines, 'The rumor shelf is headings and side trouble. He names a price with the pack, not with a sermon.')
    return lines
  }

  if (id === 'camp:relic') {
    if (!on(state, 'relicLooked')) push(lines, 'The latch is the part worth a closer look. The teeth on it are a tinker\'s mark.')
    else if (!on(state, 'relicTaken')) push(lines, 'The teeth will seat if you work them. Forcing the crate is a fight.')
    else push(lines, 'The crate is already empty of what you came for.')
    return lines
  }

  if (id === 'spine:ridge') {
    if (has(state, 'silas_tip') && !on(state, 'silasCutUsed')) {
      push(lines, 'Silas\'s tip still leads under a rib the noon does not own.')
    } else {
      push(lines, 'Silas sells minutes down-slope. The ridge itself does not.')
    }
    if (!on(state, 'sawMawHaze')) push(lines, 'Reading the wash shows a red bruise to the east and south.')
    else push(lines, 'The bruise east and south is the Maw road.')
    if (state.sap <= 2) push(lines, 'Your sight is fraying. A drink matters more than another look at the rock.')
    return lines
  }

  if (id === 'spine:tip') {
    if (has(state, 'vial_empty')) push(lines, 'The smear in the crack will fill the empty vial. It is a lie that still wets a tongue.')
    else if (!on(state, 'silasSmear')) push(lines, 'You can lick the smear and leave the glass empty.')
    else push(lines, 'The crack is spent. The bruise east-south is the road that is left.')
    return lines
  }

  if (id === 'spine:shade') {
    push(lines, 'Sitting down is how you pay for the minute. A Drop is a separate price.')
    push(lines, 'Korvan sits where the canvas runs out. Mira sifts sand by the tent pole.')
    return lines
  }

  if (id === 'spine:korvan') {
    if (on(state, 'korvanTook')) push(lines, 'He keeps his back to you.')
    else {
      if (!on(state, 'korvanHunger')) push(lines, 'A Drop or 2 scrap buys his Hunger lead. 1 scrap buys the east wash.')
      push(lines, 'He talks to you. He will not say what the brand is for.')
    }
    return lines
  }

  if (id === 'spine:mira') {
    if (on(state, 'miraTook')) push(lines, 'She keeps her back to you.')
    else push(lines, 'She does not talk. Sit with her and she draws in the sand.')
    return lines
  }

  if (id === 'spine:corvin') {
    if (on(state, 'corvinHelped')) push(lines, 'He waits for you at the dry ford on the road east. On this ridge he pulls you up if you go down.')
    else push(lines, 'A Drop, or sweeping his prints out of the wash, is help he will remember.')
    return lines
  }

  if (id === 'spine:silas') {
    if (!on(state, 'silasMercy') && state.sap <= 3) push(lines, 'Tell him noon will kill you and he may part with one Drop, once, on his tab.')
    push(lines, 'Ask what people bury at Red Maw if you want the hole, not the shade.')
    return lines
  }

  if (id === 'spine:silas-drop') {
    push(lines, 'The Drop is real. The debt that comes with it is also real.')
    return lines
  }

  if (id === 'spine:silas-cache') {
    push(lines, 'The heading costs a Glint, or a debt on his tab that the Strays will hear about.')
    return lines
  }

  if (id === 'spine:well') {
    if (!on(state, 'skim:spine:well')) {
      push(
        lines,
        state.equipped?.weapon
          ? 'Hard resin lines the well-throat. Your weapon will scrape one Drop out of it. Strays will notice a theft.'
          : 'Hard resin lines the well-throat. Scraping a Drop out of it needs a weapon equipped.',
      )
    }
    if (!on(state, 'wellScrap')) push(lines, 'The brickwork still hides a Glint and a twist of scrap.')
    else push(lines, 'The bricks have already given up what was hidden in them.')
    return lines
  }

  if (id === 'spine:hound') {
    push(lines, 'A tooth in the dust is a separate find from the man who follows the prints.')
    return lines
  }

  if (id === 'spine:valerius' || id === 'spine:hunter') {
    push(lines, 'He wants a returned Drop or a direction. Refusing him is still a choice you can make out loud.')
    return lines
  }

  if (id === 'thresh:court') {
    push(lines, 'Thalia will talk if you climb the dais.')
    push(lines, 'Oram is with the animals, off the chant.')
    push(lines, 'A false blessing makes this Court bow, and the Seekers notice.')
    return lines
  }

  if (id === 'thresh:cell') {
    if (!on(state, 'shrineDrop')) push(lines, 'A sacrament Drop sits behind the lattice. Reaching it costs a little strength.')
    else push(lines, 'The lattice is already decided.')
    push(lines, 'Thalia can find you in here with the cloth off. That is the dangerous version of this room.')
    return lines
  }

  if (id === 'thresh:shrine') {
    push(lines, 'Take the Drop and the Seekers will care. Leave it and the paddock is still yours.')
    return lines
  }

  if (id === 'thresh:thalia') {
    push(lines, 'Play the hymn and she treats it as a map. Confess the cloth and the love turns.')
    return lines
  }

  if (id === 'thresh:paddock') {
    push(lines, "Oram counts the animals here. Kaelen's pack is in the cup-shadow.")
    if (!on(state, 'skim:thresh:paddock')) push(lines, 'A Strider trough will give up a drip once. The Seekers can trace it.')
    return lines
  }

  if (id === 'thresh:oram') {
    if (!has(state, 'oram_map')) push(lines, 'He will give you a heading if you ask like a thief, not a cup.')
    else push(lines, 'The animals are what he will still talk about.')
    return lines
  }

  if (id === 'thresh:sift') {
    push(lines, 'The pack against the wall is Kaelen. He buys false routes.')
    return lines
  }

  if (id === 'thresh:guard' || id === 'thresh:guard-talk') {
    if (has(state, 'ceremonial_cloth')) push(lines, 'The cloth still reads as a cup if you show it.')
    if (has(state, 'rusted_dagger')) push(lines, 'The dagger under the thread is kitchen steel. He may notice the shape.')
    if (!lines.length) push(lines, 'The post watches the paddock road. Talk is the way through, or back.')
    return lines
  }

  if (id === 'thresh:hunter') {
    push(lines, 'The cloth has failed. Ride, or the Court finishes the sentence.')
    return lines
  }

  if (id === 'maw:rim') {
    if (!on(state, 'ribOpen')) {
      push(lines, 'One rib carries a gear-mark. Searching the ribs is how you find the sealed way.')
      push(lines, 'Digging at random is how people fail to come back.')
    }
    else push(lines, 'The sealed way is open.')
    if (on(state, 'chapter1Done')) push(lines, 'The cache stays under the lip. The open dark is a separate step from this rock.')
    return lines
  }

  if (id === 'maw:market') {
    push(lines, "Zafir's tray is a real shop. Buy and sell are on the counter.")
    if (!on(state, 'mawGlint')) push(lines, 'Another stall has a coil of wire nobody has claimed.')
    return lines
  }

  if (id === 'maw:zafir') {
    push(lines, 'He will talk news.')
    if (on(state, 'heardWalkingAmber')) push(lines, 'Ask him about the Walking Amber and he gives you the street version.')
    return lines
  }

  if (id === 'maw:stilt') {
    push(lines, 'Ossa is in the shade if you speak to her. The stilts are how she keeps the ground.')
    return lines
  }

  if (id === 'maw:ossa' || id === 'maw:ossa-day') {
    push(lines, 'She will take an apology, a knot, or the story of the day. Quiet is also an answer.')
    return lines
  }

  if (id === 'maw:smoke' || id === 'maw:sybella' || id === 'maw:sybella-shadow') {
    push(lines, 'The smoke is her skiff. Face it, or keep the rim between you and the sail.')
    return lines
  }

  if (id === 'maw:lip') {
    if (has(state, 'glints') && !on(state, 'mawBuried')) push(lines, 'A Glint will go into the Lip if you bury it. Seekers who are hunting hesitate after.')
    else if (on(state, 'hollowMarked')) push(lines, 'The buried thing is still down there if you listen.')
    if (!on(state, 'skim:maw:lip')) push(lines, 'The sand here will give up one drip. Nobody from the camps is watching the glass.')
    if (!lines.length) push(lines, HONEST)
    return lines
  }

  if (id === 'maw:ribs') {
    push(lines, 'The gear-mark is cut into the bone. Seat it if you have the shape. Guessing the teeth is the slow way.')
    return lines
  }

  if (id === 'maw:hold') {
    push(lines, 'The way is marked and shut. Back on the ribs is the open ground.')
    return lines
  }

  if (id === 'maw:tuner') {
    if (on(state, 'oilResentful') && !on(state, 'oilMended')) {
      push(lines, 'His cut is still open. Salve closes it. Rest and hauling parts do not.')
    } else {
      push(lines, 'You can bind a cut, rest, or haul parts. None of that opens the cache.')
    }
    return lines
  }

  if (id === 'ch2:stub') {
    push(lines, 'Under the jaw is as far as this road is written. The rim is the way back.')
    return lines
  }

  if (id === 'open:prisoner') {
    push(lines, 'The jaw in the next bunk is the only mouth that knows you are awake. The tower is still only a shadow.')
    return lines
  }

  if (id === 'open:outcast') {
    push(lines, 'The empty vial Silas tossed lies by your hand. The scratch in your palm is his shade-cut, on credit.')
    return lines
  }

  if (id === 'open:vessel') {
    push(lines, 'The dagger under the gold thread is yours. Thalia is already watching the cloth, not the steel.')
    return lines
  }

  if (id === 'ch1:leave') {
    if (door === 'prisoner') push(lines, 'The last fence is a steam pipe under the wire. The open wash has Hound tracks.')
    else if (door === 'outcast') push(lines, 'Noon is the road. Silas is on it before anyone who collects his minutes.')
    else push(lines, 'The hymn-road is the short one. Runners are already walking it.')
    return lines
  }

  if (id === 'ch1:p-pipe') {
    if (has(state, 'wrench')) push(lines, 'The west bolt on the grate will take the wrench. The open wash is the loud way.')
    else push(lines, 'The grate is cheap bolts and steam. Crawl the hot pipe, or run the wash where the clerk is waiting.')
    return lines
  }

  if (id === 'ch1:p-clerk') {
    push(lines, 'His steam-tablet is the whole argument. Papers, a chip, a false name, or a run.')
    if (has(state, 'scrip')) push(lines, 'He can smell Ironwood paper. He wants it to still be a leash.')
    if (has(state, 'overseer_chip')) push(lines, 'The Overseer chip would make you property walking itself home.')
    return lines
  }

  if (id === 'ch1:p-oil') {
    if (has(state, 'wrench')) push(lines, 'The port runner\'s lash will take the wrench, and the wrench stays yours.')
    push(lines, 'He can cut the cuff tag, or drop you with Ossa. He will not tour you to the Maw.')
    return lines
  }

  if (id === 'ch1:p-ossa') {
    push(lines, 'Hail her like a person who escaped, or pass. She does not hide property.')
    if (has(state, 'wrench')) push(lines, 'A lash on her left stilt will take the wrench as a lever. You can pull the steel back.')
    return lines
  }

  if (id === 'ch1:o-noon') {
    push(lines, 'Shade is a person on this road before it is a place. The rib and the noon are the other walks.')
    return lines
  }

  if (id === 'ch1:o-silas') {
    push(lines, 'South of him is the tax.')
    return lines
  }

  if (id === 'ch1:o-tax') {
    push(lines, 'Nim collects the minute Silas only sold. A Glint, a scratch, an empty glass, or a run.')
    return lines
  }

  if (id === 'ch1:o-ossa') {
    push(lines, 'Hail her as kin, or pass. A vial in your kit is a different offer from a theft.')
    return lines
  }

  if (id === 'ch1:v-hymn') {
    if (has(state, 'oram_map')) push(lines, 'Oram\'s map already marks a rib you could walk as if you knew it.')
    if (has(state, 'ceremonial_cloth')) push(lines, 'The gold thread catches noon. Hide it and you look like a thief. Wear it and you look collected.')
    if (!lines.length) push(lines, 'The runners are the net. The map, the cloth, or the hymn are how you meet them.')
    return lines
  }

  if (id === 'ch1:v-runners') {
    push(lines, 'Brin wants a poured Drop, the cloth, or Oram\'s map. Otherwise the net takes you on.')
    return lines
  }

  if (id === 'ch1:v-zafir') {
    push(lines, 'He will not shop a heading to a walking cup. Oram\'s map, if you still have it, skips his price.')
    return lines
  }

  if (id === 'ch1:ossa-rob') {
    push(lines, 'What you took is still on you. Going on spends it. Going back spends the apology.')
    return lines
  }

  if (id === 'ch1:ossa-talk') {
    push(lines, 'Share what you have, go on together, or leave her the quiet.')
    return lines
  }

  if (id === 'ch1:ossa-fix') {
    push(lines, 'The stilt is seated. A Glint, a Drop, or a thanks is what she will still hear.')
    return lines
  }

  if (id === 'ch1:south-wind') {
    push(lines, 'The sail is close enough to face. What you heard on the road is the only brief you carry.')
    return lines
  }

  if (id === 'ch1:sybella') {
    push(lines, 'The skiff is the conversation. A false vessel, a bargain, or the Maw are ways off this sand.')
    return lines
  }

  if (id === 'ch1:hollow') {
    push(lines, 'The buried thing is not silent. Carrying that mark is the step that is left.')
    return lines
  }

  if (id === 'ch1:land') {
    push(lines, 'The ribs and the failed holes are the Approach. The hub behind you is a walk, not a secret.')
    return lines
  }

  if (id.startsWith('crisis:')) {
    push(lines, 'You are empty. The hand at your mouth is the way up. Nothing else on this ground will carry you.')
    return lines
  }

  return lines
}

function choiceHints(state: GameState, scene: Scene, body: string): string[] {
  const out: string[] = []
  for (const choice of scene.choices) {
    if (!check(choice.show, state)) continue
    let sub = (choice.sub ?? '').replace(/\s+/g, ' ').trim()
    sub = sub.replace(/Costs sap\.?\s*/gi, '').replace(/Costs less sap\.?\s*/gi, '').trim()
    if (sub.length < 24 || sub.length > 180) continue
    if (/chapter|button|type it|on screen|gear:/i.test(sub)) continue
    if (!/[.!?]$/.test(sub)) sub = `${sub.replace(/[,:;]+$/, '')}.`
    sub = sub.charAt(0).toUpperCase() + sub.slice(1)
    if (!fresh(sub, body)) continue
    out.push(sub)
    if (out.length >= 2) break
  }
  return out
}

function helpHints(state: GameState, labels: string[], have: string, body: string): string[] {
  const out: string[] = []
  for (const entry of helpEntries(state, labels)) {
    if (entry.group !== 'Look' && entry.group !== 'Take') continue
    const why = entry.why.replace(/\s+/g, ' ').trim()
    if (!why) continue
    const sentence = `${why.charAt(0).toUpperCase()}${why.slice(1).replace(/[.]+$/, '')}.`
    if (!fresh(sentence, body)) continue
    const words = why
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4)
    const hay = have.toLowerCase()
    const hits = words.filter((word) => hay.includes(word)).length
    if (words.length && hits >= Math.ceil(words.length / 2)) continue
    out.push(sentence)
    if (out.length >= 2) break
  }
  return out
}

export function roomDetail(state: GameState, labels: string[]): string {
  const scene = getScene(state.sceneId, state.door)
  const body = proseOf(state, scene)
  let lines = authored(state, scene).filter((line) => fresh(line, body)).slice(0, 4)
  if (!lines.length) lines = choiceHints(state, scene, body)
  if (lines.length < 2) {
    const more = helpHints(state, labels, lines.join(' '), body)
    lines = lines.concat(more).slice(0, 4)
  }
  if (!lines.length) lines = [HONEST]
  let detail = lines.join(' ')
  const flatBody = norm(body)
  if (flatBody && (norm(detail) === flatBody || norm(detail).includes(flatBody))) detail = HONEST
  return detail
}

export function roomLookFlash(state: GameState, labels: string[]): string {
  const goal = firstDropPending(state) && !state.sceneId.startsWith('open:') ? `${FIRST_DROP_GOAL}\n` : ''
  return `${goal}${roomDetail(state, labels)}\n${compassLine(state)}`
}

export function roomLookEffect(state: GameState, labels: string[]): Effect {
  return {
    flag: state.sceneId.startsWith('camp:bay') ? { bayLooked: true } : undefined,
    flash: roomLookFlash(state, labels),
  }
}
