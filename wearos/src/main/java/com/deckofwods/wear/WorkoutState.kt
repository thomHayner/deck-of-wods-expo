package com.deckofwods.wear

sealed class WearMode {
    object Idle    : WearMode()
    object Active  : WearMode()
    object Summary : WearMode()
}

data class ActiveData(
    val exercise:       String = "",
    val reps:           Int    = 0,
    val cardDisplay:    String = "",   // e.g. "K♥"
    val cardIndex:      Int    = 0,
    val totalCards:     Int    = 0,
    val elapsedSeconds: Int    = 0,
    // Health metrics updated by HealthServicesManager
    val heartRate:      Double = 0.0,
    val activeCalories: Double = 0.0,
)

data class SummaryData(
    val workoutType:     String = "deck",
    val totalReps:       Int    = 0,
    val completedCards:  Int    = 0,
    val totalCards:      Int    = 0,
    val durationSeconds: Int    = 0,
    val calories:        Double = 0.0,
)

data class HistoryItem(
    val id:              String,
    val workoutType:     String,
    val date:            String,
    val totalReps:       Int,
    val calories:        Double,
    val durationSeconds: Int,
)
