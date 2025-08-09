# Running and Testing SparkyFitnessMobile

This document provides detailed instructions on how to set up the development environment, run the SparkyFitnessMobile application on various platforms, and test its functionalities.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js:** Version 18 or higher. You can download it from [nodejs.org](https://nodejs.org/).
- **npm (Node Package Manager):** Comes bundled with Node.js.
- **Expo CLI:** Install globally using npm:
  ```bash
  npm install -g expo-cli
  ```
- **Git:** For cloning the project repository (if applicable).
- **VS Code:** Recommended IDE for development.
- **Android Studio (Optional):** For Android emulator setup.
- **Xcode (Optional, macOS only):** For iOS simulator setup.

## 2. Project Setup

1. **Clone the Repository (if applicable):**
   If you received the project as a Git repository, clone it:
   ```bash
   git clone [repository-url]
   cd SparkyFitnessMobile
   ```
   If you just created the project, you are already in the correct directory.

2. **Install Dependencies:**
   Navigate to the project root directory (`SparkyFitnessMobile`) and install the necessary Node.js packages:
   ```bash
   npm install
   ```
   This will install all dependencies listed in `package.json`, including `expo-health-connect` and `axios`.

## 3. Running the Application

You can run the Expo application on an iOS simulator, Android emulator, or a physical device using the Expo Go app.

### 3.1. Start the Development Server

From the project root directory, start the Expo development server:
```bash
npm start
```
This will open a new browser tab with the Expo Dev Tools and display a QR code in your terminal.

### 3.2. Running on a Physical Device (Recommended for Health Data)

1. **Download Expo Go:** Install the "Expo Go" app from the App Store (iOS) or Google Play Store (Android) on your physical device.
2. **Scan QR Code:** Open the Expo Go app and scan the QR code displayed in your terminal or the Expo Dev Tools browser page.
3. **Connect:** Your app should load on your device. Ensure your device and computer are on the same Wi-Fi network.

**Note:** For testing health data features, especially HealthKit on iOS and Health Connect on Android, using a physical device is highly recommended as simulators/emulators may have limited or no support for these APIs.

### 3.3. Running on an iOS Simulator (macOS only)

1. **Install Xcode:** Ensure Xcode is installed on your macOS machine.
2. **Open Simulator:** From the Expo Dev Tools in your browser, click "Run on iOS simulator". If you have multiple simulators, you might need to select one.
   Alternatively, from the terminal where `npm start` is running, press `i`.

### 3.4. Running on an Android Emulator

1. **Install Android Studio:** Set up Android Studio and create a virtual device (AVD).
2. **Launch Emulator:** Start your desired Android emulator from Android Studio.
3. **Run App:** From the Expo Dev Tools in your browser, click "Run on Android device/emulator".
   Alternatively, from the terminal where `npm start` is running, press `a`.

## 4. Testing Functionalities

### 4.1. Configuration Screen

1. **Navigate:** Open the app and go to the "Configuration" screen (if using tab navigation).
2. **Enter Details:** Input a dummy or actual "Server URL" and "API Key".
   - **Tip:** For initial testing, you can use a service like [Mocky](http://www.mocky.io/) or [RequestBin](https://requestbin.com/) to create a temporary endpoint that captures incoming requests, allowing you to verify data transmission without a full backend.
3. **Save:** Tap "Save Configuration". Observe the UI feedback (e.g., "Saved!").
4. **Verify Storage:** (Advanced) You can use Expo's debugging tools or add temporary console logs to verify that the data is being stored correctly in `AsyncStorage` or `expo-secure-store`.

### 4.2. Health Data Selection & Sync Screen

1. **Navigate:** Go to the "Health Data & Sync" screen.
2. **Select Data Types:** Choose a few health data types (e.g., Steps, Heart Rate).
3. **Grant Permissions:**
   - The first time you attempt to sync, the app should prompt you for health data permissions (Health Connect on Android, HealthKit on iOS).
   - **Crucial:** Grant these permissions. If you deny them, the app will not be able to access health data.
   - **Troubleshooting:** If you accidentally deny permissions, you'll need to go to your device's system settings to enable them manually (refer to `docs/Health_Data_Permissions.md` for guidance).
4. **Initiate Sync:** Tap "Sync Now".
5. **Observe Feedback:**
   - Look for loading indicators.
   - Check for success messages (e.g., "Data sent successfully!") or error messages.
6. **Verify Data Transmission:**
   - If you used a mock server (like Mocky or RequestBin), check its logs to see if the data was received and if its structure matches the expected format (as outlined in `docs/Data_Flow.md`).
   - If you have a real backend, check your server logs or database for the received health data.

### 4.3. Debugging Tips

- **Expo Dev Tools:** The browser-based Expo Dev Tools (opened by `npm start`) provide useful links for debugging, including opening the Metro Bundler debugger.
- **React Native Debugger:** A standalone app that provides a powerful debugging experience, including Redux and Flipper integration.
- **Console Logs:** Use `console.log()` extensively to trace variable values and execution flow.
- **Device Logs:** For native module issues, check the device logs (Xcode for iOS, Android Studio Logcat for Android).
- **Network Inspector:** Use your browser's developer tools (if running on web) or a proxy tool like Charles Proxy or Fiddler to inspect network requests made by the app.

## 5. Building for Production

Once development and testing are complete, you can build your app for distribution:

- **Android:**
  ```bash
  expo build:android -t apk # for APK
  expo build:android -t app-bundle # for AAB (Google Play Store)
  ```
- **iOS:**
  ```bash
  expo build:ios # for IPA (App Store)
  ```
  **Note:** iOS builds require a paid Apple Developer account and a macOS machine.

Refer to the official Expo documentation for more advanced build configurations and deployment strategies.