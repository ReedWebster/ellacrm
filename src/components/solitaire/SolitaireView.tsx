import { useState, useEffect } from 'react'
import { RotateCcw, Trophy, Clock, Hash } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

interface Card {
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

type Loc =
  | { zone: 'waste' }
  | { zone: 'foundation'; pile: number }
  | { zone: 'tableau'; col: number; fromRow: number }

interface Selection {
  cards: Card[]
  loc: Loc
}

interface Game {
  stock: Card[]
  waste: Card[]
  foundations: Card[][]
  tableau: Card[][]
  moves: number
  won: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const isRed = (s: Suit) => s === 'hearts' || s === 'diamonds'

const rankLabel = (r: Rank): string => {
  if (r === 1) return 'A'
  if (r === 11) return 'J'
  if (r === 12) return 'Q'
  if (r === 13) return 'K'
  return String(r)
}

const suitSymbol = (s: Suit): string =>
  ({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as const)[s]

function shuffledDeck(): Card[] {
  const cards: Card[] = SUITS.flatMap(suit =>
    Array.from({ length: 13 }, (_, i) => ({
      id: `${suit}-${i + 1}`,
      suit,
      rank: (i + 1) as Rank,
      faceUp: false,
    }))
  )
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

function deal(): Game {
  const deck = shuffledDeck()
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let i = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ ...deck[i++], faceUp: row === col })
    }
  }
  return {
    stock: deck.slice(i),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    won: false,
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
    : pile[pile.length - 1].suit === card.suit &&
      card.rank === pile[pile.length - 1].rank + 1

const isWon = (foundations: Card[][]): boolean =>
  foundations.every(p => p.length === 13)

function autoFoundPile(card: Card, foundations: Card[][]): number {
  return foundations.findIndex(p => canFound(card, p))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardBack() {
  return (
    <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-blush-400 to-blush-600 dark:from-mauve-600 dark:to-mauve-700 flex items-center justify-center shadow-sm">
      <div className="w-[76%] h-[76%] rounded-lg border-2 border-white/30 flex items-center justify-center">
        <div className="w-[52%] h-[52%] rounded border border-white/25 bg-white/10" />
      </div>
    </div>
  )
}

interface CardFaceProps {
  card: Card
  selected?: boolean
  dimmed?: boolean
  onClick?: (e: React.MouseEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void
}

function CardFace({ card, selected, dimmed, onClick, onDoubleClick }: CardFaceProps) {
  const red = isRed(card.suit)
  const color = red
    ? 'text-rose-500 dark:text-rose-400'
    : 'text-plum-900 dark:text-mauve-100'

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`
        w-full h-full rounded-[10px] flex flex-col p-[5px] select-none cursor-pointer
        bg-white dark:bg-mauve-800
        border border-black/[0.07] dark:border-white/[0.07]
        shadow-sm transition-all duration-100
        ${selected
          ? 'ring-2 ring-blush-500 dark:ring-blush-400 shadow-md -translate-y-1'
          : 'hover:shadow-md hover:-translate-y-0.5'}
        ${dimmed ? 'opacity-50' : ''}
      `}
    >
      {/* Top-left */}
      <div className={`flex flex-col items-start leading-none ${color}`}>
        <span className="text-[11px] font-bold">{rankLabel(card.rank)}</span>
        <span className="text-[9px] mt-[1px]">{suitSymbol(card.suit)}</span>
      </div>
      {/* Center symbol */}
      <div className={`flex-1 flex items-center justify-center text-[22px] leading-none ${color}`}>
        {suitSymbol(card.suit)}
      </div>
      {/* Bottom-right (rotated) */}
      <div className={`flex flex-col items-end leading-none rotate-180 ${color}`}>
        <span className="text-[11px] font-bold">{rankLabel(card.rank)}</span>
        <span className="text-[9px] mt-[1px]">{suitSymbol(card.suit)}</span>
      </div>
    </div>
  )
}

function EmptySlot({
  label,
  onClick,
}: {
  label?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="
        w-full h-full rounded-[10px]
        border-2 border-dashed border-blush-200 dark:border-mauve-700
        flex items-center justify-center cursor-pointer
        hover:border-blush-300 dark:hover:border-mauve-600
        transition-colors text-[11px] font-medium
        text-mauve-300 dark:text-mauve-600 select-none
      "
    >
      {label}
    </div>
  )
}

// ─── Card dimensions ──────────────────────────────────────────────────────────
// Fixed size; board scrolls horizontally on small screens
const CW = 64  // card width px
const CH = 96  // card height px
const GAP = 10 // gap between columns px

// Tableau stacking offsets (how much of the card is visible above the next card)
const OFFSET_DOWN = 16  // face-down: show 16px
const OFFSET_UP = 28    // face-up: show 28px

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SolitaireView() {
  const [game, setGame] = useState<Game>(deal)
  const [sel, setSel] = useState<Selection | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  // Timer
  useEffect(() => {
    if (!running || game.won) return
    const id = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [running, game.won])

  const startTimer = () => { if (!running) setRunning(true) }

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  function newGame() {
    setGame(deal())
    setSel(null)
    setElapsed(0)
    setRunning(false)
  }

  // ── Draw from stock ────────────────────────────────────────────────────────

  function handleStock() {
    startTimer()
    setSel(null)
    setGame(g => {
      if (!g.stock.length) {
        if (!g.waste.length) return g
        return {
          ...g,
          stock: [...g.waste].reverse().map(c => ({ ...c, faceUp: false })),
          waste: [],
        }
      }
      const card = { ...g.stock[g.stock.length - 1], faceUp: true }
      return { ...g, stock: g.stock.slice(0, -1), waste: [...g.waste, card] }
    })
  }

  // ── Waste ──────────────────────────────────────────────────────────────────

  function handleWasteClick(e: React.MouseEvent) {
    e.stopPropagation()
    startTimer()
    const top = game.waste[game.waste.length - 1]
    if (!top) return
    if (sel?.loc.zone === 'waste') { setSel(null); return }
    setSel({ cards: [top], loc: { zone: 'waste' } })
  }

  function handleWasteDbl(e: React.MouseEvent) {
    e.stopPropagation()
    const top = game.waste[game.waste.length - 1]
    if (!top) return
    const pile = autoFoundPile(top, game.foundations)
    if (pile >= 0) doMoveToFound(pile, [top], { zone: 'waste' })
  }

  // ── Foundations ────────────────────────────────────────────────────────────

  function handleFoundationClick(pile: number) {
    startTimer()
    if (sel) {
      if (sel.cards.length === 1) doMoveToFound(pile, sel.cards, sel.loc)
      else setSel(null)
      return
    }
    const top = game.foundations[pile][game.foundations[pile].length - 1]
    if (top) setSel({ cards: [top], loc: { zone: 'foundation', pile } })
  }

  // ── Tableau ────────────────────────────────────────────────────────────────

  function handleTableauCardClick(ci: number, ri: number, e: React.MouseEvent) {
    e.stopPropagation()
    startTimer()
    const col = game.tableau[ci]
    const card = col[ri]

    if (sel) {
      // If clicking the already-selected source card, deselect
      if (sel.loc.zone === 'tableau' && sel.loc.col === ci && sel.loc.fromRow === ri) {
        setSel(null)
        return
      }
      doMoveToTab(ci)
      return
    }

    if (!card.faceUp) {
      // Flip top face-down card
      if (ri === col.length - 1) {
        setGame(g => {
          const tab = g.tableau.map(c => [...c])
          tab[ci][ri] = { ...tab[ci][ri], faceUp: true }
          return { ...g, tableau: tab, moves: g.moves + 1 }
        })
      }
      return
    }

    // Select from this card down
    setSel({ cards: col.slice(ri), loc: { zone: 'tableau', col: ci, fromRow: ri } })
  }

  function handleTableauCardDbl(ci: number, ri: number, e: React.MouseEvent) {
    e.stopPropagation()
    const col = game.tableau[ci]
    const card = col[ri]
    // Only auto-move the topmost face-up card
    if (!card.faceUp || ri !== col.length - 1) return
    const pile = autoFoundPile(card, game.foundations)
    if (pile >= 0) doMoveToFound(pile, [card], { zone: 'tableau', col: ci, fromRow: ri })
  }

  function handleEmptyColClick(ci: number) {
    startTimer()
    if (sel) doMoveToTab(ci)
  }

  // ── Move helpers ───────────────────────────────────────────────────────────

  function removeFromSource(
    g: Game,
    loc: Loc,
    cards: Card[]
  ): Pick<Game, 'tableau' | 'waste' | 'foundations'> {
    const tab = g.tableau.map(c => [...c])
    const founds = g.foundations.map(p => [...p])
    let waste = [...g.waste]

    if (loc.zone === 'waste') {
      waste = waste.slice(0, -1)
    } else if (loc.zone === 'tableau') {
      tab[loc.col] = tab[loc.col].slice(0, loc.fromRow)
      // Flip new top of source column
      if (tab[loc.col].length > 0) {
        const last = tab[loc.col].length - 1
        tab[loc.col][last] = { ...tab[loc.col][last], faceUp: true }
      }
    } else if (loc.zone === 'foundation') {
      founds[loc.pile] = founds[loc.pile].slice(0, -cards.length)
    }

    return { tableau: tab, waste, foundations: founds }
  }

  function doMoveToTab(ci: number) {
    if (!sel) return
    const { cards, loc } = sel

    // Same column → deselect
    if (loc.zone === 'tableau' && loc.col === ci) { setSel(null); return }

    if (!canTab(cards[0], game.tableau[ci])) { setSel(null); return }

    setGame(g => {
      const { tableau, waste, foundations } = removeFromSource(g, loc, cards)
      tableau[ci] = [...tableau[ci], ...cards]
      const won = isWon(foundations)
      return { ...g, tableau, waste, foundations, moves: g.moves + 1, won }
    })
    setSel(null)
  }

  function doMoveToFound(pile: number, cards: Card[], loc: Loc) {
    if (!canFound(cards[0], game.foundations[pile])) { setSel(null); return }

    setGame(g => {
      const { tableau, waste, foundations } = removeFromSource(g, loc, cards)
      foundations[pile] = [...foundations[pile], ...cards]
      const won = isWon(foundations)
      return { ...g, tableau, waste, foundations, moves: g.moves + 1, won }
    })
    setSel(null)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isSel = (card: Card) => sel?.cards.some(c => c.id === card.id) ?? false

  // Foundation suit labels for empty piles
  const FOUND_LABELS = ['♥', '♦', '♣', '♠']

  // Board total width for horizontal scroll
  const boardW = CW * 7 + GAP * 6

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="p-4 sm:p-6 animate-view-in select-none"
      onClick={() => setSel(null)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-plum-800 dark:text-mauve-100">
            Solitaire
          </h1>
          <p className="text-sm text-mauve-400 mt-0.5">Klondike · draw 1</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-5 text-sm text-mauve-400">
            <span className="flex items-center gap-1.5 tabular-nums">
              <Hash size={13} />
              {game.moves}
            </span>
            <span className="flex items-center gap-1.5 tabular-nums">
              <Clock size={13} />
              {fmt(elapsed)}
            </span>
          </div>
          <button onClick={newGame} className="btn-ghost flex items-center gap-1.5 text-sm">
            <RotateCcw size={14} />
            New game
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
          <p className="text-sm text-mauve-400 mb-4">
            {game.moves} moves · {fmt(elapsed)}
          </p>
          <button onClick={newGame} className="btn-primary">
            Play again
          </button>
        </div>
      )}

      {/* Game board */}
      <div className="card p-4 sm:p-5 overflow-x-auto">
        <div style={{ minWidth: boardW }}>

          {/* ── Top row: stock · waste · spacer · foundations ── */}
          <div
            className="flex items-start mb-4"
            style={{ gap: GAP }}
          >
            {/* Stock */}
            <div style={{ width: CW, height: CH, flexShrink: 0 }}>
              {game.stock.length > 0 ? (
                <div
                  onClick={e => { e.stopPropagation(); handleStock() }}
                  style={{ width: CW, height: CH }}
                  className="cursor-pointer hover:opacity-90 transition-opacity rounded-[10px]"
                >
                  <CardBack />
                </div>
              ) : (
                <EmptySlot
                  label="↺"
                  onClick={handleStock}
                />
              )}
            </div>

            {/* Waste */}
            <div style={{ width: CW, height: CH, flexShrink: 0 }}>
              {game.waste.length > 0 ? (
                <CardFace
                  card={game.waste[game.waste.length - 1]}
                  selected={sel?.loc.zone === 'waste'}
                  onClick={handleWasteClick}
                  onDoubleClick={handleWasteDbl}
                />
              ) : (
                <EmptySlot />
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Foundations */}
            {game.foundations.map((pile, pi) => {
              const top = pile[pile.length - 1]
              return (
                <div key={pi} style={{ width: CW, height: CH, flexShrink: 0 }}>
                  {top ? (
                    <CardFace
                      card={top}
                      selected={sel?.loc.zone === 'foundation' && sel.loc.pile === pi}
                      onClick={e => { e.stopPropagation(); handleFoundationClick(pi) }}
                    />
                  ) : (
                    <EmptySlot
                      label={FOUND_LABELS[pi]}
                      onClick={() => handleFoundationClick(pi)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Tableau ── */}
          <div className="flex items-start" style={{ gap: GAP }}>
            {game.tableau.map((col, ci) => {
              // Column height: first card full, then each additional card adds its visible strip
              const colH = col.length === 0
                ? CH
                : CH + col.slice(1).reduce((acc, c) => acc + (c.faceUp ? OFFSET_UP : OFFSET_DOWN), 0)

              return (
                <div
                  key={ci}
                  style={{ width: CW, height: colH, flexShrink: 0, position: 'relative' }}
                  onClick={() => handleEmptyColClick(ci)}
                >
                  {col.length === 0 ? (
                    <EmptySlot onClick={() => handleEmptyColClick(ci)} />
                  ) : (
                    col.map((card, ri) => {
                      const offsetTop = ri === 0
                        ? 0
                        : col.slice(1, ri + 1).reduce(
                            (acc, c) => acc + (c.faceUp ? OFFSET_UP : OFFSET_DOWN),
                            0
                          )

                      return (
                        <div
                          key={card.id}
                          style={{
                            position: 'absolute',
                            top: offsetTop,
                            left: 0,
                            width: CW,
                            height: CH,
                            zIndex: ri + 1,
                          }}
                          onClick={e => handleTableauCardClick(ci, ri, e)}
                          onDoubleClick={e => handleTableauCardDbl(ci, ri, e)}
                        >
                          {card.faceUp ? (
                            <CardFace
                              card={card}
                              selected={isSel(card)}
                            />
                          ) : (
                            <div style={{ width: CW, height: CH }} className="rounded-[10px] cursor-pointer">
                              <CardBack />
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
        <span className="flex items-center gap-1.5 tabular-nums">
          <Hash size={13} />
          {game.moves} moves
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <Clock size={13} />
          {fmt(elapsed)}
        </span>
      </div>

      {/* Instructions */}
      <p className="text-center text-[11px] text-mauve-300 dark:text-mauve-600 mt-4">
        Click to select · click destination to move · double-click to auto-send to foundation
      </p>
    </div>
  )
}
