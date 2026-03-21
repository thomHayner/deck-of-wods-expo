package com.deckofwods.wear.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.*
import com.deckofwods.wear.HistoryItem
import com.deckofwods.wear.WearViewModel

@Composable
fun IdleScreen(viewModel: WearViewModel) {
    val history by viewModel.history.collectAsState()

    if (history.isEmpty()) {
        EmptyState()
    } else {
        HistoryList(history = history)
    }
}

@Composable
private fun EmptyState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "Deck of WODs",
                style = MaterialTheme.typography.title2,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "Start a workout\non your phone",
                style = MaterialTheme.typography.caption2,
                color = MaterialTheme.colors.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun HistoryList(history: List<HistoryItem>) {
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        item {
            ListHeader { Text("History") }
        }
        items(history) { item ->
            HistoryCard(item = item)
        }
    }
}

@Composable
private fun HistoryCard(item: HistoryItem) {
    val subtitle = if (item.totalReps > 0) {
        "${item.totalReps} reps · ${formatDuration(item.durationSeconds)}"
    } else {
        "${item.calories.toInt()} kcal · ${formatDuration(item.durationSeconds)}"
    }
    Card(
        onClick = {},
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Text(
                text = item.workoutType.replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.caption1,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.caption2,
                color = MaterialTheme.colors.onSurfaceVariant,
            )
            Text(
                text = item.date,
                style = MaterialTheme.typography.caption2,
                color = MaterialTheme.colors.onSurfaceVariant,
            )
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    return "${m}m"
}
