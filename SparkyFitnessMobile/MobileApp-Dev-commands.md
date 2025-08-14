# Android Build Commands

## Generate Release Keystore

This command generates a private signing key required to build the release version of the app.

```bash
keytool -genkey -v -keystore sparky-fitness-release-key.keystore -alias sparky-fitness-alias -keyalg RSA -keysize 2048 -validity 10000
```
./gradlew --stop


## Build Release APK

This command cleans the previous build and creates a new release-signed APK.

```bash
cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..
```



adb logcat --clear
adb logcat -s "ReactNative" "HealthConnect" "SparkyFitnessMobile" *:E



Clean b# Navigate to the React Native project directory
cd SparkyFitnessMobile

# Remove node_modules and package lock files
rm -rf node_modules
rm -f yarn.lock package-lock.json

# Clean Android build caches
cd android
./gradlew clean
rm -rf .gradle app/build build
cd .. # Go back to SparkyFitnessMobile directory
uild:



npm start -- --reset-cache

npm install

npm run android




