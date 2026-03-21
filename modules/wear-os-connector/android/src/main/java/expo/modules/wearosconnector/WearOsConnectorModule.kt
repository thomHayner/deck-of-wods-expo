package expo.modules.wearosconnector

import android.content.Context
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/** Path the watch app listens on for workout state. */
private const val PATH_WORKOUT_STATE = "/workout-state"
/** Path the watch app listens on for history. */
private const val PATH_HISTORY = "/history"
/** Path the phone listens on for watch actions (completeCard, previousCard). */
private const val PATH_WATCH_ACTION = "/watch-action"

class WearOsConnectorModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React context unavailable")

    private val scope = CoroutineScope(Dispatchers.IO)
    private var messageListener: MessageClient.OnMessageReceivedListener? = null

    override fun definition() = ModuleDefinition {

        Name("WearOsConnector")

        // ── Events ────────────────────────────────────────────────────────────
        // "onWatchMessage": { action: String }
        Events("onWatchMessage")

        // ── Lifecycle ─────────────────────────────────────────────────────────

        OnCreate {
            val listener = MessageClient.OnMessageReceivedListener { event: MessageEvent ->
                if (event.path == PATH_WATCH_ACTION) {
                    val action = String(event.data, Charsets.UTF_8)
                    sendEvent("onWatchMessage", mapOf("action" to action))
                }
            }
            messageListener = listener
            Wearable.getMessageClient(context).addListener(listener)
        }

        OnDestroy {
            messageListener?.let {
                // Best effort — context may already be gone
                try { Wearable.getMessageClient(context).removeListener(it) } catch (_: Exception) {}
            }
        }

        // ── Functions ─────────────────────────────────────────────────────────

        /** Send current workout state JSON to all connected Wear OS nodes. */
        AsyncFunction("sendWorkoutState") { state: Map<String, Any?>, promise: Promise ->
            scope.launch {
                try {
                    sendToAllNodes(PATH_WORKOUT_STATE, toJsonBytes(state))
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("E_WEAR", e.message ?: "sendWorkoutState failed", e)
                }
            }
        }

        /** Send session history JSON to all connected Wear OS nodes. */
        AsyncFunction("sendHistoryToWatch") { history: List<Map<String, Any?>>, promise: Promise ->
            scope.launch {
                try {
                    val arr = JSONArray()
                    history.forEach { arr.put(toJsonObject(it)) }
                    sendToAllNodes(PATH_HISTORY, arr.toString().toByteArray(Charsets.UTF_8))
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("E_WEAR", e.message ?: "sendHistoryToWatch failed", e)
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private suspend fun sendToAllNodes(path: String, data: ByteArray) {
        val nodes = Wearable.getNodeClient(context).connectedNodes.await()
        nodes.forEach { node ->
            Wearable.getMessageClient(context).sendMessage(node.id, path, data).await()
        }
    }

    private fun toJsonBytes(map: Map<String, Any?>): ByteArray =
        toJsonObject(map).toString().toByteArray(Charsets.UTF_8)

    private fun toJsonObject(map: Map<*, *>): JSONObject {
        val json = JSONObject()
        map.forEach { (k, v) ->
            json.put(k.toString(), when (v) {
                is Map<*, *> -> toJsonObject(v)
                is List<*>   -> toJsonArray(v)
                null         -> JSONObject.NULL
                else         -> v
            })
        }
        return json
    }

    private fun toJsonArray(list: List<*>): JSONArray {
        val arr = JSONArray()
        list.forEach { v ->
            arr.put(when (v) {
                is Map<*, *> -> toJsonObject(v)
                is List<*>   -> toJsonArray(v)
                null         -> JSONObject.NULL
                else         -> v
            })
        }
        return arr
    }
}
