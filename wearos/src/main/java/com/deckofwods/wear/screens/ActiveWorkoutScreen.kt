package com.deckofwods.wear.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.*
import com.deckofwods.wear.HealthServicesManager
import com.deckofwods.wear.WearViewModel
import com.deckofwods.wear.sendActionToPhone

/**
 * Active workout screen — two vertical pages:
 *   Page 0: Card view (card display, exercise, reps, complete/previous buttons)
 *   Page 1: Health data (heart rate, calories, elapsed time)
 *
 * Scroll up/down (Digital Crown or swipe) to switch pages.
 */
@Composable
fun ActiveWorkoutScreen(
    viewModel:     WearViewModel,
    healthServices: HealthServicesManager,
    context:       Context,
) {
    val data by viewModel.activeData.collectAsState()
    val pagerState = rememberPagerState(pageCount = { 2 })

    DisposableEffect(Unit) {
        healthServices.startTracking(viewModel)
        onDispose { healthServices.stopTracking() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        VerticalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            when (page) {
                0 -> CardPage(
                    cardDisplay  = data.cardDisplay,
                    exercise     = data.exercise,
                    reps         = data.reps,
                    cardIndex    = data.cardIndex,
                    totalCards   = data.totalCards,
                    onComplete   = { sendActionToPhone(context, "completeCard") },
                    onPrevious   = { sendActionToPhone(context, "previousCard") },
                )
                1 -> HealthDataScreen(viewModel = viewModel)
            }
        }

        // Page indicator dots
        PageIndicator(
            pagerState = pagerState,
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 4.dp),
        )
    }
}

@Composable
private fun CardPage(
    cardDisplay: String,
    exercise:    String,
    reps:        Int,
    cardIndex:   Int,
    totalCards:  Int,
    onComplete:  () -> Unit,
    onPrevious:  () -> Unit,
) {
    val suitColor = when {
        cardDisplay.endsWith("♥") || cardDisplay.endsWith("♦") -> Color(0xFFEF4444)
        cardDisplay.endsWith("★")                               -> Color(0xFF7C3AED)
        else                                                     -> Color.White
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
    ) {
        // Progress
        Text(
            text = "${cardIndex + 1}/$totalCards",
            style = MaterialTheme.typography.caption2,
            color = MaterialTheme.colors.onSurfaceVariant,
        )

        // Card face
        Text(
            text = cardDisplay,
            fontSize = 36.sp,
            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
            color = suitColor,
        )

        // Exercise
        Text(
            text = exercise,
            style = MaterialTheme.typography.title3,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        // Reps
        Text(
            text = "$reps reps",
            style = MaterialTheme.typography.title2,
            color = MaterialTheme.colors.primary,
        )

        // Action buttons
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
            modifier = Modifier.padding(top = 4.dp),
        ) {
            CompactButton(
                onClick = onPrevious,
                colors = ButtonDefaults.secondaryButtonColors(),
            ) {
                Text("‹", fontSize = 18.sp)
            }
            CompactButton(
                onClick = onComplete,
                colors = ButtonDefaults.primaryButtonColors(),
            ) {
                Text("✓", fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun PageIndicator(
    pagerState: androidx.compose.foundation.pager.PagerState,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
    ) {
        repeat(pagerState.pageCount) { i ->
            Box(
                modifier = Modifier
                    .size(if (pagerState.currentPage == i) 6.dp else 4.dp)
                    .background(
                        color = if (pagerState.currentPage == i)
                            Color.White else Color.White.copy(alpha = 0.4f),
                        shape = CircleShape,
                    ),
            )
        }
    }
}
