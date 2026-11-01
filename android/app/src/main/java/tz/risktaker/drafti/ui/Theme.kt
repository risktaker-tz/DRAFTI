package tz.risktaker.drafti.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Gold = Color(0xFFD3A95F)
private val Felt = Color(0xFF14301F)
private val Ink = Color(0xFFF0E7D3)

private val ClubColors = darkColorScheme(
    primary = Gold,
    onPrimary = Color(0xFF241708),
    background = Felt,
    onBackground = Ink,
    surface = Color(0xFF1D3527),
    onSurface = Ink,
    secondary = Color(0xFF7ED9A3),
    onSecondary = Color(0xFF0C2013),
)

/** The classic club look, in Material 3 clothing. Dark always — it is a club. */
@Composable
fun DraftiTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ClubColors,
        content = content,
    )
}
