package tz.risktaker.drafti.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.gestures.detectTapGestures
import tz.risktaker.drafti.GameViewModel
import tz.risktaker.drafti.engine.Rules
import kotlin.math.roundToInt

private val FeltDark = Color(0xFF0C2013)
private val Felt = Color(0xFF14301F)
private val SqLight = Color(0xFFE9D5A7)
private val SqDark = Color(0xFF7C4A24)
private val WoodEdge = Color(0xFF4A2C15)
private val Gold = Color(0xFFD3A95F)
private val IvoryPiece = Color(0xFFF3E6C4)
private val IvoryRim = Color(0xFFC8B184)
private val EbonyPiece = Color(0xFF2E2115)
private val EbonyRim = Color(0xFF191009)

/** Classic-club board: squares, pieces, highlights. Tap any square to play. */
@Composable
fun BoardScreen(vm: GameViewModel, modifier: Modifier = Modifier) {
    val state by vm.state.collectAsState()
    val n = state.rs.n
    val sqn = state.sqn

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Felt, FeltDark)))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "DRAFTI",
            style = MaterialTheme.typography.headlineMedium,
            color = Gold,
            modifier = Modifier.padding(bottom = 4.dp),
        )
        Text(
            text = when {
                state.over -> state.resultText ?: "Game over"
                state.thinking -> "The computer is thinking…"
                state.mode == "ai" -> "Your move — " + sideName(state.side)
                else -> sideName(state.side) + " to move"
            },
            style = MaterialTheme.typography.bodyLarge,
            color = Color.White,
            modifier = Modifier.padding(bottom = 12.dp),
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .padding(horizontal = 24.dp)
                .background(WoodEdge, RoundedCornerShape(12.dp))
                .padding(10.dp),
            contentAlignment = Alignment.Center,
        ) {
            androidx.compose.foundation.Canvas(
                Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .pointerInput(n) {
                        detectTapGestures { offset ->
                            val cell = size.width.toFloat() / n
                            val c = (offset.x / cell).roundToInt().coerceIn(0, n - 1)
                            val r = (offset.y / cell).roundToInt().coerceIn(0, n - 1)
                            vm.tap(r * n + c)
                        }
                    },
            ) {
                val cell = size.width / n
                // squares
                for (r in 0 until n) for (c in 0 until n) {
                    val dark = Rules.isDark(r, c)
                    drawRect(
                        color = if (dark) SqDark else SqLight,
                        topLeft = Offset(c * cell, r * cell),
                        size = androidx.compose.ui.geometry.Size(cell, cell),
                    )
                }
                val mark = { i: Int, color: Color ->
                    val r = i / n; val c = i % n
                    drawRect(
                        color = color, topLeft = Offset(c * cell, r * cell),
                        size = androidx.compose.ui.geometry.Size(cell, cell),
                        style = Stroke(width = cell * 0.08f),
                    )
                }
                state.lastMove?.let {
                    mark(it.from, Gold.copy(alpha = .7f))
                    mark(it.path.last(), Gold.copy(alpha = .7f))
                }
                state.hint?.let {
                    mark(it.from, Color(0xFF7ED9A3))
                    mark(it.path[1], Color(0xFF7ED9A3))
                }
                state.selected?.let { mark(it, Gold) }
                if (state.selected != null) {
                    val k = state.partial.size
                    state.legal.forEach { m ->
                        if (m.path.size > k && state.partial.indices.all { m.path[it] == state.partial[it] }) {
                            val t = m.path[k]
                            val r = t / n; val c = t % n
                            drawCircle(
                                color = if (m.caps.isNotEmpty()) Color(0xFFC96A4A) else Gold,
                                radius = cell * 0.14f,
                                center = Offset(c * cell + cell / 2, r * cell + cell / 2),
                            )
                        }
                    }
                }
                // pieces
                for (i in state.board.indices) {
                    val code = state.board[i]
                    if (code == 0) continue
                    val r = i / n; val c = i % n
                    val center = Offset(c * cell + cell / 2, r * cell + cell / 2)
                    val radius = cell * 0.38f
                    val isIvory = code > 0
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = if (isIvory)
                                listOf(Color(0xFFFFFDF4), IvoryPiece, IvoryRim)
                            else
                                listOf(Color(0xFF6A553F), EbonyPiece, EbonyRim),
                            center = center, radius = radius,
                        ),
                        radius = radius, center = center,
                    )
                    if (code == 2 || code == -2) {
                        drawCircle(color = Gold, radius = radius * 0.5f, center = center,
                            style = Stroke(width = cell * 0.06f))
                    }
                }
                // square numbers on dark squares
                for (r in 0 until n) for (c in 0 until n) {
                    if (!Rules.isDark(r, c)) continue
                    drawContext.canvas.nativeCanvas.apply {
                        val paint = android.graphics.Paint().apply {
                            color = android.graphics.Color.argb(140, 255, 244, 214)
                            textSize = cell * 0.16f
                            isAntiAlias = true
                        }
                        drawText(sqn[r * n + c].toString(), c * cell + cell * 0.06f, r * cell + cell * 0.22f, paint)
                    }
                }
            }
        }

        Text(
            text = Rules.byId(state.rs.id).name + " · " +
                (if (state.rs.firstSide == Rules.IVORY) "Ivory" else "Ebony") + " opens",
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFFB8AD93),
            modifier = Modifier.padding(vertical = 8.dp),
        )

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = {
                vm.newGame(state.rs.id, state.mode, state.diff, state.humanSide)
            }) { Text("New game") }
            OutlinedButton(onClick = { vm.undo() }, enabled = state.history.isNotEmpty() && !state.over) {
                Text("Undo")
            }
            OutlinedButton(onClick = { vm.hint() }, enabled = state.humanTurn() && !state.thinking) {
                Text("Hint")
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 8.dp),
        ) {
            FilterChip(
                selected = state.rs.id == "american",
                onClick = { vm.newGame("american", state.mode, state.diff, state.humanSide) },
                label = { Text("American 8×8") },
            )
            FilterChip(
                selected = state.rs.id == "international",
                onClick = { vm.newGame("international", state.mode, state.diff, state.humanSide) },
                label = { Text("International 10×10") },
            )
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 8.dp),
        ) {
            FilterChip(
                selected = state.mode == "ai",
                onClick = { vm.newGame(state.rs.id, "ai", state.diff, state.humanSide) },
                label = { Text("vs Computer") },
            )
            FilterChip(
                selected = state.mode == "hotseat",
                onClick = { vm.newGame(state.rs.id, "hotseat", state.diff, state.humanSide) },
                label = { Text("Two players") },
            )
        }
        if (state.mode == "ai") {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 8.dp),
            ) {
                listOf("easy" to "Casual", "medium" to "Club", "hard" to "Tough").forEach { (d, label) ->
                    FilterChip(
                        selected = state.diff == d,
                        onClick = { vm.newGame(state.rs.id, state.mode, d, state.humanSide) },
                        label = { Text(label) },
                    )
                }
            }
        }

        // move log
        Text(
            "Moves: " + state.history.joinToString("  ") { it.notation }.ifEmpty { "—" },
            style = MaterialTheme.typography.bodySmall,
            color = Color(0xFFB8AD93),
            modifier = Modifier.padding(top = 12.dp, bottom = 24.dp),
        )
    }
}

private fun sideName(side: Int): String = if (side == Rules.IVORY) "Ivory" else "Ebony"
