import SwiftUI

/// Root view during an active workout.
/// Scroll UP/DOWN between card view (page 0) and health data (page 1).
/// Swipe LEFT/RIGHT buttons on the card view send actions to the phone.
struct ActiveWorkoutView: View {
    @StateObject private var health = HealthKitManager.shared

    var body: some View {
        TabView {
            CardView()
                .tag(0)
            HealthDataView()
                .tag(1)
        }
        .tabViewStyle(.verticalPage)
        .onAppear { health.startWorkout() }
        .onDisappear { health.stopWorkout() }
    }
}

// MARK: - Card view (page 0)

private struct CardView: View {
    @StateObject private var state = WorkoutState.shared

    var suitColor: Color {
        if state.cardDisplay.hasSuffix("♥") || state.cardDisplay.hasSuffix("♦") {
            return .red
        }
        if state.cardDisplay.hasSuffix("★") { return .purple }
        return .primary
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                // Progress
                Text("\(state.cardIndex + 1) of \(state.totalCards)")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                // Card face
                Text(state.cardDisplay)
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .foregroundColor(suitColor)

                // Exercise
                Text(state.exercise)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.7)
                    .lineLimit(2)

                // Reps
                Text("\(state.reps) reps")
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)

                // Action buttons (swipe simulation for Digital Crown / tap)
                HStack(spacing: 20) {
                    Button {
                        PhoneConnector.shared.sendAction("previousCard")
                    } label: {
                        Image(systemName: "chevron.left.circle.fill")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)

                    Button {
                        PhoneConnector.shared.sendAction("completeCard")
                    } label: {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title2)
                            .foregroundColor(.green)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 4)
            }
            .padding(.horizontal)
        }
    }
}
