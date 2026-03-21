package com.deckofwods.wear.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.*
import com.deckofwods.wear.WearViewModel

/** Page 1 of the active workout view — live health metrics. */
@Composable
fun HealthDataScreen(viewModel: WearViewModel) {
    val data by viewModel.activeData.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
    ) {
        // Heart rate
        MetricRow(
            label = if (data.heartRate > 0) "${data.heartRate.toInt()} bpm" else "— bpm",
            labelColor = Color(0xFFEF4444),
            caption = "Heart Rate",
        )
        // Calories
        MetricRow(
            label = "${data.activeCalories.toInt()} kcal",
            labelColor = Color(0xFFF97316),
            caption = "Active Calories",
        )
        // Elapsed time
        MetricRow(
            label = formatElapsed(data.elapsedSeconds),
            labelColor = Color(0xFF60A5FA),
            caption = "Elapsed",
        )
    }
}

@Composable
private fun MetricRow(label: String, labelColor: Color, caption: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = label,
            style = MaterialTheme.typography.title2,
            color = labelColor,
        )
        Text(
            text = caption,
            style = MaterialTheme.typography.caption2,
            color = MaterialTheme.colors.onSurfaceVariant,
        )
    }
}

private fun formatElapsed(seconds: Int): String {
    val h = seconds / 3600
    val m = (seconds % 3600) / 60
    val s = seconds % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s)
    else "%d:%02d".format(m, s)
}
