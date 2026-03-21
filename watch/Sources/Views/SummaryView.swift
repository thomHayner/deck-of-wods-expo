import SwiftUI

/// Shown after the workout completes (phone sends mode: 'deck-complete' or 'free-complete').
struct SummaryView: View {
    @StateObject private var state = WorkoutState.shared

    var durationFormatted: String {
        let m = state.summary.durationSeconds / 60
        let s = state.summary.durationSeconds % 60
        if m >= 60 {
            let h = m / 60
            return String(format: "%dh %dm", h, m % 60)
        }
        return String(format: "%d:%02d", m, s)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Header
                VStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.green)
                    Text("Done!")
                        .font(.headline)
                }
                .padding(.top, 4)

                Divider()

                // Stats
                if state.summary.workoutType == "deck" {
                    StatRow(icon: "rectangle.stack.fill", iconColor: .green,
                            label: "Cards",
                            value: "\(state.summary.completedCards)/\(state.summary.totalCards)")
                    StatRow(icon: "figure.strengthtraining.traditional", iconColor: .green,
                            label: "Reps",
                            value: "\(state.summary.totalReps)")
                } else {
                    StatRow(icon: "flame.fill", iconColor: .orange,
                            label: "Calories",
                            value: "\(Int(state.summary.calories)) kcal")
                }

                StatRow(icon: "clock.fill", iconColor: .blue,
                        label: "Time",
                        value: durationFormatted)

                Divider()

                // Dismiss → back to idle
                Button("Done") {
                    Task { @MainActor in
                        WorkoutState.shared.mode = .idle
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
            }
            .padding(.horizontal)
        }
    }
}

private struct StatRow: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .frame(width: 18)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
        }
    }
}
