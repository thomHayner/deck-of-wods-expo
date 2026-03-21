import WatchKit
import WatchConnectivity

/// Manages the WCSession connection to the paired iPhone.
/// Receives state updates from the phone; sends user actions back.
@MainActor
class PhoneConnector: NSObject, ObservableObject {
    static let shared = PhoneConnector()

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - Outbound (watch → phone)

    /// Sends an action to the phone (e.g. swipe to complete/previous card).
    func sendAction(_ action: String) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["action": action], replyHandler: nil) { error in
            print("[PhoneConnector] sendAction error: \(error.localizedDescription)")
        }
    }
}

// MARK: - WCSessionDelegate

extension PhoneConnector: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        if let error { print("[PhoneConnector] activation error: \(error)") }
    }

    /// Called for real-time messages sent during an active workout (sendMessage).
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in apply(message) }
    }

    /// Called for background context updates (history, idle state).
    nonisolated func session(
        _ session: WCSession,
        didReceiveApplicationContext applicationContext: [String: Any]
    ) {
        Task { @MainActor in apply(applicationContext) }
    }

    // MARK: - State parsing

    @MainActor
    private func apply(_ dict: [String: Any]) {
        let state = WorkoutState.shared

        // Mode
        if let modeRaw = dict["mode"] as? String {
            switch modeRaw {
            case "deck-active", "free-active":
                state.mode = .active
            case "deck-complete", "free-complete":
                state.mode = .summary
                if let s = dict["summary"] as? [String: Any] {
                    state.summary = parseSummary(s)
                }
            default:
                state.mode = .idle
            }
        }

        // Active workout fields
        if let v = dict["exercise"]     as? String { state.exercise    = v }
        if let v = dict["reps"]         as? Int    { state.reps        = v }
        if let v = dict["cardDisplay"]  as? String { state.cardDisplay = v }
        if let v = dict["cardIndex"]    as? Int    { state.cardIndex   = v }
        if let v = dict["totalCards"]   as? Int    { state.totalCards  = v }
        if let v = dict["elapsedSeconds"] as? Int  { state.elapsedSeconds = v }

        // History (sent in idle context)
        if let items = dict["recentHistory"] as? [[String: Any]] {
            state.recentHistory = items.compactMap { parseHistoryItem($0) }
        }
    }

    private func parseSummary(_ d: [String: Any]) -> WorkoutSummary {
        WorkoutSummary(
            totalReps:       d["totalReps"]       as? Int    ?? 0,
            completedCards:  d["completedCards"]  as? Int    ?? 0,
            totalCards:      d["totalCards"]      as? Int    ?? 0,
            durationSeconds: d["durationSeconds"] as? Int    ?? 0,
            calories:        d["calories"]        as? Double ?? 0,
            workoutType:     d["workoutType"]     as? String ?? "deck"
        )
    }

    private func parseHistoryItem(_ d: [String: Any]) -> HistoryItem? {
        guard let id = d["id"] as? String else { return nil }
        return HistoryItem(
            id:              id,
            workoutType:     d["workoutType"]     as? String ?? "deck",
            date:            d["date"]            as? String ?? "",
            totalReps:       d["totalReps"]       as? Int    ?? 0,
            calories:        d["calories"]        as? Double ?? 0,
            durationSeconds: d["durationSeconds"] as? Int    ?? 0
        )
    }
}
