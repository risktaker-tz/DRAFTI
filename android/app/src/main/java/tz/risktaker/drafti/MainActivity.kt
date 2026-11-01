package tz.risktaker.drafti

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import tz.risktaker.drafti.ui.BoardScreen
import tz.risktaker.drafti.ui.DraftiTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DraftiTheme {
                BoardScreen(viewModel())
            }
        }
    }
}
