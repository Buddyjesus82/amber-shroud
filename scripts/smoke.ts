import {
  applyEffect,
  bodyOf,
  interpret,
  newGame,
  sceneOf,
  travelTo,
  visibleChoices,
} from './src/game/engine.ts'

function pick(s: ReturnType<typeof newGame>, id: string) {
  const c = visibleChoices(s).find((x) => x.id === id)
  if (!c) {
    throw new Error(
      `missing choice ${id} at ${s.sceneId} have ${visibleChoices(s)
        .map((x) => x.id)
        .join(',')}`,
    )
  }
  return applyEffect(s, c.effects)
}

let s = newGame('prisoner')
console.log('start', s.sceneId, 'sap', s.sap, 'items', s.items)
s = pick(s, 'crawl')
console.log('hub', s.hubId, s.sceneId, 'sap', s.sap)
s = travelTo(s, 'camp:lean')
console.log('lean', s.sceneId, 'sap', s.sap)
s = interpret(s, 'ask about kallik cache red maw')
console.log('intent', s.sceneId, s.flash?.slice(0, 80))
s = pick(s, 'yes')
console.log('hungerKnown', s.flags.hungerKnown, 'mark', s.items.kallik_mark)
s = applyEffect(s, { startChapter: 'cache-run', goto: 'ch1:leave', ticks: 1 })
console.log('ch1', s.chapterId, s.sceneId)
s = pick(s, 'go')
s = pick(s, 'stilts')
console.log('ossa', s.sceneId)
s = pick(s, 'hail')
s = pick(s, 'together')
console.log('ally', s.flags.ossaAlly, s.sceneId)
s = pick(s, 'news')
console.log('pursuit', s.sceneId)
s = pick(s, 'talk')
s = pick(s, 'bargain')
s = pick(s, 'on')
console.log('land', s.sceneId, s.flags.chapter1Done, s.flags.climax)
s = pick(s, 'hub')
console.log('redmaw', s.hubId, s.sceneId, {
  hunt: s.flags.sybellaHunting,
  bargain: s.flags.sybellaBargain,
  ossa: s.flags.ossaAlly,
})
s = travelTo(s, 'maw:stilt')
console.log('stilt', s.sceneId, sceneOf(s).kind, 'sap', s.sap)
if (sceneOf(s).kind === 'crisis') {
  s = pick(s, 'up')
  s = travelTo(s, 'maw:stilt')
}
s = pick(s, 'talk')
console.log('ossa hub', s.sceneId, bodyOf(s).slice(0, 80))
s = applyEffect(s, { goto: 'ch2:stub' })
console.log('ch2', sceneOf(s).title, sceneOf(s).kind)

s = newGame('outcast')
s = pick(s, 'stand')
console.log('outcast sap', s.sap)
s = travelTo(s, 'spine:well')
console.log('t1', s.sceneId, s.sap, sceneOf(s).kind)
s = travelTo(s, 'spine:ridge')
console.log('t2', s.sceneId, s.sap, sceneOf(s).kind)
s = travelTo(s, 'spine:hound')
console.log('t3', s.sceneId, s.sap, sceneOf(s).kind)

s = newGame('vessel')
s = pick(s, 'keep')
console.log('vessel hub', s.hubId, s.sap, s.items.strider_bit)
console.log('OK')
