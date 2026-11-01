package tz.risktaker.drafti

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import tz.risktaker.drafti.engine.Ai
import tz.risktaker.drafti.engine.Rules

/**
 * Port of the web UI's game state machine (scripts/web/ui.js): selection with
 * click-steered multi-jumps, forced-capture awareness, draw counters, and a
 * background AI on Dispatchers.Default.
 */
class GameViewModel : ViewModel() {

    data class HistoryEntry(
        val notation: String,
        val side: Int,
        val move: Rules.Move,
        val boardBefore: IntArray,
        val noProgBefore: Int,
    )

    data class GameState(
        val rs: Rules.Ruleset = Rules.AMERICAN,
        val sqn: IntArray = Rules.squareNumbers(Rules.AMERICAN),
        val board: IntArray = Rules.setupBoard(Rules.AMERICAN),
        val side: Int = Rules.AMERICAN.firstSide,
        val noProg: Int = 0,
        val history: List<HistoryEntry> = emptyList(),
        val legal: List<Rules.Move> = emptyList(),
        val selected: Int? = null,
        val partial: List<Int> = emptyList(),
        val over: Boolean = false,
        val resultText: String? = null,
        val thinking: Boolean = false,
        val hint: Rules.Move? = null,
        val lastMove: Rules.Move? = null,
        val mode: String = "ai",          // "ai" | "hotseat"
        val humanSide: Int = Rules.IVORY,
        val diff: String = "medium",      // easy | medium | hard
    ) {
        fun humanTurn(): Boolean = !over && (mode == "hotseat" || side == humanSide)
    }

    private val repMap = mutableMapOf<String, Int>()
    private var searchJob: Job? = null
    private var searchId = 0

    private val _state = MutableStateFlow(GameState())
    val state: StateFlow<GameState> = _state.asStateFlow()

    fun newGame(rsId: String, mode: String, diff: String, humanSide: Int) {
        searchJob?.cancel()
        searchId++
        val rs = Rules.byId(rsId)
        val board = Rules.setupBoard(rs)
        repMap.clear()
        repMap[posKey(board, rs.firstSide)] = 1
        _state.value = GameState(
            rs = rs,
            sqn = Rules.squareNumbers(rs),
            board = board,
            side = rs.firstSide,
            legal = Rules.legalMoves(rs, board, rs.firstSide),
            mode = mode,
            humanSide = humanSide,
            diff = diff,
        )
        scheduleAi()
    }

    fun undo() {
        val s = _state.value
        if (s.history.isEmpty() || s.over) return
        searchJob?.cancel()
        searchId++
        var board = s.board
        var side = s.side
        var noProg = s.noProg
        var steps = if (s.mode == "ai" && side == s.humanSide && s.history.size >= 2) 2 else 1
        repMap.remove(posKey(board, side))
        var history = s.history
        while (steps > 0 && history.isNotEmpty()) {
            val h = history.last()
            board = h.boardBefore
            side = h.side
            noProg = h.noProgBefore
            history = history.dropLast(1)
            steps--
        }
        _state.value = s.copy(
            board = board, side = side, noProg = noProg, history = history,
            legal = Rules.legalMoves(s.rs, board, side),
            selected = null, partial = emptyList(), over = false, resultText = null,
            thinking = false, hint = null,
            lastMove = history.lastOrNull()?.move,
        )
    }

    fun clearHint() {
        if (_state.value.hint != null) _state.value = _state.value.copy(hint = null)
    }

    /** Tap on a square; mirrors onSquareClick in ui.js. */
    fun tap(sq: Int) {
        val s = _state.value
        if (s.over || s.thinking) return
        if (!s.humanTurn()) return
        val code = s.board[sq]
        val sel = s.selected
        if (sel == null) {
            if (code * s.side > 0) select(sq)
            return
        }
        if (sq == sel) { clearSelection(); return }
        if (code * s.side > 0) { select(sq); return } // switch pieces
        val k = s.partial.size
        val next = s.legal.filter { m ->
            m.path.size > k && m.path[k] == sq && s.partial.indices.all { m.path[it] == s.partial[it] }
        }
        if (next.isEmpty()) return
        val partial = s.partial + sq
        val done = next.firstOrNull { it.path.size == partial.size }
        if (done != null) {
            _state.value = s.copy(selected = null, partial = emptyList())
            executeMove(done)
        } else {
            _state.value = s.copy(partial = partial, legal = next)
        }
    }

    private fun select(sq: Int) {
        val s = _state.value
        val cands = s.legal.filter { it.from == sq }
        if (cands.isEmpty()) return
        _state.value = s.copy(selected = sq, partial = listOf(sq), legal = cands)
    }

    private fun clearSelection() {
        val s = _state.value
        _state.value = s.copy(
            selected = null, partial = emptyList(),
            legal = Rules.legalMoves(s.rs, s.board, s.side),
        )
    }

    private fun executeMove(mv: Rules.Move) {
        var s = _state.value
        s = commit(s, mv)
        s = checkGameEnd(s)
        _state.value = s
        if (!s.over) scheduleAi()
    }

    private fun posKey(b: IntArray, side: Int): String = b.joinToString(",") + "|" + side

    private fun commit(s: GameState, mv: Rules.Move): GameState {
        val entry = HistoryEntry(
            notation = Rules.moveToNotation(s.rs, s.sqn, mv),
            side = s.side,
            move = mv,
            boardBefore = s.board.copyOf(),
            noProgBefore = s.noProg,
        )
        val board = Rules.applyMove(s.rs, s.board, mv, s.side)
        val noProg = Rules.nextNoProgress(s.board, mv, s.noProg)
        val side = -s.side
        repMap[posKey(board, side)] = (repMap[posKey(board, side)] ?: 0) + 1
        return s.copy(
            board = board, side = side, noProg = noProg,
            history = s.history + entry,
            legal = Rules.legalMoves(s.rs, board, side),
            selected = null, partial = emptyList(), hint = null,
            lastMove = mv,
        )
    }

    private fun checkGameEnd(s: GameState): GameState {
        val oppCount = s.board.count { it * s.side > 0 }
        return when {
            !s.legal.any() -> s.copy(
                over = true,
                resultText = if (oppCount == 0)
                    (if (s.side == Rules.IVORY) "Ebony" else "Ivory") + " wins — every piece captured"
                else
                    (if (s.side == Rules.IVORY) "Ebony" else "Ivory") + " wins — opponent has no moves",
            )
            s.noProg >= s.rs.drawPlies -> s.copy(
                over = true,
                resultText = "Draw — " + (if (s.rs.flyingKings) "25" else "40") +
                    " moves per side without progress",
            )
            (repMap[posKey(s.board, s.side)] ?: 0) >= 3 -> s.copy(
                over = true, resultText = "Draw — threefold repetition",
            )
            else -> s
        }
    }

    private fun scheduleAi() {
        val s = _state.value
        if (s.over || s.mode != "ai" || s.side == s.humanSide) return
        _state.value = s.copy(thinking = true)
        val id = ++searchId
        searchJob = viewModelScope.launch {
            val result = withContext(Dispatchers.Default) {
                Ai.search(s.rs, s.board, s.side, Ai.difficulty(s.diff).copy(noProgress = s.noProg))
            }
            delay(450) // keep the computer's move from feeling instant
            val cur = _state.value
            if (id != searchId || cur.over) return@launch
            val mv = result.best?.let { best ->
                cur.legal.firstOrNull {
                    it.from == best.from && it.path == best.path && it.caps == best.caps
                }
            } ?: cur.legal.firstOrNull()
            if (mv != null) {
                var ns = cur.copy(thinking = false)
                ns = commit(ns, mv)
                ns = checkGameEnd(ns)
                _state.value = ns
            } else {
                _state.value = cur.copy(thinking = false)
            }
        }
    }

    /** Ask the engine for a suggestion (human's turn only). */
    fun hint() {
        val s = _state.value
        if (s.over || s.thinking || !s.humanTurn() || s.legal.none()) return
        _state.value = s.copy(thinking = true)
        val id = ++searchId
        searchJob = viewModelScope.launch {
            val result = withContext(Dispatchers.Default) {
                Ai.search(s.rs, s.board, s.side, Ai.Config(budgetMs = 600, maxDepth = 12))
            }
            val cur = _state.value
            if (id != searchId) return@launch
            _state.value = cur.copy(thinking = false, hint = result.best)
        }
    }
}
