import HealthKit

/// Manages an HKWorkoutSession on the watch for live heart rate + calorie tracking.
@MainActor
class HealthKitManager: NSObject, ObservableObject {
    static let shared = HealthKitManager()

    private let store = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var liveBuilder: HKLiveWorkoutBuilder?

    // MARK: - Authorization

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let share: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
        ]
        let read: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        store.requestAuthorization(toShare: share, read: read) { _, error in
            if let error { print("[HealthKit] auth error: \(error)") }
        }
    }

    // MARK: - Workout lifecycle

    func startWorkout() {
        let config = HKWorkoutConfiguration()
        config.activityType = .functionalStrengthTraining
        config.locationType = .indoor

        do {
            let session = try HKWorkoutSession(healthStore: store, configuration: config)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
            session.delegate = self
            builder.delegate = self

            workoutSession = session
            liveBuilder = builder

            session.startActivity(with: .now)
            builder.beginCollection(at: .now) { _, error in
                if let error { print("[HealthKit] beginCollection error: \(error)") }
            }
        } catch {
            // HKWorkoutSession unavailable in simulator
            print("[HealthKit] startWorkout error: \(error)")
        }
    }

    func stopWorkout() {
        workoutSession?.end()
        liveBuilder?.endCollection(at: .now) { [weak self] _, _ in
            self?.liveBuilder?.finishWorkout { _, error in
                if let error { print("[HealthKit] finishWorkout error: \(error)") }
            }
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension HealthKitManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ session: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {}

    nonisolated func workoutSession(
        _ session: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        print("[HealthKit] session failed: \(error)")
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension HealthKitManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        let bpmUnit = HKUnit.count().unitDivided(by: .minute())

        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            let stats = workoutBuilder.statistics(for: quantityType)

            Task { @MainActor in
                let state = WorkoutState.shared
                if quantityType == HKQuantityType.quantityType(forIdentifier: .heartRate) {
                    state.heartRate = stats?.mostRecentQuantity()?.doubleValue(for: bpmUnit) ?? state.heartRate
                } else if quantityType == HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
                    state.activeCalories = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? state.activeCalories
                }
            }
        }
    }
}
