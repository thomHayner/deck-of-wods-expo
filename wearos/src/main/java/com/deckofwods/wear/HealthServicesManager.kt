package com.deckofwods.wear

import android.content.Context
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch

/**
 * Manages a live exercise session on the watch for real-time
 * heart rate and calorie data during an active workout.
 *
 * Call startTracking() when ActiveWorkoutScreen appears,
 * stopTracking() when it disappears.
 */
class HealthServicesManager(context: Context) {

    private val exerciseClient = HealthServices.getClient(context).exerciseClient
    private val scope = CoroutineScope(Dispatchers.IO)
    private var viewModel: WearViewModel? = null

    private val updateCallback = object : ExerciseUpdateCallback {

        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            val vm = viewModel ?: return

            // Heart rate (most recent sample)
            update.latestMetrics.getData(DataType.HEART_RATE_BPM)
                .lastOrNull()?.value
                ?.let { vm.updateHeartRate(it) }

            // Calories (cumulative total)
            update.latestMetrics.getData(DataType.CALORIES_TOTAL)
                .lastOrNull()?.value
                ?.let { vm.updateCalories(it) }
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) {}
        override fun onRegistered() {}
        override fun onRegistrationFailed(throwable: Throwable) {
            // Health Services unavailable on this device/emulator
        }
        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {}
    }

    fun startTracking(vm: WearViewModel) {
        viewModel = vm
        scope.launch {
            try {
                val config = ExerciseConfig.builder(ExerciseType.STRENGTH_TRAINING)
                    .setDataTypes(setOf(DataType.HEART_RATE_BPM, DataType.CALORIES_TOTAL))
                    .setIsAutoPauseAndResumeEnabled(false)
                    .build()

                exerciseClient.setUpdateCallback(updateCallback)
                exerciseClient.startExerciseAsync(config).await()
            } catch (e: Exception) {
                // Health Services not available (emulator, older watch)
            }
        }
    }

    fun stopTracking() {
        scope.launch {
            try {
                exerciseClient.endExerciseAsync().await()
                exerciseClient.clearUpdateCallbackAsync(updateCallback).await()
            } catch (_: Exception) {}
        }
        viewModel = null
    }
}
