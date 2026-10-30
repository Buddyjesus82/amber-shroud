/**
 * In-character voices for typed lines that no button or intent caught.
 * Every named person has fallback lines in their own voice, plus typed-only answers for
 * "who are you", "what are you doing", "what's that", and "where is <name>".
 * Lines stay inside existing lore. Hints point at real actions on screen.
 */
import type { GameState } from './types'

export type Voice = {
  /** What they say when they did not follow, or will not play along. Several, rotated. */
  lines: string[]
  /** "Can I have / give me / I want …" with nothing they hand out free. */
  want: string
  /** "How much …" when they keep no shelf. */
  price: string
  who: string
  doing: string
  /** "What's that?" — the thing in their hands. */
  what: string
  /** Theft or violence asked politely. They do not play along. */
  refuse: string
  /** Asked where someone they do not know is. */
  unknown: string
  /** Optional item asks, keyed by item word. */
  items?: Record<string, string>
  /** Optional: where a known person is, in this voice. */
  knows?: Record<string, string>
}

export const VOICES: Record<string, Voice> = {
  sarn: {
    lines: [
      'Sarn keeps counting. "Seventeen. Eighteen. You made me lose nineteen."',
      'Sarn does not look up from the bolts. "I keep a number. Talk does not go in it."',
      '"Oil-Tooth keeps a stall. I keep a count. Ask the stall."',
    ],
    want: 'Sarn keeps counting. "Nothing\'s free in the Bay. Bring me something worth a bolt."',
    price: '"A bolt\'s worth. A wrench is worth a twist of scrap. That is the whole price list."',
    who: '"Sarn. Rigger, east cradle. I count bolts so the Cartel counts me last."',
    doing: '"Counting. Out loud, so the bay hears work. Quiet hands get counted first."',
    what: '"Bolts. Resin bolts, corporate tag. Every one is a number they will ask me for."',
    refuse: 'Sarn\'s count gets louder. "Ask nice for a theft and it is still a theft. The bay hears both."',
    unknown: '"Never heard it. Names cost here. I only keep numbers."',
    items: {
      scrap: 'Sarn taps the crate without missing a count. "Scrap is a bolt\'s cousin. Bring me something worth it. A wrench would do."',
      wrench: '"A wrench? I would count you scrap for one. Quiet trade."',
    },
    knows: { oiltooth: '"Center bay, on his back under the skiff. Cover him if you want to ride."' },
  },
  pike: {
    lines: [
      'Pike keeps scraping the front leg. "Short answers. That was one."',
      '"Cord is on the post. I did not see you. That is the conversation."',
      'Pike\'s scraper does not stop. "Talk to Oil-Tooth. He likes talking."',
    ],
    want: 'Pike does not stop scraping. "I give nothing. The cord on the post is not mine to give, and not mine to watch."',
    price: '"A wrench buys the cord. Nothing else I have is for sale."',
    who: '"Pike. North hull. I scrape. That is the whole file on me."',
    doing: '"Scraping resin off a leg the Cartel wants shiny. Same as yesterday."',
    what: '"The leg. The bolt in the rear knee. Neither is yours."',
    refuse: 'Pike\'s scraper finds the air by your wrist. "Ask like that again and I see you."',
    unknown: '"No idea. I see this leg."',
    items: { cord: '"Cord\'s on the post. Take it and I did not see you. Or hand me a wrench and it is a trade."' },
    knows: { oiltooth: '"Center bay. Under his skiff. Loud."' },
  },
  vetch: {
    lines: [
      'Vetch keeps welding. A spark lands near your boot. That is the answer.',
      'Vetch lifts the mask a finger. "Talk is sparks. Mind your eyes."',
      '"You want cord, Pike. A ride, Oil-Tooth. A fight, a guard. Me, I weld."',
    ],
    want: 'Vetch drops the mask. "The vial under the skiff is for trade. Bring steel."',
    price: '"A wrench for the Drop. That is the only price I have."',
    who: '"Vetch. South skid. I weld what the Cartel cracks."',
    doing: '"Welding a cracked skid. Stand there long enough and I weld you too."',
    what: '"A skid. A torch. A vial you are not taking."',
    refuse: 'The torch hisses a hand from your fingers. "No."',
    unknown: '"Do not know them. Do not care."',
    items: {
      drop: 'Vetch puts her boot beside the vial. "That Drop is for trade. A wrench buys it."',
      wire: '"The copper on the crate? Mine. The torch says so."',
    },
    knows: { oiltooth: '"Center bay. He hotwires, you watch. That is his plan, not mine."' },
  },
  jaxson: {
    lines: [
      'Jaxson grins around the brass. "Words are cheap, kid. Brass costs."',
      '"Cover me and talk less. The bay has ears and most of them have tags."',
      'The brass jaw clicks. "Say it plain or say it later."',
    ],
    want: '"I got a skiff and a plan. Everything else, you scrounge. Pike, Sarn, Vetch: ask the bay."',
    price: '"Price is you watching my back. Same as always."',
    who: '"Jaxson Vance. They call me Oil-Tooth. The jaw is a story for a cooler day."',
    doing: '"Hotwiring a skiff the Cartel thinks is theirs. You are the lookout."',
    what: '"Brass, grease, and a wrench I am not showing the guards."',
    refuse: '"Steal loud and you ride alone. Do it quiet or do not do it."',
    unknown: '"Never heard of them. Hope they are not a guard."',
  },
  valerius: {
    lines: [
      'Valerius lets the baton hiss. "You are speaking. Labor does not speak."',
      '"Useful or broken. Your sentence did not say which."',
      'He does not answer. He writes something down.',
    ],
    want: '"You want. The penniless laborer wants. How optimistic."',
    price: '"Everything has a price. Yours is on my ledger."',
    who: '"Overseer. Your overseer. That is enough name for you."',
    doing: '"Counting thieves. You are on the page."',
    what: 'The baton hisses. "Discipline. Steam-fed."',
    refuse: '"Try it. I would enjoy the paperwork."',
    unknown: '"If I do not know a name, it is already dead or not worth a Hound."',
  },
  handler: {
    lines: [
      'The leash ticks. The hound\'s eyes stay open.',
      '"He likes a diagram. I like a throat. Pick a button."',
      'The handler says nothing. The hound says less.',
    ],
    want: '"You want something. Pay, or the hound wants something too."',
    price: '"Scrap buys a minute. A Glint buys more. Scrip buys owned."',
    who: '"The man with the leash. That is all you need."',
    doing: '"Walking the hound. You are the walk."',
    what: '"A Shard-Hound. Cartel-bred. It likes you. That is bad news."',
    refuse: 'The hound leans on the leash. "Ask nicer. It will not help."',
    unknown: '"Ask the Overseer. I only know smells."',
  },
  rell: {
    lines: [
      'Clerk Rell taps the steam-tablet. "That is not a field I have."',
      '"Scrip is a lullaby. A chip is a door. That was neither."',
      'Rell sighs at the heat. "Say a number or say nothing."',
    ],
    want: '"I hand out filings. Scrip or a chip makes this go away."',
    price: '"Scrip settles it. A chip opens it. Bolting is free, for now."',
    who: '"Clerk Rell. Payroll. You are a number that stood up."',
    doing: '"Hunting a number. It is you."',
    what: '"A tablet. Your name is in it."',
    refuse: '"I write that down too."',
    unknown: '"Not in my ledger."',
  },
  kaelen: {
    lines: [
      'Kaelen jitters, gloves busy in the pack. "Buy, sell, or rumors. Pick a shelf."',
      '"Talk is a rumor. Rumors are a shelf. Pay on the line."',
      'He counts vials with both gloves. "I am listening. My hands are not."',
    ],
    want: '"Nothing free. A Drop, salve, a blade. All on the shelf."',
    price: '"Prices are on the shelf. Open Buy and read them. I do not haggle in the wind."',
    who: '"Kaelen. Sifter. I sell to the Seekers and I sell to you. Both of you pay."',
    doing: '"Sifting. Sand in, essence out, profit out."',
    what: '"Vials, gears, amber jars. Do not touch the jars."',
    refuse: 'Both gloves close over the pack. "Polite theft is still theft. I travel with friends."',
    unknown: '"Never sold to them. Never bought from them."',
    items: {
      salve: '"Resin salve? On the shelf. Binds a cut. Health, not sap."',
      drop: '"Drops on the shelf. Pay on the line."',
    },
  },
  silas: {
    lines: [
      'Silas\'s milk eye does not move. The other one counts you. "Talk is not free."',
      '"Shade is by the minute. That minute was mostly you."',
      'He chews resin and waits for a better sentence.',
    ],
    want: '"Shade by the minute. Drops for people who pay. Nothing for people who ask."',
    price: '"A Glint or two scrap for a Drop. Shade costs a minute. Advice costs more."',
    who: '"Silas Vane. I sell shade. You are standing in it."',
    doing: '"Counting minutes. Yours."',
    what: '"Resin-chew. Wet wool that was never wet. A well that disappointed everyone."',
    refuse: '"Ask nice to rob me and I charge you for the asking."',
    unknown: '"Never sold them shade."',
    items: { drop: '"Drops are a fairy tale I still keep in stock. For people who pay."' },
    knows: { kaelen: '"The Sifter walks the roads. Linger somewhere and his pack stops."' },
  },
  corvin: {
    lines: [
      'Corvin keeps his steady hands on the wire coil, where you can see them. "I know traps. Not much else."',
      '"Keep your voice down. The wash carries."',
      'He looks at the ridge, not at you. "Ask me about the ford."',
    ],
    want: '"I have nothing to give. Water, or my prints gone from the wash, and I walk you past the traps."',
    price: '"I sell nothing. I know where the traps are."',
    who: '"Corvin. I guarded harvesters once. I put the rifle down."',
    doing: '"Hiding. Watching for Hounds. Both are the same job."',
    what: '"Wire for the ford. Nothing else now."',
    refuse: 'He keeps his hands on the wire. "I am not picking anything up for you."',
    unknown: '"Never met them. Good for them."',
  },
  korvan: {
    lines: [
      'Korvan leans in, his one open eye on you. "Say it again. Slower."',
      '"I kept records. That one I would not file."',
      'The amber over his eye catches the light. He waits.',
    ],
    want: '"A heading costs a scrap. My water costs nothing, and you will not take it."',
    price: '"A scrap for a heading. Cheap, because it is true."',
    who: '"Korvan Drell. I kept the Seekers\' records until I read the wrong one."',
    doing: '"Breathing. It takes longer than it used to."',
    what: '"Amber. The Cartel calls it a seal. I call it a correction."',
    refuse: '"You would rob a man with half his face sealed? Ask the brand on your hand how that ends."',
    unknown: '"Not in any record I kept."',
  },
  mira: {
    lines: [
      'Mira Thorn does not speak. She looks at the sand, then at you.',
      'She tilts her head. Whatever you asked, the answer is no.',
      'Mira taps the amber sand with her one hand and waits.',
    ],
    want: 'Mira shakes her head once. She guards people looking for the truth. Not people looking for free things.',
    price: 'She does not sell. She points at the ruins.',
    who: 'She does not say her name. She does not need to. Mira Thorn.',
    doing: 'She is reading the sand. You are standing on the page.',
    what: 'She lifts a pinch of amber sand and lets it fall. Memory.',
    refuse: 'Her hand drops to the knife. That is all the answer there is.',
    unknown: 'She shrugs.',
  },
  jodi: {
    lines: [
      'Jodi says to the snake, "This one\'s talking again, Grudge." Grudge does not care.',
      'She grins with black lips. "Pastor didn\'t catch that. Neither did I."',
      '"Say it to the spiders. They\'re better listeners."',
    ],
    want: 'Jodi says to the vultures, "This one wants something free." She laughs. "Trade, love. The dead pay me. You can too."',
    price: '"Depends what you bring. Salve for what the birds like."',
    who: '"Jodi Hollowmere. These are my kids. Don\'t touch the kids."',
    doing: '"Waiting on the birds. They bring me what the dead had in their pockets."',
    what: '"That? That\'s Grudge. He bites to make a point."',
    refuse: 'Grudge lifts his head. "Ask nicely to steal from me," Jodi says. "Grudge loves manners."',
    unknown: '"The birds never mentioned them."',
    items: {
      salve: 'Jodi says to the rats, "Hear that? They want the salve." She grins. "Not free, love. A Glint or two scrap, and the girls check the seal."',
    },
  },
  thalia: {
    lines: [
      'Thalia\'s gold tracks catch the light. "Say it as a hymn and I will hear it."',
      '"You speak. The Vessel speaks. How holy."',
      'She almost touches your sleeve, and does not.',
    ],
    want: '"You want? A Vessel does not want. A Vessel is poured."',
    price: '"Nothing holy has a price. Only a cost."',
    who: '"Thalia. High Seeker. I am the one who loves you."',
    doing: '"Waiting for you to be poured."',
    what: '"Gold. It goes where tears go."',
    refuse: '"A Vessel does not take. Unless the cloth is a costume."',
    unknown: '"That name is not in the hymn."',
  },
  oram: {
    lines: [
      'Oram writes a feed-weight in the ledger. "Animals do not talk like that either."',
      '"I prefer Striders. They answer plainly."',
      'He does not look up. "Ask about the paddock, or let me work."',
    ],
    want: '"I have feed and a ledger. Neither is free. The heading I tore out was a favor."',
    price: '"Feed is counted. Heresy is free."',
    who: '"Oram. I keep the Striders. I keep a ledger I do not report."',
    doing: '"Weighing feed. Writing what I should not."',
    what: '"A ledger. Half feed-weights, half things the Seekers would burn."',
    refuse: '"Steal from the paddock and the Striders remember you."',
    unknown: '"Not in the ledger."',
  },
  guard: {
    lines: [
      'The guard\'s falchion does not move. "Hymn or nothing."',
      '"State your business. Holy business."',
      'The guard looks past you, at the court.',
    ],
    want: '"Nothing is given at this door."',
    price: '"No trade here. This is a door."',
    who: '"A guard. That is all a guard needs to be."',
    doing: '"Guarding. You are what I guard against."',
    what: '"A Seeker blade. Blessed. Still sharp."',
    refuse: 'The falchion tips an inch toward you.',
    unknown: '"Ask the court."',
  },
  ossa: {
    lines: [
      'Ossa looks at your kit before your face. "Say it with less wind."',
      '"I\'m alive. That\'s the news. What\'s yours?"',
      'She shifts on the stilts, three feet above hungry sand. "Again."',
    ],
    want: '"I give what I choose. Don\'t steal from me twice."',
    price: '"My vial is honest. It is not for sale."',
    who: '"Ossa. I walk stilts. I fall funny. I do not die easy."',
    doing: '"Staying a living person on purpose."',
    what: '"Stilts. Cord. A vial, half-full, honest."',
    refuse: '"Rob family politely and it is still robbing family."',
    unknown: '"Never heard it on the wind."',
  },
  drennick: {
    lines: [
      'Drennick talks to the air beside your head. "Shade-road is not free. Neither is talking."',
      '"I collect from anyone. Even you."',
      'He cleans resin from his nails with the knife.',
    ],
    want: '"I collect. I do not give. Glint, scratch, empty glass, or noon."',
    price: '"A Glint. Silas\'s scratch. Empty glass. Or owe me."',
    who: '"Drennick Voss. I run the line between the Strays and the Cartel."',
    doing: '"Collecting."',
    what: '"A knife that has only ever been for minutes."',
    refuse: '"Polite does not change the fee."',
    unknown: '"Not on my line."',
  },
  brin: {
    lines: [
      'Brin speaks. Kesh flanks. "Sing it, or say nothing."',
      '"A pour, a cloth, or a confession. Pick one."',
      'The spears shift, gently.',
    ],
    want: '"We do not give. We receive. A pour."',
    price: '"A pour. Nothing else."',
    who: '"Brin. This is Kesh. We sing for the Seekers."',
    doing: '"Following the shape Thalia\'s love made loud."',
    what: '"Spears. They think they are a kindness."',
    refuse: '"Steal, and we sing your shape to the blonde."',
    unknown: '"Not in our hymn."',
  },
  zafir: {
    lines: [
      'Varro smiles in a way that costs extra. "That sentence was free. The next one isn\'t."',
      '"Headings, news, a small shop. Pick one and pay."',
      'He weighs a Glint on his palm and waits.',
    ],
    want: '"Free? I sold the same heading twice. Nothing in this stall is free."',
    price: '"Highway prices. Open the shelf and weep."',
    who: '"Varro. They call me the Bonewright. Bone-cairn merchant. I sell what you need at prices you hate."',
    doing: '"Waiting for you to pay."',
    what: '"Stock. Headings. News Sybella already has."',
    refuse: '"Rob a merchant at the bite? Polite, even. Charming. No."',
    unknown: '"Not a customer of mine."',
  },
  sybella: {
    lines: [
      'Sybella pushes the blindfold up. "Danger first. Words later."',
      '"You talk like someone the sand will keep."',
      'The skiff hums. She does not answer.',
    ],
    want: '"I give roads buried in amber. You want one?"',
    price: '"Your road costs everything. Pay on the way down."',
    who: '"Sybella. I taught Thalia. I regret it."',
    doing: '"Guarding what is sealed. From you."',
    what: '"A sand-skiff. It is faster than you."',
    refuse: '"Try."',
    unknown: '"Never mattered to me."',
  },
  kip: {
    lines: [
      'Kip keeps one hand on the knife. "Say it plain. Mara\'s working."',
      'Mara doesn\'t look up from the relay box. "Again. Slower."',
      '"We don\'t trade with people who talk in circles," Kip says.',
    ],
    want: '"Water. And that box talking right."',
    price: '"Fix the box, or share the water. Those are the prices."',
    who: '"Kip. That\'s Mara. We run the ditch."',
    doing: '"Waking the relay. It talks to Miller\'s board."',
    what: '"A dead Cartel relay box. Not dead yet."',
    refuse: '"No."',
    unknown: '"Never heard of it. Ditch is all we know."',
  },
  nim: {
    lines: [
      'Nim breathes through the cracked respirator. "Talk is cheap. Bounties aren\'t."',
      '"Say it to the harpoon."',
      'He says your name again, slowly.',
    ],
    want: '"I want your name in a ledger. You want something too. We are both disappointed."',
    price: '"Your Stray Heat is the price. Cool it, and I stop coming."',
    who: '"Nim. I was something else once. Now I collect."',
    doing: '"Collecting you."',
    what: '"Strider carapace. I killed every piece."',
    refuse: '"Polite. Interesting. Still no."',
    unknown: '"Not on my bounty sheet."',
  },
  vex_p: {
    "lines": [
        "Vex keeps shaking the mesh, eyes on the ground. \"Didn't catch that. Shake while you talk. Still hands get noticed.\"",
        "He flinches at a far-off whine and counts under his breath. \"Drill. Under the barge. Say it again, slower.\"",
        "\"I don't know what that means. I know the shaft. I know where it stops dead.\""
    ],
    "want": "\"The chain off. That's all. The clippers can have the rest.\"",
    "price": "\"Price? I don't remember money. I remember the shaft's dead stops. Break the chain and they're yours.\"",
    "who": "\"Vex. The Hollow, they call me on the line. Before the pens? Ask the vein. It took it.\"",
    "doing": "\"Sifting. Listening. The ground talks louder than Greg.\"",
    "what": "\"The tags? Pen tags. Same as yours, I think. I don't remember getting them.\"",
    "refuse": "Vex shakes his head, fast. \"No. Greg's crew counts the rows. One row short and they shave us all again.\"",
    "unknown": "\"Never heard it. Could've known them. I don't know who I knew.\"",
    "items": {
        "scrap": "\"Two scrap and the chain gives. Murch taught me that. I think.\"",
        "sap": "\"Sap's for the gaps, not for me.\"",
        "key": "He goes very still. \"That hums like the vein does. Hide it before the lamps swing back.\"",
        "spire key": "He goes very still. \"That hums like the vein does. Hide it before the lamps swing back.\""
    },
    "knows": {
        "murch": "\"The Socket? In the bays, under a skiff, pretending to be a bolt. Bring him scrap.\"",
        "greg": "\"Greg's chain. Greg's rows. Greg's clippers. Don't let him count you.\"",
        "valerius": "\"He ran the pens. Now he looks down the shaft like someone's waiting there.\"",
        "miller": "\"The horn. When it blasts twice, lie flat in the grit.\""
    }
},
  murch_p: {
    "lines": [
        "\"What? No. Didn't parse. Keep your voice down. The bays echo, and Greg's got ears in the echo.\"",
        "Murch taps the Adjuster against his thigh and glances at the bay door. \"Say it in bolts and fluid, friend. That's the language down here.\"",
        "\"Too many words, not enough wrench. Ask me about the lift. The lift I can talk about.\""
    ],
    "want": "\"Scrap. Three. The lift motor eats scrap, and then it eats the shaft.\"",
    "price": "\"Price is scrap. Price is fluid. Price is you not yelling.\"",
    "who": "\"Murch. The Socket. These were my bays, till they asked for one weld too many.\"",
    "doing": "\"Hiding in my own bay. Fixing the lift nobody knows I'm fixing.\"",
    "what": "\"The Adjuster. Weighted spanner. Fixes rams, fixes seals, fixes enforcers who look under skiffs.\"",
    "refuse": "Murch's eyes go wide. \"In the bays? With Greg two hulls away? No. Hard no.\"",
    "unknown": "\"Don't know 'em. Don't want to. Names get you chained in the Maw.\"",
    "items": {
        "scrap": "\"Scrap! Yes. Three's what the motor needs.\"",
        "fluid": "\"Fluid? The lift rams are dry as a Seeker's sermon. Find me some and I'll cry on you.\"",
        "hydraulic fluid": "\"Fluid? The lift rams are dry as a Seeker's sermon. Find me some and I'll cry on you.\"",
        "cipher-tap": "\"Ten-millimeter cipher-tap. Lost mine running from Greg. Don't wave your hands like you have one.\""
    },
    "knows": {
        "vex": "\"On the sift line. Chained. Doesn't remember his name, but remembers every stop in the shaft.\"",
        "greg": "Murch's fingers stop tapping. \"He chained you once. He chased me once. Don't give him twice.\"",
        "miller": "\"The horn. The tubes in the bilge carry his voice down. He talks to himself. Don't answer.\"",
        "valerius": "\"Camp-04's man. You'd know. Down the shaft, he's waiting with a baton.\""
    }
},
  vex_v: {
    "lines": [
        "Vex's eyes slide to the cup on your belt. \"Didn't catch that. The cups drip loud. Say it under them.\"",
        "He flinches as a cup fills. \"Another one. That's mine, you know. Say it again, slower.\"",
        "\"I don't know what that means. I know the stair. I know the way in they forgot.\""
    ],
    "want": "\"The tube out. Quietly, if you're still a Vessel. Loud, if you're not.\"",
    "price": "\"Price? I'll show you the stair. That's all I've got that isn't in a cup.\"",
    "who": "\"Vex. The Hollow. They hung a cup on me once. It didn't fill. Now I fill theirs.\"",
    "doing": "\"Bleeding. Counting the drips. Waiting for the lamps to look away.\"",
    "what": "\"The tube? It goes into the vein, then into me, then into the cups. That's the rite.\"",
    "refuse": "Vex shakes his head, fast. \"No. The keepers hear blood through bone. Your cup would crack in your hand.\"",
    "unknown": "\"Never heard it. Could've known them. I don't know who I knew.\"",
    "items": {
        "scrap": "\"Scrap's for the mechanic on the transport. Not me.\"",
        "sap": "\"Keep it. You'll need it when they look at your cup too long.\"",
        "key": "He stares at the rod. \"That hums like the vein does. A real Vessel wouldn't need it.\"",
        "spire key": "He stares at the rod. \"That hums like the vein does. A real Vessel wouldn't need it.\""
    },
    "knows": {
        "murch": "\"The mechanic chained to the transport. Fixing the thing they'd weld him into.\"",
        "valerius": "\"He watches you. He watches the cup more.\"",
        "sybella": "\"Her lamps, her cups, her drills. She doesn't come down. She sends the rite.\"",
        "greg": "\"Back gate. Crates at night. The Seekers pretend not to see.\""
    }
},
  murch_v: {
    "lines": [
        "\"What? No. Didn't parse. Stand like you're inspecting me. They watch everyone who talks to me.\"",
        "Murch keeps working, fingers twitching. \"Say it in bolts and fluid, Vessel. They don't speak bolts.\"",
        "\"Too many words. Ask me about the transport. I know every weld on it.\""
    ],
    "want": "\"Don't let them weld me in. That's it. That's the whole want.\"",
    "price": "\"Price? I've got no scrap and no say. Claim me, and I'll fix anything you ever bring me.\"",
    "who": "\"Murch. The Socket. Strays' tinker. The Seekers' mechanic now, by chain.\"",
    "doing": "\"Fixing the transport. If it runs, I don't ride in it.\"",
    "what": "\"The Adjuster? They let me keep it. They need the work more than they fear the spanner.\"",
    "refuse": "Murch's eyes go wide. \"With a Seeker at my back? You want us both in the amber? No.\"",
    "unknown": "\"Don't know 'em. In here, I don't know anyone. Safer.\"",
    "items": {
        "scrap": "\"Scrap? Hide it. They count my scrap.\"",
        "fluid": "\"Fluid. Don't. If they see I've got fluid, they'll think I'm fixing a way out.\"",
        "hydraulic fluid": "\"Fluid. Don't. If they see I've got fluid, they'll think I'm fixing a way out.\"",
        "cipher-tap": "\"A cipher-tap, here? Put it away before they think I asked for it.\""
    },
    "knows": {
        "vex": "\"In the bleeding room. They fill cups from him. I hear it through the wall.\"",
        "greg": "\"His crates come through the back gate. He'd sell me back to the Cartel for a smile.\"",
        "miller": "\"The horn takes the tithe. The Seekers pay it and hate it.\"",
        "valerius": "\"Outpost's his. He signs who gets welded. Don't let him see you looking at me.\""
    }
},
  vex_o: {
    "lines": [
        "Vex presses his face to the bone bars. \"Didn't catch that. The Hunters come back at dusk. Talk faster.\"",
        "He flinches at a far-off whine. \"Drill. Or a hound. Say it again, slower.\"",
        "\"I don't know what that means. I know the true gap between the bones. That I know.\""
    ],
    "want": "\"The cord cut. Before they sell me down to the lamps.\"",
    "price": "\"Price? I'll walk you the true gap. No Knot needed, if you've got me.\"",
    "who": "\"Vex. The Hollow. A Stray, maybe, once. My brand burned off. Or I don't remember it.\"",
    "doing": "\"Waiting to be sold. Watching the lamps below.\"",
    "what": "\"The cage? Stray Hunter work. Bone and cord. They sell what they catch.\"",
    "refuse": "Vex shakes his head, fast. \"No. The Hunters left the cord tied on purpose. They're watching it.\"",
    "unknown": "\"Never heard it. Could've known them. I don't know who I knew.\"",
    "items": {
        "scrap": "\"Scrap's for the tinker in the camp. He takes it off the stone when no one looks.\"",
        "sap": "\"Save it for the stilts. The water there pulls.\"",
        "key": "He stares at the rod. \"That hums like the vein does. The Hunters would sell you for it.\"",
        "spire key": "He stares at the rod. \"That hums like the vein does. The Hunters would sell you for it.\""
    },
    "knows": {
        "murch": "\"The tinker in the Stray camp. He won't look at you. That's how he helps.\"",
        "valerius": "\"Down there with the lamps. He wants the Stray who cost him Camp-04. That's you, I think.\"",
        "greg": "\"He's buying your price from the Hunters. He haggles like it's personal.\"",
        "ossa": "\"Stilt-cord at your brow. Someone still remembers you. Lucky.\""
    }
},
  murch_o: {
    "lines": [
        "Murch talks to the skiff he's fixing, not to you. \"Didn't parse. Don't face me. Talk to the hull.\"",
        "He taps the Adjuster against the runner. \"Bolts and fluid, friend. Not names. Never names here.\"",
        "\"Too many words. Ask about the lift at the third vertebra. Quietly.\""
    ],
    "want": "\"Scrap on the stone. Two. Then walk away like you never saw me.\"",
    "price": "\"Price is scrap, left where I can find it. Price is you not saying my name in this camp.\"",
    "who": "\"Nobody. A tinker. You never met me. Murch, if you have to say something.\"",
    "doing": "\"Fixing a skiff. Fixing a lift nobody in this camp knows about.\"",
    "what": "\"The Adjuster. Weighted spanner. Don't look at it. Looking makes them look.\"",
    "refuse": "Murch's hands stop. \"Here? In front of them? They'd cast me out with you. No.\"",
    "unknown": "\"Don't know 'em. Not saying if I did.\"",
    "items": {
        "scrap": "\"On the stone. Not in my hand. Two's enough.\"",
        "fluid": "\"Fluid? Leave it with the scrap. I'll find it.\"",
        "hydraulic fluid": "\"Fluid? Leave it with the scrap. I'll find it.\"",
        "cipher-tap": "\"Put that away. Strays don't carry cipher-taps. Outcasts definitely don't.\""
    },
    "knows": {
        "vex": "\"Caged on the ridge. The Hunters are selling him to the lamps. Cut the cord if you can.\"",
        "greg": "Murch's fingers stop tapping. \"He's buying you. He chased me once. He doesn't stop.\"",
        "miller": "\"His horn put a price on you. The Strays heard it. Everyone heard it.\"",
        "valerius": "\"Lamps under the ridge. He wants you more than the Strays do.\""
    }
},
}

/** Scene speakers and faces onto voice keys. */
const SPEAKER_VOICE: Record<string, string> = {
  'kip and mara': 'kip',
  kip: 'kip',
  mara: 'kip',
  'jaxson vance': 'jaxson',
  jaxson: 'jaxson',
  'overseer valerius': 'valerius',
  valerius: 'valerius',
  pike: 'pike',
  sarn: 'sarn',
  vetch: 'vetch',
  'kaelen the sifter': 'kaelen',
  kaelen: 'kaelen',
  'silas vane': 'silas',
  silas: 'silas',
  'corvin pryce': 'corvin',
  'korvan drell': 'korvan',
  'mira thorn': 'mira',
  'jodi hollowmere': 'jodi',
  thalia: 'thalia',
  oram: 'oram',
  guard: 'guard',
  'clerk rell': 'rell',
  ossa: 'ossa',
  'drennick voss': 'drennick',
  brin: 'brin',
  varro: 'zafir',
  bonewright: 'zafir',
  'the bonewright': 'zafir',
  sybella: 'sybella',
  'hound-handler': 'handler',
  nim: 'nim',
  'the collector': 'nim',
  vex: 'vex',
  'vex the hollow': 'vex',
  murch: 'murch',
  'murch the socket': 'murch',
}

/** Person ids (people.ts) onto voice keys. */
export const PERSON_VOICE: Record<string, string> = {
  oiltooth: 'jaxson',
  carapace: 'nim',
}

/** v168: Vex and Murch speak per door. The scene id (ch2:p-, ch2:v-, ch2:o-) or the door picks the set. */
const DOOR_LETTER: Record<string, string> = { prisoner: 'p', vessel: 'v', outcast: 'o' }
function perDoor(key: string, where?: string | null): string {
  if (key !== 'vex' && key !== 'murch') return key
  const m = where ? /^ch2:([pvo])-/.exec(where) : null
  const letter = m ? m[1] : (where && DOOR_LETTER[where]) || 'p'
  return `${key}_${letter}`
}

export function voiceForSpeaker(name: string | null | undefined, where?: string | null): Voice | null {
  const key = voiceKeyForSpeaker(name, where)
  return key ? VOICES[key] ?? null : null
}

export function voiceKeyForSpeaker(name: string | null | undefined, where?: string | null): string | null {
  if (!name) return null
  const key = SPEAKER_VOICE[name.toLowerCase()] ?? SPEAKER_VOICE[name.toLowerCase().split(' ')[0]] ?? null
  return key ? perDoor(key, where) : null
}

/** Rotate lines by the clock and by what was typed, so different commands never all get one line. */
export function pickLine(lines: string[], state: Pick<GameState, 'ticks'>, said = ''): string {
  let h = Math.abs(state.ticks)
  for (const ch of said.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return lines[h % lines.length]
}

/** Full speaker names, longest first, for finding who a scene's prose puts in front of you. */
export const NAMED_SPEAKERS = Object.keys(SPEAKER_VOICE)
  .filter((n) => n.includes(' ') || n.length > 5)
  .sort((a, b) => b.length - a.length)
