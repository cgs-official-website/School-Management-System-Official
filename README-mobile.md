# Zuna-Schools Mobile Application

This is the React Native Android application for Zuna-Schools, sharing Firebase config and state with the web application in a monorepo setup.

## Setup Instructions

1. Install dependencies from the root directory:
   ```bash
   npm install
   ```

2. Copy the `google-services.json` file into `apps/mobile/android/app/` if it is not already there.

3. Configure Keystore for Release:
   - Run the following command in `apps/mobile/android` to generate a keystore:
     ```bash
     keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias zuna-key -keyalg RSA -keysize 2048 -validity 10000
     ```
   - Copy `apps/mobile/android/gradle.properties.example` to `apps/mobile/android/gradle.properties` and add your keystore passwords.

## Running the App locally

Start the Metro Bundler from the mobile directory:
```bash
cd apps/mobile
npm run start
```

Run on an Android device or emulator:
```bash
cd apps/mobile
npm run android
```

## Creating a Release Build

To create an Android App Bundle (.aab) for the Google Play Store:
```bash
cd apps/mobile/android
./gradlew bundleRelease
```
The generated bundle will be located at `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.

To create an APK for local testing:
```bash
cd apps/mobile/android
./gradlew assembleRelease
```
The APK will be located at `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.

## Play Store Checklist
- [ ] Signed `.aab` generated
- [ ] Ensure app icons are updated (res folders)
- [ ] Create Play Store feature graphics
- [ ] Privacy Policy URL ready
- [ ] App Listing & Content Rating forms filled in Play Console
