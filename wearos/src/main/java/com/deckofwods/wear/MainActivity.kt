package com.deckofwods.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.deckofwods.wear.screens.ActiveWorkoutScreen
import com.deckofwods.wear.screens.IdleScreen
import com.deckofwods.wear.screens.SummaryScreen

private const val ROUTE_IDLE    = "idle"
private const val ROUTE_ACTIVE  = "active"
private const val ROUTE_SUMMARY = "summary"

class MainActivity : ComponentActivity() {

    private val viewModel: WearViewModel by viewModels()
    private lateinit var healthServices: HealthServicesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        healthServices = HealthServicesManager(this)

        setContent {
            val mode    by viewModel.mode.collectAsState()
            val navController = rememberSwipeDismissableNavController()

            // Navigate in response to mode changes from the phone
            androidx.compose.runtime.LaunchedEffect(mode) {
                val target = when (mode) {
                    is WearMode.Active  -> ROUTE_ACTIVE
                    is WearMode.Summary -> ROUTE_SUMMARY
                    else                -> ROUTE_IDLE
                }
                if (navController.currentBackStackEntry?.destination?.route != target) {
                    navController.navigate(target) {
                        popUpTo(ROUTE_IDLE) { inclusive = false }
                        launchSingleTop = true
                    }
                }
            }

            SwipeDismissableNavHost(
                navController = navController,
                startDestination = ROUTE_IDLE,
            ) {
                composable(ROUTE_IDLE) {
                    IdleScreen(viewModel = viewModel)
                }
                composable(ROUTE_ACTIVE) {
                    ActiveWorkoutScreen(
                        viewModel     = viewModel,
                        healthServices = healthServices,
                        context       = this@MainActivity,
                    )
                }
                composable(ROUTE_SUMMARY) {
                    SummaryScreen(
                        viewModel     = viewModel,
                        onDismiss     = {
                            viewModel.dismissSummary()
                            navController.navigate(ROUTE_IDLE) {
                                popUpTo(ROUTE_IDLE) { inclusive = true }
                            }
                        },
                    )
                }
            }
        }
    }
}
