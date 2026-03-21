package com.deckofwods.wear

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Singleton bridge between DataLayerListenerService (background) and WearViewModel (UI).
 * The service writes here; the ViewModel collects.
 */
object WorkoutStateRepository {
    private val _updates = MutableStateFlow<Map<String, Any>?>(null)
    val updates: StateFlow<Map<String, Any>?> = _updates.asStateFlow()

    fun update(data: Map<String, Any>) {
        _updates.value = data
    }
}
