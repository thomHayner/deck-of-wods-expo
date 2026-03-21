import SwiftUI

struct ContentView: View {
    @StateObject private var state = WorkoutState.shared

    var body: some View {
        Group {
            switch state.mode {
            case .idle:
                IdleView()
            case .active:
                ActiveWorkoutView()
            case .summary:
                SummaryView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: state.mode)
    }
}
