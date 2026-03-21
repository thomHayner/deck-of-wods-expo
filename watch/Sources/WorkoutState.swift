import Foundation
import Combine

// Maps to the phone-side Zustand store modes.
// deck-active / free-active  → .active
// deck-complete / free-complete → .summary
enum WorkoutMode: String {
    case idle, active, summary
}

struct WorkoutSummary {
    var totalReps: Int = 0
    var completedCards: Int = 0
    var totalCards: Int = 0
    var durationSeconds: Int = 0
    var calories: Double = 0
    var workoutType: String = "deck"
}

@MainActor
class WorkoutState: ObservableObject {
    static let shared = WorkoutState()

    @Published var mode: WorkoutMode = .idle

    // Active workout
    @Published var exercise: String = ""
    @Published var reps: Int = 0
    @Published var cardDisplay: String = ""   // e.g. "K♥"
    @Published var cardIndex: Int = 0
    @Published var totalCards: Int = 0
    @Published var elapsedSeconds: Int = 0

    // Health (live, from HealthKitManager)
    @Published var heartRate: Double = 0
    @Published var activeCalories: Double = 0

    // Post-workout summary
    @Published var summary: WorkoutSummary = WorkoutSummary()

    // Idle: recent history for the history screen
    @Published var recentHistory: [HistoryItem] = []
}

struct HistoryItem: Identifiable {
    let id: String
    let workoutType: String
    let date: String
    let totalReps: Int
    let calories: Double
    let durationSeconds: Int
}
