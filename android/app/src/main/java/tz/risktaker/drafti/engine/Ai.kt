package tz.risktaker.drafti.engine

import kotlin.math.abs
import kotlin.math.max
import kotlin.random.Random

/**
 * Negamax + alpha-beta with iterative deepening and a small transposition
 * table — the Android counterpart of the search in web/engine.js.
 *
 * Run on a background dispatcher (see GameViewModel); the search honours its
 * millisecond budget and always returns a legal move.
 */
object Ai {

    class Result(
        val best: Rules.Move?,
        val score: Int,
        val depth: Int,
        val nodes: Int,
        val rootScores: List<Pair<Rules.Move, Int>>,
    )

    data class Config(
        val budgetMs: Long = 400,
        val maxDepth: Int = 16,
        val jitter: Int = 0,
        val noProgress: Int = 0,
    )

    private class TtEntry(val depth: Int, val score: Int, val flag: Int, val best: Int)

    private const val FLAG_EXACT = 0
    private const val FLAG_LOWER = 1
    private const val FLAG_UPPER = 2

    fun search(
        rs: Rules.Ruleset,
        board: IntArray,
        side: Int,
        cfg: Config,
    ): Result {
        val deadline = System.currentTimeMillis() + cfg.budgetMs
        val rootMoves = Rules.legalMoves(rs, board, side)
        if (rootMoves.isEmpty()) {
            return Result(null, -Rules.MATE, 0, 0, emptyList())
        }
        if (rootMoves.size == 1) {
            return Result(rootMoves[0], 0, 0, 0, emptyList())
        }

        // Zobrist hashing with a fixed seed for reproducible searches.
        val rng = Random(0x9E3779B9L)
        val z = IntArray(rs.n * rs.n * 4) { rng.nextInt() }
        fun hashOf(b: IntArray, s: Int): Long {
            var h = 0L
            for (i in b.indices) {
                val q = b[i]
                if (q != 0) h = h xor z[i * 4 + q + 2].toLong()
            }
            return h * 2 + if (s == Rules.IVORY) 0L else 1L
        }

        val tt = HashMap<Long, TtEntry>()
        var nodes = 0L
        var aborted = false

        fun evaluate(b: IntArray, s: Int): Int {
            val n = rs.n
            var score = 0
            for (i in 0 until n * n) {
                val code = b[i]
                if (code == 0) continue
                val sign = if (code > 0) 1 else -1
                val isKing = code == 2 || code == -2
                val r = i / n
                val c = i % n
                var v: Int
                if (isKing) {
                    v = rs.kingValue
                    if (rs.flyingKings) {
                        var mob = 0
                        for ((dr, dc) in Rules.DIRS) {
                            for (k in 1..3) {
                                val rr = r + dr * k
                                val cc = c + dc * k
                                if (rr < 0 || rr >= n || cc < 0 || cc >= n || b[rr * n + cc] != 0) break
                                mob++
                            }
                        }
                        v += mob * 4
                    }
                } else {
                    v = rs.manValue
                    v += (if (code > 0) n - 1 - r else r) * rs.advance
                    if (r == if (code > 0) n - 1 else 0) v += rs.homeGuard
                }
                if (r in 2..n - 3 && c in 2..n - 3) v += rs.centerValue
                score += sign * v
            }
            var e = if (side == Rules.IVORY) score else -score
            if (cfg.jitter > 0) e += (Random.nextDouble() * 2 - 1).toInt() * cfg.jitter
            return e
        }

        fun negamax(b: IntArray, s: Int, depth: Int, alphaIn: Int, betaIn: Int, noProg: Int): Int {
            var alpha = alphaIn
            var beta = betaIn
            nodes++
            if (nodes and 511L == 0L && System.currentTimeMillis() > deadline) aborted = true
            if (aborted) return 0
            if (noProg >= rs.drawPlies) return 0

            val moves = Rules.legalMoves(rs, b, s)
            if (moves.isEmpty()) return -(Rules.MATE + depth)
            if (depth <= 0) return evaluate(b, s)

            val key = hashOf(b, s)
            val entry = tt[key]
            var ttBest = -1
            if (entry != null) {
                if (entry.depth >= depth) {
                    if (entry.flag == FLAG_EXACT) return entry.score
                    if (entry.flag == FLAG_LOWER && entry.score > alpha) alpha = entry.score
                    else if (entry.flag == FLAG_UPPER && entry.score < beta) beta = entry.score
                    if (alpha >= beta) return entry.score
                }
                ttBest = entry.best
            }

            val ordered = moves.sortedByDescending { m ->
                (if (m.from == ttBest) 1_000_000 else 0) + m.caps.size * 1000 + (if (m.promotes) 500 else 0)
            }

            val alpha0 = alpha
            var best = Int.MIN_VALUE
            var bestMove = -1
            for (m in ordered) {
                val nb = Rules.applyMove(rs, b, m, s)
                val np = Rules.nextNoProgress(b, m, noProg)
                val v = -negamax(nb, -s, depth - 1, -beta, -alpha, np)
                if (aborted) return 0
                if (v > best) { best = v; bestMove = m.from }
                if (best > alpha) alpha = best
                if (alpha >= beta) break
            }

            val flag = when {
                best <= alpha0 -> FLAG_UPPER
                best >= beta -> FLAG_LOWER
                else -> FLAG_EXACT
            }
            tt[key] = TtEntry(depth, best, flag, bestMove)
            return best
        }

        var bestMove: Rules.Move = rootMoves[0]
        var bestScore = 0
        var completedDepth = 0
        val scores = HashMap<Int, Int>() // move hash -> score, for root ordering

        for (depth in 1..cfg.maxDepth) {
            val ordered = rootMoves.sortedByDescending { scores[it.path.hashCode()] ?: Int.MIN_VALUE }
            var alpha = Int.MIN_VALUE
            var iterBest: Rules.Move? = null
            var iterScore = Int.MIN_VALUE
            var abortedIter = false
            for (rm in ordered) {
                val nb = Rules.applyMove(rs, board, rm, side)
                val np = Rules.nextNoProgress(board, rm, cfg.noProgress)
                val v = -negamax(nb, -side, depth - 1, Int.MIN_VALUE, if (alpha == Int.MIN_VALUE) Int.MAX_VALUE else -alpha, cfg.noProgress)
                if (aborted) { abortedIter = true; break }
                scores[rm.path.hashCode()] = v
                if (v > iterScore) { iterScore = v; iterBest = rm }
                if (v > alpha) alpha = v
            }
            if (abortedIter && depth > 1) break
            if (!abortedIter) {
                iterBest?.let { bestMove = it }
                bestScore = iterScore
                completedDepth = depth
                if (bestScore > Rules.MATE - 1000) break
            }
            if (System.currentTimeMillis() > deadline) break
        }

        val rootScores = rootMoves.map { it to (scores[it.path.hashCode()] ?: 0) }
        return Result(bestMove, bestScore, completedDepth, nodes.toInt(), rootScores)
    }

    fun difficulty(diff: String): Config = when (diff) {
        "easy" -> Config(budgetMs = 120, maxDepth = 2, jitter = 30)
        "hard" -> Config(budgetMs = 1200, maxDepth = 24, jitter = 2)
        else -> Config(budgetMs = 420, maxDepth = 10, jitter = 6)
    }
}
