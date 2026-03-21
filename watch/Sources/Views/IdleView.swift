import SwiftUI

struct IdleView: View {
    @StateObject private var state = WorkoutState.shared

    var body: some View {
        if state.recentHistory.isEmpty {
            VStack(spacing: 10) {
                Image(systemName: "rectangle.stack.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.green)
                Text("Deck of WODs")
                    .font(.headline)
                Text("Start a workout\non your iPhone")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        } else {
            List(state.recentHistory) { item in
                HistoryRowView(item: item)
            }
            .listStyle(.carousel)
            .navigationTitle("History")
        }
    }
}

private struct HistoryRowView: View {
    let item: HistoryItem

    var icon: String {
        switch item.workoutType {
        case "cycling": return "figure.outdoor.cycle"
        case "hiking":  return "figure.hiking"
        case "running": return "figure.run"
        default:        return "rectangle.stack.fill"
        }
    }

    var subtitle: String {
        if item.totalReps > 0 {
            return "\(item.totalReps) reps · \(formattedDuration)"
        }
        return "\(Int(item.calories)) kcal · \(formattedDuration)"
    }

    var formattedDuration: String {
        let m = item.durationSeconds / 60
        return "\(m)m"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundColor(.green)
                    .font(.caption)
                Text(item.workoutType.capitalized)
                    .font(.caption)
                    .fontWeight(.semibold)
            }
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(item.date)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}
