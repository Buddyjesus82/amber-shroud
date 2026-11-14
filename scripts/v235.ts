/** v235: an automatic reload (new build, cover fix) drops the player back into their scene, not the title. */
import { readFileSync } from 'node:fs'

let fails = 0
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.log('FAIL', m) } }

ok(readFileSync('src/version.ts', 'utf8').includes("'v235'") && readFileSync('public/sw.js', 'utf8').includes("'amber-shroud-v235'"), 'build v235')
const app = readFileSync('src/App.tsx', 'utf8')
ok(app.includes("IN_PLAY_KEY = 'amber-shroud.inPlay'"), 'in-play marker key')
ok(/sessionStorage\.setItem\(IN_PLAY_KEY, door\)/.test(app), 'marker set while playing')
ok(/const door = readInPlay\(\)[\s\S]*loadDoor\(door\)[\s\S]*setView\('play'\)/.test(app), 'boot resumes the marked door')
ok(/markInPlay\(view === 'play' && state \? state\.door : null\)/.test(app), 'leaving play clears the marker')

if (fails) { console.log(`v235: ${fails} failure(s)`); process.exit(1) }
console.log('v235 ok')
