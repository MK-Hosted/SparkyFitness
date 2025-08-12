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




