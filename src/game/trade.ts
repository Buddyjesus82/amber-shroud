import { ITEMS } from './content/catalog'
import type { Choice, Cond, Effect, FlagMap, GameState, ItemId } from './types'

export type ShopShelf = 'buy' | 'sell'
export type Money = { glints?: number; scrap?: number }

export type StockOffer = {
  id: string
  item: ItemId
  label: string
  sub?: string
  cost: Money
  onceFlag?: string
  extraFlag?: FlagMap
  extraRemove?: Partial<Record<ItemId, number>>
  flash: string
  tags: string[]
}

export type Vendor = {
  id: 'kaelen' | 'zafir' | 'silas'
  scenes: readonly string[]
  knownFlag?: string
  stock: StockOffer[]
  changeScrap?: boolean
  buyScrip?: boolean
  openBuyFlash: string
  openSellFlash: string
  sellFlash: string
}

const NEVER_SELL = new Set<ItemId>([
  'vial_empty',
  'glints',
  'scrap',
  'scrip',
  'strider_bit',
  'overseer_chip',
  'ossa_token',
  'kallik_mark',
  'kohl_smear',
  'false_vessel',
  'cache_map',
  'silas_tip',
  'oram_map',
])

const SELL_PAY: Partial<Record<ItemId, Money>> = {
  vial_drop: { scrap: 1 },
  needle_knife: { scrap: 1 },
  dust_cloak: { scrap: 1 },
  hide_wrap: { glints: 1 },
  ironwood_baton: { glints: 2 },
  shiv: { scrap: 1 },
  wrench: { scrap: 2 },
  rusted_dagger: { scrap: 1 },
  ceremonial_cloth: { scrap: 1 },
}

const AUTH_PRODUCT = new Set([
  'drop',
  'drop-glint',
  'drop-scrap',
  'knife',
  'cloak',
  'cloak-glint',
  'cloak-scrap',
  'buy',
  'hide',
  'baton',
  'sell-scrap',
  'sell-scrip',
])

const KAELEN_STOCK: StockOffer[] = [
  {
    id: 'drop',
    item: 'vial_drop',
    label: 'Buy a Drop of Oasis Sap — one scrap',
    sub: 'Merchant. Arithmetic. Not charity.',
    cost: { scrap: 1 },
    extraFlag: { kaelenSoldDrop: true },
    flash: '"Scrap in. Drop out. I don\'t do charity. I do arithmetic." They glove the vial like it might bite them back.',
    tags: ['drop', 'vial', 'sap', 'oasis'],
  },
  {
    id: 'knife',
    item: 'needle_knife',
    label: 'Buy a Needle Knife — two scrap',
    sub: 'Weapon · Bite 3. Equip it in Gear. No dice — numbers compare gear.',
    cost: { scrap: 2 },
    onceFlag: 'kaelenSoldKnife',
    extraFlag: { kaelenSoldKnife: true },
    flash: '"Thin. Mean. Cost." They do not gift edges. Equip it or it is only inventory.',
    tags: ['knife', 'needle', 'blade'],
  },
  {
    id: 'cloak',
    item: 'dust_cloak',
    label: 'Buy a Dust Cloak',
    sub: 'Armor · Hide 3. Hides a silhouette. Does not hide Heat. Pay with a Glint or with scrap.',
    cost: { glints: 1, scrap: 2 },
    onceFlag: 'kaelenSoldCloak',
    extraFlag: { kaelenSoldCloak: true },
    flash: '"Canvas that outlived three owners. Wear it. I already counted."',
    tags: ['cloak', 'dust', 'canvas'],
  },
]

const VENDORS: Vendor[] = [
  {
    id: 'kaelen',
    scenes: ['camp:kaelen', 'spine:kaelen', 'thresh:kaelen'],
    knownFlag: 'kaelenKnown',
    stock: KAELEN_STOCK,
    changeScrap: true,
    openBuyFlash: 'They tap the pack. "Buy is a shelf. Drops. A knife. A cloak if I still have one. Pay on the line."',
    openSellFlash: '"Unequipped only. I do not buy what is on your body. I do not buy keys. I pay less than I charge. That is the job."',
    sellFlash: '"Cost in. Profit out. I buy cheaper than I sell."',
  },
  {
    id: 'zafir',
    scenes: ['maw:zafir', 'maw:market'],
    knownFlag: 'zafirMet',
    stock: [
      {
        id: 'buy',
        item: 'vial_drop',
        label: 'Buy a Drop at Approach prices',
        sub: 'Two Glints. Highway robbery. Repeatable.',
        cost: { glints: 2 },
        flash: 'Highway robbery. You pay it. The stall is still open. Living costs more here.',
        tags: ['drop', 'vial', 'sap', 'oasis'],
      },
      {
        id: 'hide',
        item: 'hide_wrap',
        label: 'Buy Hound Hide — three Glints',
        sub: 'Armor · Hide 4. Maw specialty. Equip it in Gear.',
        cost: { glints: 3 },
        onceFlag: 'zafirSoldHide',
        extraFlag: { zafirSoldHide: true },
        flash: '"Resin-jawed scrap from a Hound that lost. Wear it. The next glance slides. Heat does not."',
        tags: ['hide', 'hound', 'pelt', 'armor'],
      },
      {
        id: 'baton',
        item: 'ironwood_baton',
        label: 'Buy a Shock Baton — four Glints',
        sub: 'Weapon · Bite 4. Pawned Ironwood. Equip it in Gear.',
        cost: { glints: 4 },
        onceFlag: 'zafirSoldBaton',
        extraFlag: { zafirSoldBaton: true },
        flash: '"Still warm from a clerk who loved a ledger more than a throat. Swing it or it is only inventory."',
        tags: ['baton', 'shock', 'weapon'],
      },
    ],
    changeScrap: true,
    buyScrip: true,
    openBuyFlash: '"Drops. Hide. A baton if the Maw pawned one. Approach prices. That is Buy."',
    openSellFlash: '"I buy what the dunes spat out — if it is not on your body, and it is not a key. I pay less than I charge."',
    sellFlash: 'He smiles like a receipt. You get less than the stall would charge.',
  },
  {
    id: 'silas',
    scenes: ['spine:silas', 'spine:silas-drop'],
    stock: [
      {
        id: 'drop',
        item: 'vial_drop',
        label: 'Buy a Drop',
        sub: 'First Drop prices. Pay with a Glint or with scrap. He does not take scrip.',
        cost: { glints: 1, scrap: 2 },
        extraRemove: { vial_empty: 1 },
        extraFlag: { firstDrop: true, silasGave: true },
        flash: 'He sets a Drop in your hands. It looks like a captured noon. First Drop. Your hands remember hope, which is irritating.',
        tags: ['drop', 'vial', 'sap', 'oasis', 'glint', 'scrap'],
      },
    ],
    changeScrap: true,
    openBuyFlash: '"A Drop for a Glint, or scrap enough to patch a tent. I do not take Cartel scrip. Scrip tastes like a leash."',
    openSellFlash: '"I am shade, not a pawn shop. Unequipped junk I will still weigh. Keys stay yours."',
    sellFlash: '"I am shade, not a pawn shop. Still. Noon is uglier with a heavier pack."',
  },
]

const BY_SCENE: Record<string, Vendor> = {}
for (const v of VENDORS) {
  for (const id of v.scenes) BY_SCENE[id] = v
}

export function vendorFor(sceneId: string): Vendor | undefined {
  return BY_SCENE[sceneId]
}

export function shopShelfOf(state: GameState): ShopShelf | null {
  const v = state.flags.shopShelf
  return v === 'buy' || v === 'sell' ? v : null
}

export function isShopOpen(state: GameState): boolean {
  return !!vendorFor(state.sceneId) && shopShelfOf(state) != null
}

export function moneyLabel(m: Money): string {
  const bits: string[] = []
  if (m.glints) bits.push(m.glints === 1 ? '1 Glint' : `${m.glints} Glints`)
  if (m.scrap) bits.push(m.scrap === 1 ? '1 scrap' : `${m.scrap} scrap`)
  return bits.join(' or ')
}

function moneyCond(m: Money): Cond | undefined {
  const parts: Cond[] = []
  if (m.glints) parts.push({ itemMin: ['glints', m.glints] })
  if (m.scrap) parts.push({ itemMin: ['scrap', m.scrap] })
  if (!parts.length) return undefined
  if (parts.length === 1) return parts[0]
  return { any: parts }
}

function payRemove(m: Money): Partial<Record<ItemId, number>> {
  const remove: Partial<Record<ItemId, number>> = {}
  if (m.glints) remove.glints = m.glints
  if (m.scrap) remove.scrap = m.scrap
  return remove
}

/** Spend Glint if the pack can, else scrap. Both fields are alternative prices. */
export function pickPay(state: GameState, m: Money): Partial<Record<ItemId, number>> | null {
  if (m.glints && (state.items.glints ?? 0) >= m.glints) return { glints: m.glints }
  if (m.scrap && (state.items.scrap ?? 0) >= m.scrap) return { scrap: m.scrap }
  return null
}

export function canPay(state: GameState, m: Money): boolean {
  return pickPay(state, m) != null
}

function sellPay(id: ItemId): Money | null {
  if (NEVER_SELL.has(id)) return null
  if (SELL_PAY[id]) return SELL_PAY[id] as Money
  const kind = ITEMS[id]?.kind
  if (kind === 'weapon' || kind === 'armor') return { scrap: 1 }
  if (kind === 'gear' && id !== 'vial_empty') return { scrap: 1 }
  return null
}

/** Spare copies — equipped weapon/armor stay off the list until unequipped in Gear. */
export function saleableCount(state: GameState, id: ItemId): number {
  const n = state.items[id] ?? 0
  if (n <= 0) return 0
  const worn = state.equipped?.weapon === id || state.equipped?.armor === id
  return worn ? Math.max(0, n - 1) : n
}

function knownFlag(vendor: Vendor, sceneId: string, extra?: FlagMap): FlagMap {
  const flag: FlagMap = { ...(extra ?? {}) }
  if (vendor.knownFlag) flag[vendor.knownFlag] = true
  if (vendor.id === 'kaelen' && extra && 'kaelenSoldDrop' in extra && sceneId === 'spine:kaelen') {
    flag.firstDrop = true
  }
  return flag
}

function backChoice(): Choice {
  return {
    id: 'shop-back',
    label: 'Back to the stall',
    tone: 'quiet',
    effects: { unsetFlag: ['shopShelf'] },
  }
}

/** Dual-price stock is two rows so the player picks Glint or scrap. */
export function priceOptions(m: Money): { key: string; cost: Money }[] {
  const glints = m.glints ?? 0
  const scrap = m.scrap ?? 0
  if (glints > 0 && scrap > 0) {
    return [
      { key: 'glint', cost: { glints } },
      { key: 'scrap', cost: { scrap } },
    ]
  }
  return [{ key: 'pay', cost: m }]
}

function offerLabel(offer: StockOffer, cost: Money): string {
  const name = ITEMS[offer.item]?.name
  const base = name ? `Buy ${name}` : offer.label.replace(/\s+—\s+.+$/, '')
  return `${base} — ${moneyLabel(cost)}`
}

function buyRows(state: GameState, vendor: Vendor): Choice[] {
  const rows: Choice[] = []
  for (const offer of vendor.stock) {
    if (offer.onceFlag && state.flags[offer.onceFlag]) continue
    const flag = knownFlag(vendor, state.sceneId, offer.extraFlag)
    const opts = priceOptions(offer.cost)
    for (const opt of opts) {
      const id = opts.length > 1 ? `${offer.id}-${opt.key}` : offer.id
      rows.push({
        id,
        label: offerLabel(offer, opt.cost),
        sub: offer.sub,
        group: 'buy',
        enable: moneyCond(opt.cost),
        locked: `Need ${moneyLabel(opt.cost)}`,
        effects: {
          pay: opt.cost,
          payGlintRemove: opt.cost.glints ? offer.extraRemove : undefined,
          add: { [offer.item]: 1 },
          flag,
          ticks: 1,
          flash: offer.flash,
        },
      })
    }
  }
  rows.push(backChoice())
  return rows
}

function sellRows(state: GameState, vendor: Vendor): Choice[] {
  const rows: Choice[] = []
  if (vendor.changeScrap) {
    rows.push({
      id: 'sell-scrap',
      label: 'Change two scrap for a Glint',
      sub: 'The stall’s exchange. Not a bargain.',
      group: 'sell',
      enable: { itemMin: ['scrap', 2] },
      locked: 'Need 2 scrap',
      effects: {
        remove: { scrap: 2 },
        add: { glints: 1 },
        flag: knownFlag(vendor, state.sceneId),
        ticks: 1,
        flash: vendor.sellFlash,
      },
    })
  }
  if (vendor.buyScrip) {
    rows.push({
      id: 'sell-scrip',
      label: 'Pawn Cartel scrip for scrap',
      sub: 'Ironwood lullabies. Cartel Heat notices.',
      group: 'sell',
      enable: { item: 'scrip' },
      locked: 'No Cartel scrip in the pack',
      effects: {
        remove: { scrip: 1 },
        add: { scrap: 1 },
        heat: { cartel: 1 },
        flag: knownFlag(vendor, state.sceneId),
        ticks: 1,
        flash: '"Ironwood lullabies." He gives you scrap like a dare. Cartel Heat notices paper moving.',
      },
    })
  }
  for (const id of Object.keys(state.items) as ItemId[]) {
    const pay = sellPay(id)
    const n = saleableCount(state, id)
    if (!pay || n <= 0 || !ITEMS[id]) continue
    const name = ITEMS[id].name
    rows.push({
      id: `sell-${id}`,
      label: n > 1 ? `Sell ${name} ×1` : `Sell ${name}`,
      sub: `They pay ${moneyLabel(pay)}. Unequipped.`,
      group: 'sell',
      effects: {
        remove: { [id]: 1 },
        add: payRemove(pay),
        flag: knownFlag(vendor, state.sceneId),
        ticks: 1,
        flash: vendor.sellFlash,
      },
    })
  }
  const goods = rows.filter((r) => r.id !== 'sell-scrap' && r.id !== 'sell-scrip')
  const exchange = rows.filter((r) => r.id === 'sell-scrap' || r.id === 'sell-scrip')
  const listed = [...exchange, ...goods]
  if (!goods.length && !(vendor.buyScrip && (state.items.scrip ?? 0) > 0) && (state.items.scrap ?? 0) < 2) {
    listed.push({
      id: 'sell-empty',
      label: 'Nothing saleable in the pack',
      sub: 'Unequip in Gear. This stall will not take keys, maps, or what you are wearing.',
      group: 'sell',
      enable: { flag: '__no__' },
      locked: 'Unequip in Gear, or keep the keys.',
      effects: {},
    })
  }
  listed.push(backChoice())
  return listed
}

function tagTalk(c: Choice): Choice {
  if (c.group || c.tone === 'quiet' || c.tone === 'hunger') return c
  return { ...c, group: 'talk' }
}

export function shopChoices(state: GameState, authored: Choice[]): Choice[] {
  const vendor = vendorFor(state.sceneId)
  if (!vendor) return authored
  const rest = authored.filter((c) => !AUTH_PRODUCT.has(c.id)).map(tagTalk)
  const shelf = shopShelfOf(state)
  if (shelf === 'buy') return buyRows(state, vendor)
  if (shelf === 'sell') return sellRows(state, vendor)
  return [
    {
      id: 'shop-buy',
      label: 'Buy',
      sub: 'Their stock. Prices on the shelf.',
      group: 'buy',
      effects: { flag: { shopShelf: 'buy' }, flash: vendor.openBuyFlash },
    },
    {
      id: 'shop-sell',
      label: 'Sell',
      sub: 'Unequipped pack. They pay less than they charge.',
      group: 'sell',
      effects: { flag: { shopShelf: 'sell' }, flash: vendor.openSellFlash },
    },
    ...rest,
  ]
}

function word(hay: string, tag: string): boolean {
  const t = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${t}\\b`, 'i').test(hay)
}

export function matchShopText(state: GameState, text: string): { effects: Effect; verb: string } | null {
  const vendor = vendorFor(state.sceneId)
  if (!vendor) return null
  const hay = text.toLowerCase()
  const shelf = shopShelfOf(state)

  if (shelf && /\b(back|counter|stall|pack|menu)\b/.test(hay)) {
    return { effects: { unsetFlag: ['shopShelf'], flash: 'Back to the stall.' }, verb: 'back' }
  }

  const wantsSell = /\b(sell|pawn|dump|unload)\b/.test(hay)
  const wantsBuy = /\b(buy|shop|stock|wares|goods)\b/.test(hay)

  if (wantsSell && !wantsBuy) {
    if (shelf !== 'sell') {
      return { effects: { flag: { shopShelf: 'sell' }, flash: vendor.openSellFlash }, verb: 'sell' }
    }
    const rows = sellRows(state, vendor)
    const hit = rows.find((c) => c.id.startsWith('sell-') && c.id !== 'sell-empty' && ITEMS[c.id.slice(5) as ItemId] && word(hay, ITEMS[c.id.slice(5) as ItemId].name.split(' ')[0] ?? ''))
    if (hit && (!hit.enable || true)) {
      const itemId = hit.id.replace(/^sell-/, '') as ItemId
      if (itemId === 'scrap' || itemId === 'scrip' || saleableCount(state, itemId) > 0) return { effects: hit.effects, verb: 'sell' }
    }
    if (/\bscrap\b/.test(hay) && (state.items.scrap ?? 0) >= 2) {
      const row = rows.find((c) => c.id === 'sell-scrap')
      if (row) return { effects: row.effects, verb: 'sell' }
    }
    return { effects: { flag: { shopShelf: 'sell' }, flash: vendor.openSellFlash }, verb: 'sell' }
  }

  const offers = vendor.stock.filter((o) => !o.onceFlag || !state.flags[o.onceFlag])
  const named = offers.find((o) => o.tags.some((t) => word(hay, t)))
  if (named && (wantsBuy || shelf === 'buy' || (!wantsSell && named.tags.some((t) => word(hay, t) && t !== 'scrap' && t !== 'glint')))) {
    const opts = priceOptions(named.cost)
    const wantG = /\bglints?\b/.test(hay)
    const wantS = /\bscrap\b/.test(hay)
    let cost: Money | null = null
    if (opts.length === 1) cost = opts[0].cost
    else if (wantG && !wantS) cost = { glints: named.cost.glints }
    else if (wantS && !wantG) cost = { scrap: named.cost.scrap }
    else {
      const canG = !!(named.cost.glints && canPay(state, { glints: named.cost.glints }))
      const canS = !!(named.cost.scrap && canPay(state, { scrap: named.cost.scrap }))
      if (canG && canS) {
        return {
          effects: {
            flag: { shopShelf: 'buy' },
            flash: `Pay with ${moneyLabel({ glints: named.cost.glints })} or with ${moneyLabel({ scrap: named.cost.scrap })}. Point at a price.`,
          },
          verb: 'buy',
        }
      }
      if (canG) cost = { glints: named.cost.glints }
      else if (canS) cost = { scrap: named.cost.scrap }
    }
    if (cost && canPay(state, cost)) {
      const flag = knownFlag(vendor, state.sceneId, named.extraFlag)
      return {
        effects: {
          pay: cost,
          payGlintRemove: cost.glints ? named.extraRemove : undefined,
          add: { [named.item]: 1 },
          flag,
          ticks: 1,
          flash: named.flash,
        },
        verb: 'buy',
      }
    }
    return {
      effects: { flag: { shopShelf: 'buy' }, flash: `Need ${moneyLabel(named.cost)}. Buy is the shelf.` },
      verb: 'buy',
    }
  }

  if (wantsBuy || /\b(trade|barter|deal|price)\b/.test(hay)) {
    if (shelf !== 'buy') {
      return { effects: { flag: { shopShelf: 'buy' }, flash: vendor.openBuyFlash }, verb: 'buy' }
    }
  }

  return null
}
