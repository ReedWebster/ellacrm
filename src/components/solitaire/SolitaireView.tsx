import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { RotateCcw, Trophy, Clock, Hash } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

interface Card { id: string; suit: Suit; rank: Rank; faceUp: boolean }

type Loc =
  | { zone: 'waste' }
  | { zone: 'foundation'; pile: number }
  | { zone: 'tableau'; col: number; fromRow: number }

interface Game {
  stock: Card[]
  waste: Card[]
  foundations: Card[][]
  tableau: Card[][]
  moves: number
  won: boolean
}

// ─── Game logic ───────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const isRed = (s: Suit) => s === 'hearts' || s === 'diamonds'
const rl = (r: Rank) =>
  r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r)
const sym = (s: Suit) =>
  ({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as const)[s]

let _gid = 0 // unique per-deal ID — prevents React reusing card DOM nodes across games

function freshDeal(): Game {
  const gid = ++_gid
  const deck: Card[] = SUITS.flatMap(suit =>
    Array.from({ length: 13 }, (_, i) => ({
      id: `g${gid}-${suit}-${i + 1}`,
      suit,
      rank: (i + 1) as Rank,
      faceUp: false,
    }))
  )
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let idx = 0
  for (let col = 0; col < 7; col++)
    for (let row = 0; row <= col; row++)
      tableau[col].push({ ...deck[idx++], faceUp: row === col })

  return { stock: deck.slice(idx), waste: [], foundations: [[], [], [], []], tableau, moves: 0, won: false }
}

const canTab = (card: Card, col: Card[]): boolean =>
  col.length === 0
    ? card.rank === 13
    : col[col.length - 1].faceUp &&
      isRed(card.suit) !== isRed(col[col.length - 1].suit) &&
      card.rank === col[col.length - 1].rank - 1

const canFound = (card: Card, pile: Card[]): boolean =>
  pile.length === 0
    ? card.rank === 1
    : pile[pile.length - 1].suit === card.suit && card.rank === pile[pile.length - 1].rank + 1

const isWon = (f: Card[][]): boolean => f.every(p => p.length === 13)

function bestFoundPile(card: Card, foundations: Card[][]): number {
  return foundations.findIndex(p => canFound(card, p))
}

// Returns copies of tableau/foundations/waste with the source cards removed
function removeFrom(g: Game, loc: Loc, count: number) {
  const tableau = g.tableau.map(c => [...c])
  const foundations = g.foundations.map(p => [...p])
  let waste = [...g.waste]

  if (loc.zone === 'waste') {
    waste = waste.slice(0, -1)
  } else if (loc.zone === 'tableau') {
    tableau[loc.col] = tableau[loc.col].slice(0, loc.fromRow)
    if (tableau[loc.col].length > 0) {
      const last = tableau[loc.col].length - 1
      if (!tableau[loc.col][last].faceUp)
        tableau[loc.col][last] = { ...tableau[loc.col][last], faceUp: true }
    }
  } else if (loc.zone === 'foundation') {
    foundations[loc.pile] = foundations[loc.pile].slice(0, -count)
  }

  return { tableau, foundations, waste }
}

// ─── Responsive card sizing ───────────────────────────────────────────────────

interface Dims { CW: number; CH: number; GAP: number; FD: number; FU: number }

function calcDims(w: number): Dims {
  // FD = face-down visible strip height, FU = face-up visible strip height
  if (w < 480) return { CW: 44, CH: 63, GAP: 5,  FD: 12, FU: 20 }
  if (w < 640) return { CW: 52, CH: 74, GAP: 6,  FD: 14, FU: 24 }
  return               { CW: 64, CH: 92, GAP: 9,  FD: 16, FU: 28 }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardBack({ cw, ch }: { cw: number; ch: number }) {
  return (
    <div
      style={{ width: cw, height: ch, flexShrink: 0 }}
      className="rounded-[10px] bg-gradient-to-br from-blush-400 to-blush-600 dark:from-mauve-600 dark:to-mauve-700 shadow-sm flex items-center justify-center"
    >
      <div className="w-[76%] h-[76%] rounded-lg border-2 border-white/30 flex items-center justify-center">
        <div className="w-[52%] h-[52%] rounded border border-white/25 bg-white/10" />
      </div>
    </div>
  )
}

interface FaceProps {
  card: Card
  cw: number; ch: number
  selected?: boolean
  dimmed?: boolean
  ghost?: boolean
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function CardFace({ card, cw, ch, selected, dimmed, ghost, onPointerDown, onClick, onDoubleClick }: FaceProps) {
  const red = isRed(card.suit)
  const color = red ? 'text-rose-500 dark:text-rose-400' : 'text-plum-900 dark:text-mauve-100'
  const fs = cw < 56
    ? { r: '9px', s: '7px', c: '17px' }
    : { r: '11px', s: '9px', c: '22px' }

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{ width: cw, height: ch, touchAction: 'none', flexShrink: 0, opacity: dimmed ? 0.35 : 1 }}
      className={[
        'rounded-[10px] flex flex-col p-[5px] select-none',
        'bg-white dark:bg-mauve-800',
        'border border-black/[0.07] dark:border-white/[0.07]',
        ghost ? 'shadow-2xl' : 'shadow-sm cursor-grab active:cursor-grabbing',
        selected ? 'ring-2 ring-blush-500 dark:ring-blush-400 shadow-md' : '',
      ].join(' ')}
    >
      <div className={`flex flex-col items-start leading-none ${color}`}>
        <span style={{ fontSize: fs.r }} className="font-bold">{rl(card.rank)}</span>
        <span style={{ fontSize: fs.s }} className="mt-[1px]">{sym(card.suit)}</span>
      </div>
      <div className={`flex-1 flex items-center justify-center ${color}`} style={{ fontSize: fs.c }}>
        {sym(card.suit)}
      </div>
      <div className={`flex flex-col items-end leading-none rotate-180 ${color}`}>
        <span style={{ fontSize: fs.r }} className="font-bold">{rl(card.rank)}</span>
        <span style={{ fontSize: fs.s }} className="mt-[1px]">{sym(card.suit)}</span>
      </div>
    </div>
  )
}

function EmptyPile({ cw, ch, label, highlighted }: {
  cw: number; ch: number; label?: string; highlighted?: boolean
}) {
  return (
    <div
      style={{ width: cw, height: ch, fontSize: cw < 56 ? '13px' : '15px', flexShrink: 0 }}
      className={[
        'rounded-[10px] border-2 border-dashed flex items-center justify-center',
        'font-medium select-none transition-colors',
        highlighted
          ? 'border-blush-400 dark:border-blush-500 bg-blush-50/60 dark:bg-mauve-700/30'
          : 'border-blush-200 dark:border-mauve-700 text-mauve-300 dark:text-mauve-600',
      ].join(' ')}
    >
      {label}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FOUND_LABELS = ['♥', '♦', '♣', '♠']

export default function SolitaireView() {
  // ── Responsive sizing ────────────────────────────────────────────────────
  const [winW, setWinW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 800)
  useEffect(() => {
    const fn = () => setWinW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  const { CW, CH, GAP, FD, FU } = useMemo(() => calcDims(winW), [winW])

  // ── Game state ───────────────────────────────────────────────────────────
  const [game, setGame] = useState<Game>(freshDeal)
  const [sel, setSel] = useState<{ cards: Card[]; loc: Loc } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  // ── Drag state ───────────────────────────────────────────────────────────
  const [dragging, setDragging]       = useState(false)
  const [ghostCards, setGhostCards]   = useState<Card[]>([])
  const [ghostPos, setGhostPos]       = useState({ x: 0, y: 0 })
  const [dimmedIds, setDimmedIds]     = useState<Set<string>>(new Set())
  const [hlDrop, setHlDrop]           = useState<string | null>(null)

  const dragRef = useRef<{
    cards: Card[]; source: Loc
    startX: number; startY: number; ox: number; oy: number; active: boolean
  } | null>(null)
  const justDraggedRef = useRef(false)

  // Drop zone refs (for bounding-rect hit testing)
  const foundRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
  const tabRefs   = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || game.won) return
    const id = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [running, game.won])

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── Stable move functions (only call stable setters) ─────────────────────
  const doMoveToTab = useCallback((cards: Card[], loc: Loc, ci: number) => {
    setGame(g => {
      if (loc.zone === 'tableau' && loc.col === ci) return g
      if (!canTab(cards[0], g.tableau[ci])) return g
      const { tableau, foundations, waste } = removeFrom(g, loc, cards.length)
      tableau[ci] = [...tableau[ci], ...cards]
      return { ...g, tableau, foundations, waste, moves: g.moves + 1, won: isWon(foundations) }
    })
    setSel(null)
  }, [])

  const doMoveToFound = useCallback((cards: Card[], loc: Loc, pi: number) => {
    setGame(g => {
      if (!canFound(cards[0], g.foundations[pi])) return g
      const { tableau, foundations, waste } = removeFrom(g, loc, cards.length)
      foundations[pi] = [...foundations[pi], ...cards]
      return { ...g, tableau, foundations, waste, moves: g.moves + 1, won: isWon(foundations) }
    })
    setSel(null)
  }, [])

  // ── Drag: global pointer listeners (set up once, stable) ─────────────────
  useEffect(() => {
    function hitTest(x: number, y: number): { type: 'tab' | 'found'; index: number } | null {
      for (let i = 0; i < 4; i++) {
        const el = foundRefs.current[i]; if (!el) continue
        const r = el.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
          return { type: 'found', index: i }
      }
      for (let i = 0; i < 7; i++) {
        const el = tabRefs.current[i]; if (!el) continue
        const r = el.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
          return { type: 'tab', index: i }
      }
      return null
    }

    function onMove(e: PointerEvent) {
      const d = dragRef.current; if (!d) return

      if (!d.active) {
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return
        d.active = true
        setRunning(true)
        setSel(null)
        setDragging(true)
        setGhostCards(d.cards)
        setDimmedIds(new Set(d.cards.map(c => c.id)))
      }

      e.preventDefault()
      setGhostPos({ x: e.clientX - d.ox, y: e.clientY - d.oy })
      const zone = hitTest(e.clientX, e.clientY)
      setHlDrop(zone ? `${zone.type}-${zone.index}` : null)
    }

    function onUp(e: PointerEvent) {
      const d = dragRef.current
      dragRef.current = null
      setDragging(false); setGhostCards([]); setDimmedIds(new Set()); setHlDrop(null)
      if (!d?.active) return

      justDraggedRef.current = true
      setTimeout(() => { justDraggedRef.current = false }, 300)

      const zone = hitTest(e.clientX, e.clientY)
      if (!zone) return
      if (zone.type === 'tab') doMoveToTab(d.cards, d.source, zone.index)
      else if (zone.type === 'found' && d.cards.length === 1) doMoveToFound(d.cards, d.source, zone.index)
    }

    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [doMoveToTab, doMoveToFound])

  // ── Drag start ───────────────────────────────────────────────────────────
  function startDrag(cards: Card[], source: Loc, e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      cards, source,
      startX: e.clientX, startY: e.clientY,
      ox: e.clientX - rect.left, oy: e.clientY - rect.top,
      active: false,
    }
  }

  // ── Game actions ─────────────────────────────────────────────────────────
  function newGame() {
    dragRef.current = null
    setGame(freshDeal()); setSel(null); setElapsed(0); setRunning(false)
    setDragging(false); setGhostCards([]); setDimmedIds(new Set())
  }

  function drawStock(e: React.MouseEvent) {
    e.stopPropagation()
    setRunning(true); setSel(null)
    setGame(g => {
      if (!g.stock.length) {
        if (!g.waste.length) return g
        return { ...g, stock: [...g.waste].reverse().map(c => ({ ...c, faceUp: false })), waste: [] }
      }
      const card = { ...g.stock[g.stock.length - 1], faceUp: true }
      return { ...g, stock: g.stock.slice(0, -1), waste: [...g.waste, card] }
    })
  }

  function clickWaste(e: React.MouseEvent) {
    e.stopPropagation()
    if (justDraggedRef.current) return
    setRunning(true)
    const top = game.waste[game.waste.length - 1]; if (!top) return
    if (sel?.loc.zone === 'waste') { setSel(null); return }
    setSel({ cards: [top], loc: { zone: 'waste' } })
  }

  function dblWaste(e: React.MouseEvent) {
    e.stopPropagation()
    const top = game.waste[game.waste.length - 1]; if (!top) return
    const pile = bestFoundPile(top, game.foundations)
    if (pile >= 0) doMoveToFound([top], { zone: 'waste' }, pile)
  }

  function clickFound(pi: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (justDraggedRef.current) return
    setRunning(true)
    if (sel) {
      if (sel.cards.length === 1) doMoveToFound(sel.cards, sel.loc, pi)
      else setSel(null)
      return
    }
    const top = game.foundations[pi][game.foundations[pi].length - 1]
    if (top) setSel({ cards: [top], loc: { zone: 'foundation', pile: pi } })
  }

  function clickTabCard(ci: number, ri: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (justDraggedRef.current) return
    setRunning(true)
    const col = game.tableau[ci]
    const card = col[ri]

    if (!card.faceUp) {
      // Flip top face-down card
      if (ri === col.length - 1 && !sel) {
        setGame(g => {
          const t = g.tableau.map(c => [...c])
          t[ci][ri] = { ...t[ci][ri], faceUp: true }
          return { ...g, tableau: t, moves: g.moves + 1 }
        })
      }
      return
    }

    if (sel) {
      if (sel.loc.zone === 'tableau' && sel.loc.col === ci && sel.loc.fromRow === ri) {
        setSel(null); return
      }
      doMoveToTab(sel.cards, sel.loc, ci)
      return
    }

    setSel({ cards: col.slice(ri), loc: { zone: 'tableau', col: ci, fromRow: ri } })
  }

  function dblTabCard(ci: number, ri: number, e: React.MouseEvent) {
    e.stopPropagation()
    const col = game.tableau[ci]
    const card = col[ri]
    if (!card.faceUp || ri !== col.length - 1) return
    const pile = bestFoundPile(card, game.foundations)
    if (pile >= 0) doMoveToFound([card], { zone: 'tableau', col: ci, fromRow: ri }, pile)
  }

  function clickTabCol(ci: number) {
    if (sel) doMoveToTab(sel.cards, sel.loc, ci)
  }

  // ── Position helpers (FIXED: col.slice(0, ri) not col.slice(1, ri+1)) ────
  function cardTop(col: Card[], ri: number): number {
    return col.slice(0, ri).reduce((acc, c) => acc + (c.faceUp ? FU : FD), 0)
  }
  function colHeight(col: Card[]): number {
    if (col.length === 0) return CH
    // FIXED: total = position of last card + full card height
    return cardTop(col, col.length - 1) + CH
  }

  const isSel = (c: Card) => sel?.cards.some(s => s.id === c.id) ?? false

  // ── Render ────────────────────────────────────────────────────────────────
  const boardMinW = 7 * CW + 6 * GAP

  return (
    <div className="p-4 sm:p-6 animate-view-in select-none" onClick={() => setSel(null)}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-plum-800 dark:text-mauve-100">Solitaire</h1>
          <p className="text-sm text-mauve-400 mt-0.5">Klondike · draw 1</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-5 text-sm text-mauve-400">
            <span className="flex items-center gap-1.5 tabular-nums"><Hash size={13} />{game.moves}</span>
            <span className="flex items-center gap-1.5 tabular-nums"><Clock size={13} />{fmt(elapsed)}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); newGame() }}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <RotateCcw size={14} /> New game
          </button>
        </div>
      </div>

      {/* Win banner */}
      {game.won && (
        <div className="mb-6 card p-6 text-center animate-modal-in">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mx-auto mb-3">
            <Trophy size={28} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-plum-800 dark:text-mauve-100 mb-1">You won!</h2>
          <p className="text-sm text-mauve-400 mb-4">{game.moves} moves · {fmt(elapsed)}</p>
          <button onClick={e => { e.stopPropagation(); newGame() }} className="btn-primary">Play again</button>
        </div>
      )}

      {/* Board */}
      <div className="card p-3 sm:p-5 overflow-x-auto">
        <div style={{ minWidth: boardMinW }}>

          {/* Top row: stock · waste · spacer · foundations */}
          <div className="flex items-start mb-4" style={{ gap: GAP }}>

            {/* Stock */}
            <div style={{ width: CW, height: CH, flexShrink: 0 }}>
              {game.stock.length > 0 ? (
                <div
                  onClick={drawStock}
                  style={{ touchAction: 'none' }}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <CardBack cw={CW} ch={CH} />
                </div>
              ) : (
                <div
                  onClick={drawStock}
                  style={{ width: CW, height: CH }}
                  className="rounded-[10px] border-2 border-dashed border-blush-200 dark:border-mauve-700 flex items-center justify-center cursor-pointer hover:border-blush-300 transition-colors"
                >
                  <RotateCcw size={16} className="text-mauve-300 dark:text-mauve-600" />
                </div>
              )}
            </div>

            {/* Waste */}
            <div style={{ width: CW, height: CH, flexShrink: 0 }}>
              {game.waste.length > 0 ? (
                <CardFace
                  card={game.waste[game.waste.length - 1]}
                  cw={CW} ch={CH}
                  selected={sel?.loc.zone === 'waste'}
                  onClick={clickWaste}
                  onDoubleClick={dblWaste}
                  onPointerDown={e => {
                    const top = game.waste[game.waste.length - 1]
                    if (top) startDrag([top], { zone: 'waste' }, e)
                  }}
                />
              ) : (
                <EmptyPile cw={CW} ch={CH} />
              )}
            </div>

            <div className="flex-1" />

            {/* Foundations */}
            {game.foundations.map((pile, pi) => {
              const top = pile[pile.length - 1]
              const hl = hlDrop === `found-${pi}`
              return (
                <div
                  key={pi}
                  ref={el => { foundRefs.current[pi] = el }}
                  style={{ width: CW, height: CH, flexShrink: 0, position: 'relative' }}
                  onClick={e => clickFound(pi, e)}
                >
                  {top ? (
                    <>
                      <CardFace
                        card={top}
                        cw={CW} ch={CH}
                        selected={sel?.loc.zone === 'foundation' && sel.loc.pile === pi}
                        onPointerDown={e => startDrag([top], { zone: 'foundation', pile: pi }, e)}
                      />
                      {hl && (
                        <div
                          style={{ position: 'absolute', inset: 0 }}
                          className="rounded-[10px] ring-2 ring-blush-400 dark:ring-blush-500 pointer-events-none"
                        />
                      )}
                    </>
                  ) : (
                    <EmptyPile cw={CW} ch={CH} label={FOUND_LABELS[pi]} highlighted={hl} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Tableau */}
          <div className="flex items-start" style={{ gap: GAP }}>
            {game.tableau.map((col, ci) => {
              const colH = colHeight(col)
              const hl = hlDrop === `tab-${ci}`
              return (
                <div
                  key={ci}
                  ref={el => { tabRefs.current[ci] = el }}
                  style={{ width: CW, height: Math.max(CH, colH), flexShrink: 0, position: 'relative' }}
                  onClick={() => clickTabCol(ci)}
                  className={hl ? 'rounded-[10px] ring-2 ring-blush-400 dark:ring-blush-500' : ''}
                >
                  {col.length === 0 ? (
                    <EmptyPile cw={CW} ch={CH} highlighted={hl} />
                  ) : (
                    col.map((card, ri) => {
                      const top = cardTop(col, ri)
                      const dimmed = dimmedIds.has(card.id)
                      return (
                        <div
                          key={card.id}
                          style={{ position: 'absolute', top, left: 0, width: CW, height: CH, zIndex: ri + 1 }}
                          onClick={e => clickTabCard(ci, ri, e)}
                          onDoubleClick={e => dblTabCard(ci, ri, e)}
                        >
                          {card.faceUp ? (
                            <CardFace
                              card={card} cw={CW} ch={CH}
                              selected={isSel(card)}
                              dimmed={dimmed}
                              onPointerDown={e =>
                                startDrag(col.slice(ri), { zone: 'tableau', col: ci, fromRow: ri }, e)
                              }
                            />
                          ) : (
                            <div style={{ touchAction: 'none' }}>
                              <CardBack cw={CW} ch={CH} />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden items-center justify-center gap-6 mt-4 text-sm text-mauve-400">
        <span className="flex items-center gap-1.5 tabular-nums"><Hash size={13} />{game.moves} moves</span>
        <span className="flex items-center gap-1.5 tabular-nums"><Clock size={13} />{fmt(elapsed)}</span>
      </div>

      <p className="text-center text-[11px] text-mauve-300 dark:text-mauve-600 mt-3">
        Drag cards · or tap to select then tap destination · double-tap top card to send to foundation
      </p>

      {/* Drag ghost — fixed overlay, pointer-events none */}
      {dragging && ghostCards.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: ghostPos.x,
            top: ghostPos.y,
            zIndex: 9999,
            pointerEvents: 'none',
            userSelect: 'none',
            transform: 'rotate(1.5deg)',
          }}
        >
          {ghostCards.map((card, i) => (
            <div key={card.id} style={{ marginTop: i === 0 ? 0 : -(CH - FU) }}>
              <CardFace card={card} cw={CW} ch={CH} ghost />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
