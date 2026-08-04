import Constants from 'expo-constants';
import * as Application from 'expo-application';

/* The installed app's version, read at runtime so it always matches the APK
   and never needs hand-editing. Prefers the native value baked into the binary
   (nativeApplicationVersion); falls back to the bundled app config version on
   web or in dev where there is no native layer. The build number
   (nativeBuildVersion — Android versionCode) is appended when present:
   "v1.2.0 (12)". */
export function appVersionLabel(): string {
  const version =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const build = Application.nativeBuildVersion;
  return build ? `v${version} (${build})` : `v${version}`;
}
