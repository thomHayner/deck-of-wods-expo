import SwiftUI

/// Page 1 of the active workout TabView — live health metrics.
struct HealthDataView: View {
    @StateObject private var state = WorkoutState.shared

    var elapsedFormatted: String {
        let s = state.elapsedSeconds
        let h = s / 3600
        let m = (s % 3600) / 60
        let sec = s % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, sec)
        }
        return String(format: "%d:%02d", m, sec)
    }

    var body: some View {
        VStack(spacing: 14) {
            // Heart rate
            MetricRow(
                icon: "heart.fill",
                iconColor: .red,
                value: state.heartRate > 0
                    ? "\(Int(state.heartRate)) bpm"
                    : "— bpm"
            )

            // Active calories
            MetricRow(
                icon: "flame.fill",
                iconColor: .orange,
                value: "\(Int(state.activeCalories)) kcal"
            )

            // Elapsed time
            MetricRow(
                icon: "clock.fill",
                iconColor: .blue,
                value: elapsedFormatted,
                monospaced: true
            )
        }
        .padding()
    }
}

private struct MetricRow: View {
    let icon: String
    let iconColor: Color
    let value: String
    var monospaced: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .font(.caption)
                .frame(width: 16)
            if monospaced {
                Text(value)
                    .font(.title3.monospacedDigit())
                    .fontWeight(.semibold)
            } else {
                Text(value)
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            Spacer()
        }
    }
}
