package com.deckofwods.wear.screens

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material.*
import com.deckofwods.wear.SummaryData
import com.deckofwods.wear.WearViewModel

@Composable
fun SummaryScreen(viewModel: WearViewModel, onDismiss: () -> Unit) {
    val summary by viewModel.summary.collectAsState()

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Text(
                text = "Done! 💪",
                style = MaterialTheme.typography.title2,
                color = MaterialTheme.colors.primary,
                textAlign = TextAlign.Center,
            )
        }
        item { Spacer(modifier = Modifier.height(4.dp)) }

        if (summary.workoutType == "deck") {
            item {
                SummaryRow(
                    label = "Cards",
                    value = "${summary.completedCards}/${summary.totalCards}",
                    valueColor = MaterialTheme.colors.primary,
                )
            }
            item {
                SummaryRow(
                    label = "Reps",
                    value = "${summary.totalReps}",
                    valueColor = MaterialTheme.colors.primary,
                )
            }
        } else {
            item {
                SummaryRow(
                    label = "Calories",
                    value = "${summary.calories.toInt()} kcal",
                    valueColor = Color(0xFFF97316),
                )
            }
        }

        item {
            SummaryRow(
                label = "Time",
                value = formatDuration(summary.durationSeconds),
                valueColor = Color(0xFF60A5FA),
            )
        }

        item { Spacer(modifier = Modifier.height(4.dp)) }

        item {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.primaryButtonColors(),
                modifier = Modifier.fillMaxWidth(0.7f),
            ) {
                Text("Done")
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, valueColor: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.caption1,
            color = MaterialTheme.colors.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.caption1,
            color = valueColor,
        )
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return if (m >= 60) "${m / 60}h ${m % 60}m"
    else "%d:%02d".format(m, s)
}
