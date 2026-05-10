package com.jnyoung.gamearrowagain

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF020617)) {
                    ArrowAgainApp()
                }
            }
        }
    }
}

data class DemoPiece(
    val id: String,
    val row: Int,
    val col: Int,
    val direction: String,
    val color: Color,
    val removed: Boolean = false
)

data class DemoState(
    val pieces: List<DemoPiece>,
    val lives: Int,
    val taps: Int,
    val completed: Boolean,
    val failed: Boolean,
    val message: String
)

data class FlyingPiece(
    val piece: DemoPiece,
    val progress: Float
)

private fun levelOneState(): DemoState = DemoState(
    pieces = listOf(
        DemoPiece("a", 2, 1, "←", Color(0xFF22C55E)),
        DemoPiece("b", 1, 3, "↑", Color(0xFFF59E0B)),
        DemoPiece("c", 3, 2, "↓", Color(0xFF38BDF8))
    ),
    lives = 3,
    taps = 0,
    completed = false,
    failed = false,
    message = "Tap a white-outline arrow on the board."
)

private fun shootableIds(state: DemoState): Set<String> {
    val active = state.pieces.filterNot { it.removed }
    return active.filter { piece ->
        when (piece.direction) {
            "←" -> active.none { other -> other.id != piece.id && other.row == piece.row && other.col < piece.col }
            "→" -> active.none { other -> other.id != piece.id && other.row == piece.row && other.col > piece.col }
            "↑" -> active.none { other -> other.id != piece.id && other.col == piece.col && other.row < piece.row }
            else -> active.none { other -> other.id != piece.id && other.col == piece.col && other.row > piece.row }
        }
    }.map { it.id }.toSet()
}

private fun tapPiece(state: DemoState, pieceId: String): DemoState {
    if (state.completed || state.failed) return state

    val shootable = shootableIds(state)
    if (!shootable.contains(pieceId)) {
        val nextLives = (state.lives - 1).coerceAtLeast(0)
        return state.copy(
            lives = nextLives,
            taps = state.taps + 1,
            failed = nextLives == 0,
            message = if (nextLives == 0) "No lives left. Replay Level 1." else "Blocked. Tap a white-outline arrow first."
        )
    }

    val nextPieces = state.pieces.map { piece ->
        if (piece.id == pieceId) piece.copy(removed = true) else piece
    }
    val completed = nextPieces.all { it.removed }
    return state.copy(
        pieces = nextPieces,
        taps = state.taps + 1,
        completed = completed,
        message = if (completed) "Level 1 cleared on Android demo." else "Nice. One more arrow flew out."
    )
}

private fun findTappedPiece(state: DemoState, boardSizePx: Float, tapOffset: Offset): DemoPiece? {
    val cellSize = boardSizePx / 5f
    val col = (tapOffset.x / cellSize).toInt()
    val row = (tapOffset.y / cellSize).toInt()
    return state.pieces.firstOrNull { !it.removed && it.row == row && it.col == col }
}

private fun directionOffset(direction: String, travel: Float): Offset = when (direction) {
    "←" -> Offset(-travel, 0f)
    "→" -> Offset(travel, 0f)
    "↑" -> Offset(0f, -travel)
    else -> Offset(0f, travel)
}

private fun trailStrokeWidth(progress: Float): Float = 14f - progress * 4f

@Composable
fun ArrowAgainApp() {
    var state by remember { mutableStateOf(levelOneState()) }
    val shootable = shootableIds(state)
    var flyingPiece by remember { mutableStateOf<FlyingPiece?>(null) }
    val shotProgress = remember { Animatable(0f) }

    LaunchedEffect(flyingPiece?.piece?.id) {
        if (flyingPiece == null) return@LaunchedEffect
        shotProgress.snapTo(0f)
        shotProgress.animateTo(1f, animationSpec = tween(durationMillis = 260, easing = LinearEasing))
        flyingPiece = null
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(20.dp),
        verticalArrangement = Arrangement.Top
    ) {
        Text(
            text = "Arrow Again · Android Level 1 Demo",
            color = Color.White,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = "现在不是整块飞出，而是像迷宫通道一样沿路径冲出去。",
            color = Color(0xFFCBD5E1)
        )
        Spacer(modifier = Modifier.height(18.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Lives: ${state.lives}", color = Color(0xFFE2E8F0))
            Text("Taps: ${state.taps}", color = Color(0xFFE2E8F0))
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = state.message, color = Color(0xFF93C5FD))
        Spacer(modifier = Modifier.height(18.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            shape = RoundedCornerShape(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(
                    modifier = Modifier
                        .size(360.dp)
                        .pointerInput(state, flyingPiece) {
                            detectTapGestures { offset ->
                                if (flyingPiece != null) return@detectTapGestures
                                val piece = findTappedPiece(state, size.width.toFloat(), offset) ?: return@detectTapGestures
                                val nextState = tapPiece(state, piece.id)
                                if (shootable.contains(piece.id)) {
                                    flyingPiece = FlyingPiece(piece, 0f)
                                }
                                state = nextState
                            }
                        }
                ) {
                    val cols = 5
                    val rows = 5
                    val cellSize = size.width / cols
                    for (row in 0 until rows) {
                        for (col in 0 until cols) {
                            drawRoundRect(
                                color = Color(0x2394A3B8),
                                topLeft = Offset(col * cellSize + 4f, row * cellSize + 4f),
                                size = Size(cellSize - 8f, cellSize - 8f)
                            )
                        }
                    }

                    state.pieces.filterNot { it.removed }.forEach { piece ->
                        val x = piece.col * cellSize + 4f
                        val y = piece.row * cellSize + 4f
                        drawRoundRect(
                            color = piece.color,
                            topLeft = Offset(x, y),
                            size = Size(cellSize - 8f, cellSize - 8f)
                        )
                        if (shootable.contains(piece.id)) {
                            drawRoundRect(
                                color = Color.White,
                                topLeft = Offset(x + 3f, y + 3f),
                                size = Size(cellSize - 14f, cellSize - 14f),
                                style = Stroke(width = 4f)
                            )
                        }
                        drawContext.canvas.nativeCanvas.apply {
                            val paint = android.graphics.Paint().apply {
                                color = android.graphics.Color.WHITE
                                textAlign = android.graphics.Paint.Align.CENTER
                                textSize = cellSize * 0.52f
                                isFakeBoldText = true
                            }
                            drawText(piece.direction, x + (cellSize - 8f) / 2f, y + (cellSize - 8f) / 2f + cellSize * 0.18f, paint)
                        }
                    }

                    flyingPiece?.let { flying ->
                        val centerX = flying.piece.col * cellSize + (cellSize - 8f) / 2f + 4f
                        val centerY = flying.piece.row * cellSize + (cellSize - 8f) / 2f + 4f
                        val travel = cellSize * (0.45f + shotProgress.value * 2.3f)
                        val offset = directionOffset(flying.piece.direction, travel)
                        val headX = centerX + offset.x
                        val headY = centerY + offset.y
                        drawLine(
                            color = flying.piece.color.copy(alpha = 0.95f - shotProgress.value * 0.25f),
                            start = Offset(centerX, centerY),
                            end = Offset(headX, headY),
                            strokeWidth = trailStrokeWidth(shotProgress.value)
                        )
                        drawContext.canvas.nativeCanvas.apply {
                            val paint = android.graphics.Paint().apply {
                                color = android.graphics.Color.WHITE
                                textAlign = android.graphics.Paint.Align.CENTER
                                textSize = cellSize * (0.34f - shotProgress.value * 0.05f)
                                isFakeBoldText = true
                            }
                            drawText(flying.piece.direction, headX, headY + cellSize * 0.08f, paint)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        if (state.completed || state.failed) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                shape = RoundedCornerShape(20.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = if (state.completed) "Level 1 Clear" else "Level Failed",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (state.completed) "路径飞线效果已接通，下一步补拖尾残影和命中特效。" else "需要更清楚的错误反馈和提示按钮。",
                        color = Color(0xFFCBD5E1)
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = {
                flyingPiece = null
                state = levelOneState()
            }) {
                Text("Replay Level 1")
            }
            Text(text = "Directional exit animation enabled", color = Color(0xFF64748B))
        }
    }
}
