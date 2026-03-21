/**
 * Expo config plugin — adds Apple Watch + Wear OS companion app support.
 *
 * iOS (every prebuild):
 *  1. Adds HealthKit capability + usage strings to the iPhone app.
 *  2. Copies watch Swift sources from watch/ into ios/DeckOfWODs Watch/.
 *  3. Idempotently adds a watch2_app target to the Xcode project.
 *  4. Sets watchOS build settings on that target.
 *
 * Android (every prebuild):
 *  5. Copies Wear OS sources from wearos/ into android/wearos/.
 *  6. Adds ':wearos' to android/settings.gradle.
 *  7. Adds BODY_SENSORS + ACTIVITY_RECOGNITION permissions to phone app manifest.
 *
 * Post-prebuild steps:
 *  iOS:  Open ios/DeckOfWODs.xcworkspace, sign both targets, enable HealthKit.
 *  Android: Open android/ in Android Studio, pair a Wear OS emulator, run both.
 */

const {
  withXcodeProject,
  withEntitlementsPlist,
  withInfoPlist,
  withSettingsGradle,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins')
// withDangerousMod is kept for Android (copyWearOsSources); iOS quoting uses withXcodeProject
const path = require('path')
const fs   = require('fs')

const WATCH_NAME    = 'DeckOfWODs Watch'
const WATCH_BUNDLE  = 'com.deckofwods.app.watchkitapp'
const WATCH_MIN_OS  = '7.0'
const SWIFT_VERSION = '5.0'

// ─────────────────────────────────────────────────────────────────────────────

module.exports = function withWatchApp(config) {
  // ── iOS ──────────────────────────────────────────────────────────────────
  config = addHealthKitEntitlements(config)
  config = addHealthKitInfoPlist(config)
  // fixPbxprojQuoting MUST be registered before addWatchTarget.
  // Expo uses onion/middleware ordering: last registered = outermost = runs first.
  // So fixPbxprojQuoting (registered 3rd) executes AFTER addWatchTarget (registered 4th),
  // intercepting project.writeSync() at serialization time.
  // Watch target temporarily disabled — Swift files were landing in the iPhone
  // target's build phase via the xcode npm package, causing "No such module WatchKit".
  // Add the watch target manually in Xcode instead (File → New → Target → Watch App).
  // config = fixPbxprojQuoting(config)
  // config = addWatchTarget(config)

  // ── Android ──────────────────────────────────────────────────────────────
  config = copyWearOsSources(config)
  config = addWearOsToSettingsGradle(config)
  config = addAndroidPermissions(config)

  return config
}

// ── Step 1: iPhone app entitlements ──────────────────────────────────────────

function addHealthKitEntitlements(config) {
  return withEntitlementsPlist(config, (c) => {
    c.modResults['com.apple.developer.healthkit']        = true
    c.modResults['com.apple.developer.healthkit.access'] = []
    return c
  })
}

// ── Step 2: iPhone app Info.plist usage strings ───────────────────────────────

function addHealthKitInfoPlist(config) {
  return withInfoPlist(config, (c) => {
    c.modResults.NSHealthShareUsageDescription ??=
      'Deck of WODs reads your heart rate and steps during workouts.'
    c.modResults.NSHealthUpdateUsageDescription ??=
      'Deck of WODs saves completed workouts to Apple Health.'
    return c
  })
}

// ── Step 3: Watch target in Xcode project ─────────────────────────────────────

function addWatchTarget(config) {
  return withXcodeProject(config, (c) => {
    const project    = c.modResults
    const projectRoot = c.modRequest.projectRoot
    const iosDir     = path.join(projectRoot, 'ios')
    const watchDir   = path.join(iosDir, WATCH_NAME)
    const sourcesDir = path.join(projectRoot, 'watch', 'Sources')

    // ── 3a. Copy Swift sources ──────────────────────────────────────────────
    if (fs.existsSync(sourcesDir)) {
      fs.mkdirSync(path.join(watchDir, 'Views'), { recursive: true })
      copyDirSync(sourcesDir, watchDir)
    }

    const watchInfoSrc = path.join(projectRoot, 'watch', 'Info.plist')
    if (fs.existsSync(watchInfoSrc)) {
      fs.copyFileSync(watchInfoSrc, path.join(watchDir, 'Info.plist'))
    }

    const watchEntitlementsSrc = path.join(projectRoot, 'watch', `${WATCH_NAME}.entitlements`)
    if (fs.existsSync(watchEntitlementsSrc)) {
      fs.copyFileSync(watchEntitlementsSrc, path.join(watchDir, `${WATCH_NAME}.entitlements`))
    }

    // ── 3b. Skip if target already exists (idempotent) ─────────────────────
    if (project.pbxTargetByName(WATCH_NAME)) {
      console.log(`[watch-plugin] Target "${WATCH_NAME}" already exists — skipping.`)
      return c
    }

    // ── 3c. Add watch2_app target ───────────────────────────────────────────
    // `watch2_app` = com.apple.product-type.application.watchapp2
    // The xcode package automatically adds a CopyFiles "Embed Watch Content"
    // phase to the first iPhone target when this is called.
    const watchTarget = project.addTarget(WATCH_NAME, 'watch2_app', WATCH_NAME, WATCH_BUNDLE)

    // ── 3d. Ensure PBXGroup exists, then add Swift source files ──────────────
    // addTarget() does NOT auto-create a PBXGroup; addSourceFile() needs one.
    let watchGroupKey = project.findPBXGroupKey({ name: WATCH_NAME })
    if (!watchGroupKey) {
      const { uuid } = project.addPbxGroup([], WATCH_NAME, WATCH_NAME)
      watchGroupKey = uuid
    }

    const swiftFiles = collectSwiftFiles(watchDir)
    swiftFiles.forEach((absPath) => {
      // path relative to ios/ directory (where the .xcodeproj lives)
      const relPath = path.relative(iosDir, absPath)
      project.addSourceFile(relPath, { target: watchTarget.uuid }, watchGroupKey)
    })

    // ── 3e. Configure build settings ───────────────────────────────────────
    const xcBuildConfigs  = project.pbxXCBuildConfigurationSection()
    const xcConfigLists   = project.pbxXCConfigurationList()
    const configListUUID  = watchTarget.pbxNativeTarget.buildConfigurationList

    if (configListUUID && xcConfigLists[configListUUID]) {
      const buildConfigs = xcConfigLists[configListUUID].buildConfigurations ?? []
      buildConfigs.forEach(({ value: uuid }) => {
        const bc = xcBuildConfigs[uuid]
        if (!bc?.buildSettings) return
        const s = bc.buildSettings

        s.SDKROOT                     = 'watchos'
        s.WATCHOS_DEPLOYMENT_TARGET   = `"${WATCH_MIN_OS}"`
        s.SWIFT_VERSION               = `"${SWIFT_VERSION}"`
        s.PRODUCT_BUNDLE_IDENTIFIER   = `"${WATCH_BUNDLE}"`
        s.PRODUCT_NAME                = `"${WATCH_NAME}"`
        s.INFOPLIST_FILE              = `"${WATCH_NAME}/Info.plist"`
        s.CODE_SIGN_ENTITLEMENTS      = `"${WATCH_NAME}/${WATCH_NAME}.entitlements"`
        s.TARGETED_DEVICE_FAMILY      = '"4"'
        s.LD_RUNPATH_SEARCH_PATHS     = '"@executable_path/Library/Frameworks @executable_path/../Frameworks"'
        s.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = 'NO'
        s.SKIP_INSTALL                = 'YES'
      })
    }

    // ── 3f. Link WatchKit and HealthKit frameworks ──────────────────────────
    project.addFramework('WatchKit.framework',  { target: watchTarget.uuid })
    project.addFramework('HealthKit.framework', { target: watchTarget.uuid })

    console.log(`[watch-plugin] Added target "${WATCH_NAME}" to Xcode project.`)
    return c
  })
}

// ── Step 4: Fix pbxproj quoting (CocoaPods / nanaimo requirement) ─────────────
// The xcode npm package omits quotes around multi-word string values, e.g.:
//   name = DeckOfWODs Watch;   ← CocoaPods nanaimo parser rejects this
// It must be:
//   name = "DeckOfWODs Watch"; ← quoted
//
// We can't use withDangerousMod because Expo runs 'dangerous' mods BEFORE
// withXcodeProject writes the .pbxproj to disk (the log confirms this).
//
// Fix: monkey-patch project.writeSync() inside a withXcodeProject callback.
// Because this is registered BEFORE addWatchTarget, it executes AFTER it
// (onion ordering), intercepting the serialized string before it hits disk.

function fixPbxprojQuoting(config) {
  return withXcodeProject(config, (c) => {
    const project = c.modResults
    const original = project.writeSync.bind(project)
    project.writeSync = (opts) => {
      let content = original(opts)
      // Quote unquoted multi-word values:  = Foo Bar;  →  = "Foo Bar";
      // Safe: skips already-quoted values and single-word values.
      content = content.replace(/= ([A-Za-z]\w*(?: \w+)+);/g, '= "$1";')
      return content
    }
    return c
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyDirSync(src, dest) {
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const srcPath  = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  })
}

function collectSwiftFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSwiftFiles(full, files)
    } else if (entry.name.endsWith('.swift')) {
      files.push(full)
    }
  })
  return files
}

// ── Android: copy Wear OS sources ─────────────────────────────────────────────

function copyWearOsSources(config) {
  return withDangerousMod(config, [
    'android',
    (c) => {
      const projectRoot = c.modRequest.projectRoot
      const srcDir      = path.join(projectRoot, 'wearos')
      const destDir     = path.join(projectRoot, 'android', 'wearos')

      if (!fs.existsSync(srcDir)) {
        console.warn('[wear-os-plugin] wearos/ source directory not found — skipping copy.')
        return c
      }

      fs.mkdirSync(destDir, { recursive: true })
      copyDirSync(srcDir, destDir)
      console.log('[wear-os-plugin] Copied wearos/ sources to android/wearos/.')
      return c
    },
  ])
}

// ── Android: add ':wearos' to settings.gradle ─────────────────────────────────

function addWearOsToSettingsGradle(config) {
  return withSettingsGradle(config, (c) => {
    if (!c.modResults.contents.includes("':wearos'")) {
      c.modResults.contents += "\ninclude ':wearos'\n"
      console.log('[wear-os-plugin] Added :wearos to settings.gradle.')
    }
    return c
  })
}

// ── Android: body sensors + activity recognition permissions ──────────────────

function addAndroidPermissions(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest

    const needed = [
      'android.permission.BODY_SENSORS',
      'android.permission.ACTIVITY_RECOGNITION',
    ]

    const existing = (manifest['uses-permission'] ?? []).map(
      (p) => p.$['android:name']
    )

    needed.forEach((perm) => {
      if (!existing.includes(perm)) {
        manifest['uses-permission'] = [
          ...(manifest['uses-permission'] ?? []),
          { $: { 'android:name': perm } },
        ]
      }
    })

    return c
  })
}
