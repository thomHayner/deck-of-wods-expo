package com.deckofwods.wear

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

class WearViewModel : ViewModel() {

    private val _mode       = MutableStateFlow<WearMode>(WearMode.Idle)
    private val _activeData = MutableStateFlow(ActiveData())
    private val _summary    = MutableStateFlow(SummaryData())
    private val _history    = MutableStateFlow<List<HistoryItem>>(emptyList())

    val mode:       StateFlow<WearMode>       = _mode.asStateFlow()
    val activeData: StateFlow<ActiveData>     = _activeData.asStateFlow()
    val summary:    StateFlow<SummaryData>    = _summary.asStateFlow()
    val history:    StateFlow<List<HistoryItem>> = _history.asStateFlow()

    init {
        viewModelScope.launch {
            WorkoutStateRepository.updates.filterNotNull().collect { applyUpdate(it) }
        }
    }

    // ── Called by HealthServicesManager ──────────────────────────────────────

    fun updateHeartRate(bpm: Double) {
        _activeData.value = _activeData.value.copy(heartRate = bpm)
    }

    fun updateCalories(kcal: Double) {
        _activeData.value = _activeData.value.copy(activeCalories = kcal)
    }

    fun dismissSummary() {
        _mode.value = WearMode.Idle
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private fun applyUpdate(d: Map<String, Any>) {
        when (d["mode"] as? String) {
            "deck-active", "free-active" -> {
                _mode.value = WearMode.Active
                _activeData.value = _activeData.value.copy(
                    exercise       = d.str("exercise")       ?: _activeData.value.exercise,
                    reps           = d.int("reps")           ?: _activeData.value.reps,
                    cardDisplay    = d.str("cardDisplay")    ?: _activeData.value.cardDisplay,
                    cardIndex      = d.int("cardIndex")      ?: _activeData.value.cardIndex,
                    totalCards     = d.int("totalCards")     ?: _activeData.value.totalCards,
                    elapsedSeconds = d.int("elapsedSeconds") ?: _activeData.value.elapsedSeconds,
                )
            }
            "deck-complete", "free-complete" -> {
                _mode.value = WearMode.Summary
                (d["summary"] as? Map<*, *>)?.let { s ->
                    _summary.value = SummaryData(
                        workoutType     = s.str("workoutType")     ?: "deck",
                        totalReps       = s.int("totalReps")       ?: 0,
                        completedCards  = s.int("completedCards")  ?: 0,
                        totalCards      = s.int("totalCards")      ?: 0,
                        durationSeconds = s.int("durationSeconds") ?: 0,
                        calories        = s.dbl("calories")        ?: 0.0,
                    )
                }
            }
            else -> {
                _mode.value = WearMode.Idle
                // History arrives in idle context updates
                (d["recentHistory"] as? List<*>)?.let { list ->
                    _history.value = list
                        .filterIsInstance<Map<*, *>>()
                        .mapNotNull { it.toHistoryItem() }
                }
            }
        }
    }
}

// ── Map extension helpers ─────────────────────────────────────────────────────

private fun Map<*, *>.str(key: String): String? = this[key] as? String
private fun Map<*, *>.int(key: String): Int?    = (this[key] as? Number)?.toInt()
private fun Map<*, *>.dbl(key: String): Double? = (this[key] as? Number)?.toDouble()

private fun Map<*, *>.toHistoryItem(): HistoryItem? {
    val id = this.str("id") ?: return null
    return HistoryItem(
        id              = id,
        workoutType     = this.str("workoutType")     ?: "deck",
        date            = this.str("date")            ?: "",
        totalReps       = this.int("totalReps")       ?: 0,
        calories        = this.dbl("calories")        ?: 0.0,
        durationSeconds = this.int("durationSeconds") ?: 0,
    )
}
