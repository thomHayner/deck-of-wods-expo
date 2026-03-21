package com.deckofwods.wear

import android.content.Context
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONArray
import org.json.JSONObject

private const val PATH_WORKOUT_STATE = "/workout-state"
private const val PATH_HISTORY       = "/history"
private const val PATH_WATCH_ACTION  = "/watch-action"

/**
 * Receives messages from the phone even when the Wear app is in the background.
 * Parses JSON and writes into WorkoutStateRepository for WearViewModel to collect.
 */
class DataLayerListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            PATH_WORKOUT_STATE -> {
                val json = String(event.data, Charsets.UTF_8)
                WorkoutStateRepository.update(JSONObject(json).toMap())
            }
            PATH_HISTORY -> {
                val arr = JSONArray(String(event.data, Charsets.UTF_8))
                val list = (0 until arr.length()).map { arr.getJSONObject(it).toMap() }
                WorkoutStateRepository.update(mapOf("mode" to "idle", "recentHistory" to list))
            }
        }
    }
}

// ── Standalone util: send a user action to the phone ─────────────────────────

/**
 * Sends an action string to all connected phone nodes.
 * Called from the UI layer (button taps).
 */
fun sendActionToPhone(context: Context, action: String) {
    Wearable.getNodeClient(context).connectedNodes
        .addOnSuccessListener { nodes ->
            nodes.forEach { node ->
                Wearable.getMessageClient(context)
                    .sendMessage(node.id, PATH_WATCH_ACTION, action.toByteArray(Charsets.UTF_8))
            }
        }
}

// ── JSONObject ↔ Map helpers ──────────────────────────────────────────────────

private fun JSONObject.toMap(): Map<String, Any> {
    val map = mutableMapOf<String, Any>()
    keys().forEach { k ->
        map[k] = when (val v = get(k)) {
            is JSONObject -> v.toMap()
            is JSONArray  -> v.toList()
            else          -> v
        }
    }
    return map
}

private fun JSONArray.toList(): List<Any> =
    (0 until length()).map { i ->
        when (val v = get(i)) {
            is JSONObject -> v.toMap()
            is JSONArray  -> v.toList()
            else          -> v
        }
    }
