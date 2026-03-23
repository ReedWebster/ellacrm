import { useState, useEffect, useRef, useCallback } from 'react'
import { RotateCcw, Trophy, Clock, Hash, Undo2, Zap, Star } from 'lucide-react'

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
  score: number
  won: boolean
}

interface Dims { CW: number; CH: number; GAP: number; FD: number; FU: number }

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const FOUND_LABELS = ['♥', '♦', '♣', '♠']
const isRed = (s: Suit) => s === 'hearts' || s === 'diamonds'
const rl = (r: Rank) =>
  r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r)
const sym = (s: Suit) =>
  ({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as const)[s]

const PTS_TO_FOUND = 10
const PTS_WASTE_TO_TAB = 5
const PTS_REVEAL = 5
const PTS_FROM_FOUND = -15

let _gid = 0

// ─── Game Logic ───────────────────────────────────────────────────────────────

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

  return {
    stock: deck.slice(idx), waste: [], foundations: [[], [], [], []], tableau,
    moves: 0, score: 0, won: false,
  }
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

function removeFrom(g: Game, loc: Loc, count: number) {
  const tableau = g.tableau.map(c => [...c])
  const foundations = g.foundations.map(p => [...p])
  let waste = [...g.waste]
  let revealed = false

  if (loc.zone === 'waste') {
    waste = waste.slice(0, -1)
  } else if (loc.zone === 'tableau') {
    tableau[loc.col] = tableau[loc.col].slice(0, loc.fromRow)
    if (tableau[loc.col].length > 0) {
      const last = tableau[loc.col].length - 1
      if (!tableau[loc.col][last].faceUp) {
        tableau[loc.col][last] = { ...tableau[loc.col][last], faceUp: true }
        revealed = true
      }
    }
  } else if (loc.zone === 'foundation') {
    foundations[loc.pile] = foundations[loc.pile].slice(0, -count)
  }

  return { tableau, foundations, waste, revealed }
}

function sourceMatches(g: Game, loc: Loc, cards: Card[]): boolean {
  if (loc.zone === 'waste') {
    return g.waste.length > 0 && g.waste[g.waste.length - 1].id === cards[0].id
  } else if (loc.zone === 'tableau') {
    const col = g.tableau[loc.col]
    if (loc.fromRow >= col.length) return false
    return col[loc.fromRow].id === cards[0].id
  } else if (loc.zone === 'foundation') {
    const pile = g.foundations[loc.pile]
    return pile.length > 0 && pile[pile.length - 1].id === cards[0].id
  }
  return false
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardBack({ cw, ch }: { cw: number; ch: number }) {
  return (
    <div
      style={{ width: cw, height: ch, flexShrink: 0 }}
      className="rounded-lg bg-gradient-to-br from-blush-400 to-blush-600 dark:from-blush-500 dark:to-blush-700 shadow-sm flex items-center justify-center"
    >
      <div className="w-[76%] h-[76%] rounded border-2 border-white/30 flex items-center justify-center">
        <div className="w-[52%] h-[52%] rounded-sm border border-white/25 bg-white/10" />
      </div>
    </div>
  )
}

interface FaceProps {
  card: Card; cw: number; ch: number
  selected?: boolean; dimmed?: boolean; ghost?: boolean
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  onDoubleClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

function CardFace({ card, cw, ch, selected, dimmed, ghost, onPointerDown, onClick, onDoubleClick }: FaceProps) {
  const red = isRed(card.suit)
  const color = red ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-mauve-100'
  const fs = cw < 48
    ? { r: '8px', s: '7px', c: '14px' }
    : cw < 60
    ? { r: '10px', s: '8px', c: '18px' }
    : { r: '12px', s: '10px', c: '24px' }

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{ width: cw, height: ch, touchAction: 'none', flexShrink: 0, opacity: dimmed ? 0.3 : 1 }}
      className={[
        'rounded-lg flex flex-col select-none',
        'bg-white dark:bg-mauve-800',
        'border border-black/[0.08] dark:border-white/[0.08]',
        ghost ? 'shadow-2xl' : 'shadow-sm cursor-grab active:cursor-grabbing',
        selected ? 'ring-2 ring-blush-500 dark:ring-blush-400 shadow-md' : '',
      ].join(' ')}
    >
      <div className={`flex flex-col items-start leading-none ${color} p-[3px]`}>
        <span style={{ fontSize: fs.r }} className="font-bold">{rl(card.rank)}</span>
        <span style={{ fontSize: fs.s }} className="mt-px">{sym(card.suit)}</span>
      </div>
      <div className={`flex-1 flex items-center justify-center ${color}`} style={{ fontSize: fs.c }}>
        {sym(card.suit)}
      </div>
      <div className={`flex flex-col items-end leading-none rotate-180 ${color} p-[3px]`}>
        <span style={{ fontSize: fs.r }} className="font-bold">{rl(card.rank)}</span>
        <span style={{ fontSize: fs.s }} className="mt-px">{sym(card.suit)}</span>
      </div>
    </div>
  )
}

function EmptyPile({ cw, ch, label, highlighted, green }: {
  cw: number; ch: number; label?: string; highlighted?: boolean; green?: boolean
}) {
  return (
    <div
      style={{ width: cw, height: ch, fontSize: cw < 48 ? '11px' : '14px', flexShrink: 0 }}
      className={[
        'rounded-lg border-2 border-dashed flex items-center justify-center',
        'font-medium select-none transition-colors',
        highlighted
          ? 'border-blush-400 bg-blush-50/20'
          : green
          ? 'border-white/15 text-white/20'
          : 'border-blush-200 dark:border-mauve-700 text-mauve-300 dark:text-mauve-600',
      ].join(' ')}
    >
      {label}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SolitaireView() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [game, setGame] = useState<Game>(freshDeal)
  const [history, setHistory] = useState<Game[]>([])
  const [sel, setSel] = useState<{ cards: Card[]; loc: Loc } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [autoCompleting, setAutoCompleting] = useState(false)

  const [dragging, setDragging] = useState(false)
  const [ghostCards, setGhostCards] = useState<Card[]>([])
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const [dimmedIds, setDimmedIds] = useState<Set<string>>(new Set())
  const [hlDrop, setHlDrop] = useState<string | null>(null)

  const dragRef = useRef<{
    cards: Card[]; source: Loc
    startX: number; startY: number; ox: number; oy: number; active: boolean
  } | null>(null)
  const justDraggedRef = useRef(false)
  const gameRef = useRef(game)
  gameRef.current = game

  const foundRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
  const tabRefs = useRef<(HTMLDivElement | null)[]>(Array(7).fill(null))

  // ── Container-based responsive sizing (no horizontal scroll) ───────────────
  const boardRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<Dims>({ CW: 42, CH: 60, GAP: 4, FD: 9, FU: 16 })

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w === 0) return
      const gap = w < 300 ? 2 : w < 400 ? 3 : w < 550 ? 5 : 8
      const cw = Math.floor((w - 6 * gap) / 7)
      const ch = Math.round(cw * 1.44)
      const fd = Math.max(7, Math.round(cw * 0.22))
      const fu = Math.max(12, Math.round(cw * 0.38))
      setDims({ CW: Math.max(28, cw), CH: Math.max(40, ch), GAP: gap, FD: fd, FU: fu })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { CW, CH, GAP, FD, FU } = dims

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || game.won) return
    const id = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [running, game.won])

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── History (undo) ─────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    setHistory(h => [...h, gameRef.current])
  }, [])

  function undo() {
    if (history.length === 0 || autoCompleting) return
    const prev = history[history.length - 1]
    setGame(prev)
    setHistory(h => h.slice(0, -1))
    setSel(null)
  }

  // ── Move helpers ───────────────────────────────────────────────────────────
  const doMoveToTab = useCallback((cards: Card[], loc: Loc, ci: number) => {
    setGame(g => {
      if (loc.zone === 'tableau' && loc.col === ci) return g
      if (!canTab(cards[0], g.tableau[ci])) return g
      if (!sourceMatches(g, loc, cards)) return g

      const { tableau, foundations, waste, revealed } = removeFrom(g, loc, cards.length)
      tableau[ci] = [...tableau[ci], ...cards]
      let pts = loc.zone === 'waste' ? PTS_WASTE_TO_TAB : 0
      if (loc.zone === 'foundation') pts += PTS_FROM_FOUND
      if (revealed) pts += PTS_REVEAL

      return {
        ...g, tableau, foundations, waste,
        moves: g.moves + 1, score: Math.max(0, g.score + pts), won: isWon(foundations),
      }
    })
    setSel(null)
  }, [])

  const doMoveToFound = useCallback((cards: Card[], loc: Loc, pi: number) => {
    setGame(g => {
      if (!canFound(cards[0], g.foundations[pi])) return g
      if (!sourceMatches(g, loc, cards)) return g

      const { tableau, foundations, waste, revealed } = removeFrom(g, loc, cards.length)
      foundations[pi] = [...foundations[pi], ...cards]
      let pts = PTS_TO_FOUND
      if (revealed) pts += PTS_REVEAL

      return {
        ...g, tableau, foundations, waste,
        moves: g.moves + 1, score: Math.max(0, g.score + pts), won: isWon(foundations),
      }
    })
    setSel(null)
  }, [])

  // ── Drag & Drop ────────────────────────────────────────────────────────────
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
        setRunning(true); setSel(null); setDragging(true)
        setGhostCards(d.cards)
        setDimmedIds(new Set(d.cards.map(c => c.id)))
        pushHistory()
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
      if (!zone) { setHistory(h => h.length > 0 ? h.slice(0, -1) : h); return }
      if (zone.type === 'tab') doMoveToTab(d.cards, d.source, zone.index)
      else if (zone.type === 'found' && d.cards.length === 1) doMoveToFound(d.cards, d.source, zone.index)
      else setHistory(h => h.length > 0 ? h.slice(0, -1) : h)
    }

    function onCancel() {
      const d = dragRef.current
      dragRef.current = null
      setDragging(false); setGhostCards([]); setDimmedIds(new Set()); setHlDrop(null)
      if (d?.active) setHistory(h => h.length > 0 ? h.slice(0, -1) : h)
    }

    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
  }, [doMoveToTab, doMoveToFound, pushHistory])

  function startDrag(cards: Card[], source: Loc, e: React.PointerEvent<HTMLDivElement>) {
    if (autoCompleting) return
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      cards, source,
      startX: e.clientX, startY: e.clientY,
      ox: e.clientX - rect.left, oy: e.clientY - rect.top,
      active: false,
    }
  }

  // ── Auto-complete ──────────────────────────────────────────────────────────
  // Triggers only when stock & waste are empty and all tableau cards face-up.
  // This guarantees all remaining cards are in tableau and always reachable.
  useEffect(() => {
    if (!autoCompleting) return
    const progress = { made: false }

    const interval = setInterval(() => {
      progress.made = false

      setGame(g => {
        if (g.won) return g

        // Try each tableau top → foundation
        for (let ci = 0; ci < 7; ci++) {
          if (g.tableau[ci].length === 0) continue
          const top = g.tableau[ci][g.tableau[ci].length - 1]
          const pi = bestFoundPile(top, g.foundations)
          if (pi >= 0) {
            const tableau = g.tableau.map(c => [...c])
            tableau[ci] = tableau[ci].slice(0, -1)
            const foundations = g.foundations.map(p => [...p])
            foundations[pi] = [...foundations[pi], top]
            progress.made = true
            return { ...g, tableau, foundations, moves: g.moves + 1, score: g.score + PTS_TO_FOUND, won: isWon(foundations) }
          }
        }

        return g // No moves — updater stays pure
      })

      // Stop outside the updater (pure side-effect boundary)
      if (!progress.made) setAutoCompleting(false)
    }, 100)

    return () => clearInterval(interval)
  }, [autoCompleting])

  // Stop auto-complete when game is won
  useEffect(() => {
    if (game.won && autoCompleting) setAutoCompleting(false)
  }, [game.won, autoCompleting])

  const showAutoComplete = !game.won && !autoCompleting &&
    game.stock.length === 0 && game.waste.length === 0 &&
    game.tableau.every(col => col.every(c => c.faceUp)) &&
    game.tableau.some(c => c.length > 0)

  // ── Game actions ───────────────────────────────────────────────────────────
  function newGame() {
    dragRef.current = null
    setGame(freshDeal()); setHistory([]); setSel(null)
    setElapsed(0); setRunning(false); setAutoCompleting(false)
    setDragging(false); setGhostCards([]); setDimmedIds(new Set())
  }

  function drawStock(e: React.MouseEvent) {
    if (autoCompleting) return
    e.stopPropagation()
    pushHistory(); setRunning(true); setSel(null)
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
    if (autoCompleting) return
    e.stopPropagation()
    if (justDraggedRef.current) return
    setRunning(true)
    const top = game.waste[game.waste.length - 1]; if (!top) return
    if (sel?.loc.zone === 'waste') { setSel(null); return }
    setSel({ cards: [top], loc: { zone: 'waste' } })
  }

  function dblWaste(e: React.MouseEvent) {
    if (autoCompleting) return
    e.stopPropagation()
    const top = game.waste[game.waste.length - 1]; if (!top) return
    const pile = bestFoundPile(top, game.foundations)
    if (pile >= 0) { pushHistory(); doMoveToFound([top], { zone: 'waste' }, pile) }
  }

  function clickFound(pi: number, e: React.MouseEvent) {
    if (autoCompleting) return
    e.stopPropagation()
    if (justDraggedRef.current) return
    setRunning(true)
    if (sel) {
      if (sel.cards.length === 1) { pushHistory(); doMoveToFound(sel.cards, sel.loc, pi) }
      else setSel(null)
      return
    }
    const top = game.foundations[pi][game.foundations[pi].length - 1]
    if (top) setSel({ cards: [top], loc: { zone: 'foundation', pile: pi } })
  }

  function clickTabCard(ci: number, ri: number, e: React.MouseEvent) {
    if (autoCompleting) return
    e.stopPropagation()
    if (justDraggedRef.current) return
    setRunning(true)
    const col = game.tableau[ci]
    const card = col[ri]

    if (!card.faceUp) {
      if (ri === col.length - 1 && !sel) {
        pushHistory()
        setGame(g => {
          const t = g.tableau.map(c => [...c])
          t[ci][ri] = { ...t[ci][ri], faceUp: true }
          return { ...g, tableau: t, moves: g.moves + 1, score: Math.max(0, g.score + PTS_REVEAL) }
        })
      }
      return
    }

    if (sel) {
      if (sel.loc.zone === 'tableau' && sel.loc.col === ci && sel.loc.fromRow === ri) {
        setSel(null); return
      }
      pushHistory()
      doMoveToTab(sel.cards, sel.loc, ci)
      return
    }

    setSel({ cards: col.slice(ri), loc: { zone: 'tableau', col: ci, fromRow: ri } })
  }

  function dblTabCard(ci: number, ri: number, e: React.MouseEvent) {
    if (autoCompleting) return
    e.stopPropagation()
    const col = game.tableau[ci]
    const card = col[ri]
    if (!card.faceUp || ri !== col.length - 1) return
    const pile = bestFoundPile(card, game.foundations)
    if (pile >= 0) { pushHistory(); doMoveToFound([card], { zone: 'tableau', col: ci, fromRow: ri }, pile) }
  }

  function clickTabCol(ci: number) {
    if (autoCompleting) return
    if (sel) { pushHistory(); doMoveToTab(sel.cards, sel.loc, ci) }
  }

  // ── Position helpers ───────────────────────────────────────────────────────
  function cardTop(col: Card[], ri: number): number {
    return col.slice(0, ri).reduce((acc, c) => acc + (c.faceUp ? FU : FD), 0)
  }
  function colHeight(col: Card[]): number {
    if (col.length === 0) return CH
    return cardTop(col, col.length - 1) + CH
  }

  const isSel = (c: Card) => sel?.cards.some(s => s.id === c.id) ?? false

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-view-in select-none max-w-3xl mx-auto" onClick={() => setSel(null)}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-plum-800 dark:text-mauve-100">
            Solitaire
          </h1>
          <p className="text-[11px] sm:text-sm text-mauve-400 mt-0.5">Klondike · draw 1</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm text-mauve-400 tabular-nums">
            <span className="flex items-center gap-1" title="Score">
              <Star size={12} className="text-amber-500" />{game.score}
            </span>
            <span className="hidden sm:flex items-center gap-1"><Hash size={12} />{game.moves}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{fmt(elapsed)}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); undo() }}
            disabled={history.length === 0 || autoCompleting}
            className="p-2 rounded-xl text-mauve-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-30"
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); newGame() }}
            className="btn-ghost flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3"
          >
            <RotateCcw size={13} /> New
          </button>
        </div>
      </div>

      {/* Win banner */}
      {game.won && (
        <div className="mb-4 card p-6 text-center animate-modal-in">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mx-auto mb-3">
            <Trophy size={24} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-plum-800 dark:text-mauve-100 mb-1">You won!</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-mauve-400 mb-4">
            <span>Score: {game.score}</span>
            <span>{game.moves} moves</span>
            <span>{fmt(elapsed)}</span>
          </div>
          <button onClick={e => { e.stopPropagation(); newGame() }} className="btn-primary">Play again</button>
        </div>
      )}

      {/* Board — green felt */}
      <div
        ref={boardRef}
        className="rounded-2xl bg-emerald-800 dark:bg-emerald-900 p-3 sm:p-5 border border-emerald-700/50 dark:border-emerald-800/50 shadow-card"
      >
        {/* Top row: stock · waste · spacer · foundations */}
        <div className="flex items-start" style={{ gap: GAP }}>
          {/* Stock */}
          <div style={{ width: CW, flexShrink: 0 }}>
            {game.stock.length > 0 ? (
              <div onClick={drawStock} style={{ touchAction: 'none' }} className="cursor-pointer hover:opacity-90 transition-opacity">
                <CardBack cw={CW} ch={CH} />
              </div>
            ) : (
              <div
                onClick={drawStock}
                style={{ width: CW, height: CH }}
                className="rounded-lg border-2 border-dashed border-white/15 flex items-center justify-center cursor-pointer hover:border-white/25 transition-colors"
              >
                <RotateCcw size={Math.max(12, Math.round(CW * 0.25))} className="text-white/25" />
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
              <EmptyPile cw={CW} ch={CH} green />
            )}
          </div>

          {/* Spacer (aligns with tableau column 3) */}
          <div style={{ width: CW, flexShrink: 0 }} />

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
                      card={top} cw={CW} ch={CH}
                      selected={sel?.loc.zone === 'foundation' && sel.loc.pile === pi}
                      onPointerDown={e => startDrag([top], { zone: 'foundation', pile: pi }, e)}
                    />
                    {hl && (
                      <div style={{ position: 'absolute', inset: 0 }} className="rounded-lg ring-2 ring-blush-400 pointer-events-none" />
                    )}
                  </>
                ) : (
                  <EmptyPile cw={CW} ch={CH} label={FOUND_LABELS[pi]} highlighted={hl} green />
                )}
              </div>
            )
          })}
        </div>

        {/* Tableau */}
        <div className="flex items-start mt-3 sm:mt-4" style={{ gap: GAP }}>
          {game.tableau.map((col, ci) => {
            const colH = colHeight(col)
            const hl = hlDrop === `tab-${ci}`
            return (
              <div
                key={ci}
                ref={el => { tabRefs.current[ci] = el }}
                style={{ width: CW, height: Math.max(CH, colH), flexShrink: 0, position: 'relative' }}
                onClick={() => clickTabCol(ci)}
                className={hl ? 'rounded-lg ring-2 ring-blush-400' : ''}
              >
                {col.length === 0 ? (
                  <EmptyPile cw={CW} ch={CH} highlighted={hl} green />
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

      {/* Auto-complete button */}
      {showAutoComplete && (
        <div className="mt-3 text-center animate-view-in">
          <button
            onClick={e => { e.stopPropagation(); pushHistory(); setAutoCompleting(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <Zap size={14} /> Auto Complete
          </button>
        </div>
      )}

      {/* Instructions */}
      {!game.won && (
        <p className="text-center text-[10px] sm:text-[11px] text-mauve-300 dark:text-mauve-600 mt-3">
          Drag or tap to move · double-tap to send to foundation
        </p>
      )}

      {/* Drag ghost */}
      {dragging && ghostCards.length > 0 && (
        <div
          style={{
            position: 'fixed', left: ghostPos.x, top: ghostPos.y,
            zIndex: 9999, pointerEvents: 'none', userSelect: 'none',
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
