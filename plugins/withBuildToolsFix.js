const { withProjectBuildGradle } = require('expo/config-plugins');

/* Durable fix for `expo prebuild` regenerating android/.
 *
 * Some RN community libraries (notably @react-native-community/datetimepicker)
 * don't declare buildToolsVersion, so AGP falls back to its bundled default
 * (35.0.0) which the installed SDK can't parse (repository XML v4 vs v3) and
 * can't auto-download — assembleRelease then fails. This injects a
 * subprojects/afterEvaluate block into android/build.gradle that forces every
 * Android module onto the project's build tools (rootProject.ext, else
 * 36.0.0), matching the app module.
 */
const MARKER = '// >>> payat build-tools fix';

const BLOCK = `
${MARKER}
// plugins.withId fires when the Android plugin is applied (immediately if the
// subproject is already evaluated), avoiding "already evaluated" afterEvaluate
// errors under expo-root-project.
ext.payatBuildTools = rootProject.ext.has("buildToolsVersion")
    ? rootProject.ext.buildToolsVersion : "36.0.0"
subprojects { subproject ->
  subproject.plugins.withId("com.android.library") {
    subproject.android { buildToolsVersion = rootProject.ext.payatBuildTools }
  }
  subproject.plugins.withId("com.android.application") {
    subproject.android { buildToolsVersion = rootProject.ext.payatBuildTools }
  }
}
// <<< payat build-tools fix
`;

module.exports = function withBuildToolsFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withBuildToolsFix: expected a groovy build.gradle');
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `\n${BLOCK}`;
    }
    return cfg;
  });
};
