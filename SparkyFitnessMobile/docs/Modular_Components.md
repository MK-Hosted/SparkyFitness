# Modular Components and Extensibility for SparkyFitnessMobile

This document outlines the strategy for designing modular and extensible components within the SparkyFitnessMobile application. A modular approach enhances maintainability, reusability, and scalability, making it easier to add new features or adapt to changing requirements.

## 1. Core Principles of Modularity
- **Separation of Concerns:** Each module or component should have a single, well-defined responsibility.
- **Loose Coupling:** Modules should be as independent as possible, minimizing direct dependencies.
- **High Cohesion:** Elements within a module should be functionally related.
- **Reusability:** Components should be designed to be easily reused across different parts of the application or in future projects.
- **Testability:** Isolated components are easier to test independently.

## 2. Application Structure (Conceptual)

```mermaid
graph TD
    A[App.js (Root)] --> B[Navigation (e.g., Tab Navigator)]
    B --> C[Screens]
    C --> C1[ConfigurationScreen]
    C --> C2[HealthDataSyncScreen]
    C --> C3[StatusLogScreen (Optional)]
    C --> C4[OnboardingScreen (Optional)]
    C --> C5[PermissionsScreen (Internal)]

    C1 --> D[Components]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D

    D --> D1[InputField]
    D --> D2[Button]
    D --> D3[CheckboxItem]
    D --> D4[LoadingIndicator]
    D --> D5[ErrorMessage]

    C --> E[Services/Utilities]
    E --> E1[HealthDataService]
    E --> E2[ApiService]
    E --> E3[StorageService]
    E --> E4[PermissionService]
    E --> E5[DataTransformer]

    E1 --> F[Platform-Specific Health APIs]
    F --> F1[Android Health Connect]
    F --> F2[Apple HealthKit]

    E2 --> G[External API (User's Server)]
    E3 --> H[Local Storage (AsyncStorage/SecureStore)]
```

## 3. Key Modular Components and Their Responsibilities

### 3.1. UI Components (`components/`)
These are reusable React Native components that handle presentation logic.

- **`InputField.js` / `InputField.tsx`:**
    - **Responsibility:** Renders a text input field with a label, placeholder, and optional error message.
    - **Props:** `label`, `placeholder`, `value`, `onChangeText`, `secureTextEntry`, `keyboardType`, `errorMessage`.
- **`Button.js` / `Button.tsx`:**
    - **Responsibility:** Renders a customizable button.
    - **Props:** `title`, `onPress`, `disabled`, `isLoading` (for showing a spinner).
- **`CheckboxItem.js` / `CheckboxItem.tsx`:**
    - **Responsibility:** Renders a single health data type selection item with a checkbox/toggle.
    - **Props:** `label`, `isChecked`, `onToggle`, `infoText`.
- **`LoadingIndicator.js` / `LoadingIndicator.tsx`:**
    - **Responsibility:** Displays a loading spinner or progress bar.
- **`ErrorMessage.js` / `ErrorMessage.tsx`:**
    - **Responsibility:** Displays a formatted error message to the user.

### 3.2. Screens (`app/screens/` or `app/(tabs)/`)
These components represent distinct views or pages in the application. They orchestrate UI components and interact with services.

- **`ConfigurationScreen.js` / `ConfigurationScreen.tsx`:**
    - **Responsibility:** Manages user input for server URL and API key, interacts with `StorageService`.
- **`HealthDataSyncScreen.js` / `HealthDataSyncScreen.tsx`:**
    - **Responsibility:** Displays health data types, handles selection, initiates sync process, interacts with `HealthDataService` and `ApiService`.
- **`StatusLogScreen.js` / `StatusLogScreen.tsx` (Optional):**
    - **Responsibility:** Displays recent sync status and logs.

### 3.3. Services/Utilities (`services/` or `utils/`)
These modules encapsulate business logic, data fetching, and platform-specific interactions. They should not contain UI elements.

- **`StorageService.js` / `StorageService.ts`:**
    - **Responsibility:** Handles reading from and writing to local storage (AsyncStorage, SecureStore).
    - **Methods:** `saveConfig(url, apiKey)`, `getConfig()`, `saveSelectedDataTypes(types)`, `getSelectedDataTypes()`, `saveLastSyncTimestamp(timestamp)`.
- **`PermissionService.js` / `PermissionService.ts`:**
    - **Responsibility:** Manages health data permissions for both Android and iOS.
    - **Methods:** `requestHealthPermissions(dataTypes)`, `checkHealthPermissions(dataTypes)`.
- **`HealthDataService.js` / `HealthDataService.ts`:**
    - **Responsibility:** Abstracts interaction with platform-specific health APIs.
    - **Methods:** `getSteps(startDate, endDate)`, `getHeartRate(startDate, endDate)`, `getAllSelectedHealthData(selectedTypes, startDate, endDate)`.
    - Internally calls `AndroidHealthConnectService` or `AppleHealthKitService`.
- **`ApiService.js` / `ApiService.ts`:**
    - **Responsibility:** Handles all communication with the user's external server.
    - **Methods:** `sendHealthData(data, config)`.
    - Uses `axios` internally.
- **`DataTransformer.js` / `DataTransformer.ts`:**
    - **Responsibility:** Converts raw health data from platform-specific formats into a standardized format for API submission.
    - **Methods:** `transformHealthConnectData(data)`, `transformHealthKitData(data)`, `standardizeData(platformData)`.

### 3.4. Platform-Specific Implementations (`services/health/android/`, `services/health/ios/`)
To keep `HealthDataService` clean and to manage platform-specific code, dedicated modules will handle the direct interaction with Health Connect and HealthKit.

- **`AndroidHealthConnectService.js` / `AndroidHealthConnectService.ts`:**
    - **Responsibility:** Direct interaction with `expo-health-connect`.
    - **Methods:** `getStepsFromHC()`, `getHeartRateFromHC()`, etc.
- **`AppleHealthKitService.js` / `AppleHealthKitService.ts`:**
    - **Responsibility:** Direct interaction with `expo-healthkit` (or similar).
    - **Methods:** `getStepsFromHK()`, `getHeartRateFromHK()`, etc.

## 4. Extensibility Points
- **Adding New Health Data Types:**
    - Update `HealthDataService` to include the new data type.
    - Add corresponding permission declarations.
    - Implement retrieval logic in `AndroidHealthConnectService` and `AppleHealthKitService`.
    - Update `DataTransformer` to handle the new data type's format.
    - Add the new data type to the `HealthDataSyncScreen` UI.
- **Changing API Structure:**
    - Modifications primarily confined to `ApiService` and `DataTransformer`.
- **Adding New Features (e.g., Scheduled Sync):**
    - New UI components and screens as needed.
    - New methods in `StorageService` for scheduling preferences.
    - Integration with Expo background tasks or native scheduling APIs.
- **Alternative Storage Solutions:**
    - `StorageService` can be easily swapped out for a different implementation (e.g., Redux Persist, Realm DB) without affecting other parts of the app.

## 5. Benefits of This Approach
- **Clear Responsibilities:** Each file/module has a specific job, making the codebase easier to understand.
- **Easier Debugging:** Issues can be isolated to specific modules.
- **Improved Testability:** Individual components and services can be tested in isolation.
- **Faster Development:** Reusable components and services reduce redundant code.
- **Scalability:** New features can be added with minimal impact on existing code.
- **Team Collaboration:** Different team members can work on different modules simultaneously.