package tz.risktaker.drafti.engine

/**
 * DRAFTI rules engine for Android — a faithful Kotlin port of web/engine.js.
 *
 * Two public-domain rulesets:
 *  - American Checkers (English draughts), 8x8: dark side opens, men capture
 *    forward only, kings step one square, crowning ends the move.
 *  - International Draughts (FMJD), 10x10: light side opens, men capture both
 *    ways, flying kings, maximum capture compulsory, crowning only if the man
 *    ENDS its turn on the far edge.
 *
 * Board encoding: IntArray(n*n), index = row*n+col, row 0 = top (Ebony's back
 * rank). Pieces: 0 empty, 1 ivory man, 2 ivory king, -1 ebony man, -2 ebony
 * king. Ivory starts at the bottom and moves up. Dark (playable) squares
 * satisfy (row + col) % 2 == 1.
 */
object Rules {

    const val IVORY = 1
    const val EBONY = -1
    const val MATE = 1_000_000

    val DIRS: List<Pair<Int, Int>> = listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1)

    data class Ruleset(
        val id: String,
        val name: String,
        val n: Int,
        val pieceRows: Int,
        val flyingKings: Boolean,
        val menCaptureBack: Boolean,
        val maxCapture: Boolean,
        val promoteEndsMove: Boolean,
        val firstSide: Int,
        val drawPlies: Int,
        val manValue: Int,
        val kingValue: Int,
        val advance: Int,
        val homeGuard: Int,
        val centerValue: Int,
    )

    val AMERICAN = Ruleset(
        "american", "American Checkers", n = 8, pieceRows = 3,
        flyingKings = false, menCaptureBack = false, maxCapture = false,
        promoteEndsMove = true, firstSide = EBONY, drawPlies = 80,
        manValue = 100, kingValue = 175, advance = 4, homeGuard = 14, centerValue = 4,
    )

    val INTERNATIONAL = Ruleset(
        "international", "International Draughts", n = 10, pieceRows = 4,
        flyingKings = true, menCaptureBack = true, maxCapture = true,
        promoteEndsMove = false, firstSide = IVORY, drawPlies = 50,
        manValue = 100, kingValue = 320, advance = 2, homeGuard = 10, centerValue = 3,
    )

    val ALL = listOf(AMERICAN, INTERNATIONAL)

    fun byId(id: String): Ruleset = ALL.first { it.id == id }

    fun isDark(r: Int, c: Int): Boolean = ((r + c) and 1) == 1

    fun setupBoard(rs: Ruleset): IntArray {
        val b = IntArray(rs.n * rs.n)
        for (r in 0 until rs.n) for (c in 0 until rs.n) {
            if (!isDark(r, c)) continue
            val i = r * rs.n + c
            if (r < rs.pieceRows) b[i] = -1
            else if (r >= rs.n - rs.pieceRows) b[i] = 1
        }
        return b
    }

    fun isLastRow(rs: Ruleset, side: Int, r: Int): Boolean =
        if (side == IVORY) r == 0 else r == rs.n - 1

    data class Move(
        val from: Int,
        val path: List<Int>,   // from + landings; complete (leaf) sequences only
        val caps: List<Int>,   // jumped squares in order
        val promotes: Boolean,
    )

    fun legalMoves(rs: Ruleset, b: IntArray, side: Int): List<Move> {
        val caps = genCaptures(rs, b, side)
        if (caps.isNotEmpty()) {
            if (!rs.maxCapture) return caps
            val mx = caps.maxOf { it.caps.size }
            return caps.filter { it.caps.size == mx }
        }
        return genQuiets(rs, b, side)
    }

    private fun forwardDirs(side: Int): List<Pair<Int, Int>> =
        if (side == IVORY) DIRS.take(2) else DIRS.drop(2)

    private fun genCaptures(rs: Ruleset, b0: IntArray, side: Int): List<Move> {
        val n = rs.n
        val out = mutableListOf<Move>()

        fun rec(
            bd: IntArray, cur: Int, code: Int,
            path: MutableList<Int>, caps: MutableList<Int>, capSet: MutableSet<Int>,
            isRoot: Boolean,
        ) {
            val isKing = code == 2 || code == -2
            val r = cur / n
            val c = cur % n
            var extended = false
            bd[cur] = 0 // the moving piece vacates its square and may pass back over it

            val dirs = if (isKing || rs.menCaptureBack) DIRS else forwardDirs(side)
            for ((dr, dc) in dirs) {
                if (isKing && rs.flyingKings) {
                    // Flying king: slide to the first piece; jump it if uncaptured enemy;
                    // land on any empty square beyond.
                    var k = 1
                    var pi = -1
                    while (true) {
                        val rr = r + dr * k
                        val cc = c + dc * k
                        if (rr < 0 || rr >= n || cc < 0 || cc >= n) { pi = -1; break }
                        val idx = rr * n + cc
                        val q = bd[idx]
                        if (q == 0) { k++; continue }
                        pi = if (q * side > 0 || capSet.contains(idx)) -1 else idx
                        break
                    }
                    if (pi < 0) continue
                    var l = k + 1
                    var any = false
                    while (true) {
                        val lr = r + dr * l
                        val lc = c + dc * l
                        if (lr < 0 || lr >= n || lc < 0 || lc >= n) break
                        if (bd[lr * n + lc] != 0) break // captured pieces block until move end
                        val li = lr * n + lc
                        any = true
                        capSet.add(pi); path.add(li); caps.add(pi)
                        rec(bd, li, code, path, caps, capSet, false)
                        path.removeAt(path.size - 1); caps.removeAt(caps.size - 1); capSet.remove(pi)
                        l++
                    }
                    if (any) extended = true
                } else {
                    val lr = r + 2 * dr
                    val lc = c + 2 * dc
                    if (lr < 0 || lr >= n || lc < 0 || lc >= n) continue
                    val oi = (r + dr) * n + (c + dc)
                    val li = lr * n + lc
                    if (bd[oi] == 0 || bd[oi] * side > 0 || capSet.contains(oi)) continue
                    if (bd[li] != 0) continue
                    val crownNow = !isKing && rs.promoteEndsMove && isLastRow(rs, side, lr)
                    capSet.add(oi); path.add(li); caps.add(oi)
                    if (crownNow) {
                        out.add(Move(path.first(), path.toList(), caps.toList(), true))
                    } else {
                        rec(bd, li, code, path, caps, capSet, false)
                    }
                    path.removeAt(path.size - 1); caps.removeAt(caps.size - 1); capSet.remove(oi)
                    extended = true
                }
            }

            if (isRoot) bd[cur] = code // visited landings were empty and stay empty
            if (!extended && caps.isNotEmpty()) {
                out.add(
                    Move(
                        path.first(), path.toList(), caps.toList(),
                        !isKing && !rs.promoteEndsMove && isLastRow(rs, side, r),
                    )
                )
            }
        }

        for (i in 0 until n * n) {
            if (b0[i] * side <= 0) continue
            rec(b0, i, b0[i], mutableListOf(i), mutableListOf(), mutableSetOf(), true)
        }
        return out
    }

    private fun genQuiets(rs: Ruleset, b: IntArray, side: Int): List<Move> {
        val n = rs.n
        val out = mutableListOf<Move>()
        for (i in 0 until n * n) {
            val code = b[i]
            if (code * side <= 0) continue
            val isKing = code == 2 || code == -2
            val r = i / n
            val c = i % n
            val dirs = if (isKing) DIRS else forwardDirs(side)
            val reach = if (isKing && rs.flyingKings) n - 1 else 1
            for ((dr, dc) in dirs) {
                for (k in 1..reach) {
                    val rr = r + dr * k
                    val cc = c + dc * k
                    if (rr < 0 || rr >= n || cc < 0 || cc >= n) break
                    if (b[rr * n + cc] != 0) break
                    out.add(
                        Move(i, listOf(i, rr * n + cc), emptyList(),
                            !isKing && isLastRow(rs, side, rr))
                    )
                }
            }
        }
        return out
    }

    fun applyMove(rs: Ruleset, b: IntArray, m: Move, side: Int): IntArray {
        val nb = b.copyOf()
        val code = nb[m.from]
        nb[m.from] = 0
        for (j in m.caps) nb[j] = 0
        val end = m.path.last()
        val isKing = code == 2 || code == -2
        val endRow = end / rs.n
        nb[end] = if (!isKing && (m.promotes || isLastRow(rs, side, endRow))) side * 2 else code
        return nb
    }

    /** Draw-by-inactivity counter: reset on any capture or man move. */
    fun nextNoProgress(b: IntArray, m: Move, noProgress: Int): Int {
        val wasMan = b[m.from] == 1 || b[m.from] == -1
        return if (m.caps.isNotEmpty() || wasMan) 0 else noProgress + 1
    }

    /** Play squares numbered 1..K row by row from the top (score-sheet numbering). */
    fun squareNumbers(rs: Ruleset): IntArray {
        val map = IntArray(rs.n * rs.n)
        var k = 0
        for (r in 0 until rs.n) for (c in 0 until rs.n) {
            if (isDark(r, c)) map[r * rs.n + c] = ++k
        }
        return map
    }

    fun moveToNotation(rs: Ruleset, sqn: IntArray, m: Move): String {
        val sep = if (m.caps.isNotEmpty()) "x" else "-"
        return m.path.joinToString(sep) { sqn[it].toString() }
    }
}
