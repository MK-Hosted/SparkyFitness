# UI/UX Design for SparkyFitnessMobile

This document details the proposed UI/UX for the SparkyFitnessMobile application, focusing on user interaction, screen layouts, and component design.

## 1. Core Principles
- **Simplicity:** Clean and uncluttered interfaces.
- **Intuitiveness:** Easy to understand and navigate without prior knowledge.
- **Control:** Users should feel in control of their data and settings.
- **Feedback:** Clear and immediate feedback for all user actions.
- **Consistency:** Uniform design elements and interactions across the app.

## 2. Screen Flows

### 2.1. Initial Launch / Onboarding (First Time User)
1. **Welcome Screen:** Briefly introduces the app's purpose.
2. **Permissions Request:** Guides the user through granting necessary health data permissions (Android Health Connect, Apple HealthKit).
3. **Configuration Setup:** Directs the user to the Configuration Screen to set up their server details.

### 2.2. Main Application Flow

#### Screen 1: Configuration
This screen allows users to input and manage their server details.

**Layout:**
- **Header:** "Server Configuration"
- **Input Field: Server URL**
    - Label: "Your Server URL"
    - Placeholder: `https://your-api.com/health-data`
    - Input Type: URL (keyboard optimized for URLs)
    - Validation: Basic URL format validation.
- **Input Field: API Key**
    - Label: "Your API Key"
    - Placeholder: `sk_live_xxxxxxxxxxxxxxxxxxxx`
    - Input Type: Text (secure entry, masked characters)
    - Validation: Optional, but can check for minimum length.
- **Button: Save Configuration**
    - Primary action button.
    - Changes state (e.g., "Saving...", "Saved!") upon successful save.
- **Feedback Message:** (Optional) Displays success or error messages after saving.

**Interactions:**
- Users can type in or paste their server URL and API key.
- Tapping "Save Configuration" attempts to save the data locally.
- Visual feedback (e.g., a toast message or temporary text change on the button) confirms success or indicates an error.

#### Screen 2: Health Data Selection & Sync
This screen allows users to select which health data types to send and initiate data synchronization.

**Layout:**
- **Header:** "Health Data & Sync"
- **Section: Select Data Types**
    - **List of Checkboxes/Toggles:**
        - Each item represents a health data type (e.g., "Steps", "Heart Rate", "Sleep Analysis", "Active Energy Burned", "Body Mass Index").
        - Each item has a clear label and a toggle/checkbox.
        - (Optional) Small info icon next to each data type to explain what it entails.
    - **Button: Select All / Deselect All** (Optional, for convenience)
- **Section: Sync Actions**
    - **Button: Sync Now**
        - Primary action to immediately send selected data.
        - Disabled if no data types are selected or if configuration is incomplete.
    - **Text: Last Synced:** `[Timestamp of last successful sync]` (e.g., "Last synced: 2025-07-22 10:30 AM")
    - **Progress Indicator:** (Optional) A small spinner or progress bar during data retrieval/sending.
- **Feedback Message:** (Optional) Displays success or error messages after sync attempt.

**Interactions:**
- Users can toggle individual health data types.
- Tapping "Sync Now" triggers the data retrieval and API submission process.
- During sync, the "Sync Now" button might change to "Syncing..." and be disabled.
- Success or failure messages are displayed.

## 3. Component Design

### 3.1. InputField Component
A reusable component for text input.

**Props:**
- `label`: String (e.g., "Server URL")
- `placeholder`: String
- `value`: String (controlled component)
- `onChangeText`: Function
- `secureTextEntry`: Boolean (for API Key)
- `keyboardType`: String (e.g., "url", "default")
- `errorMessage`: String (optional, for validation feedback)

### 3.2. CheckboxItem Component
A reusable component for selecting data types.

**Props:**
- `label`: String (e.g., "Steps")
- `isChecked`: Boolean
- `onToggle`: Function
- `infoText`: String (optional, for tooltip/modal)

### 3.3. Button Component
A standardized button.

**Props:**
- `title`: String
- `onPress`: Function
- `disabled`: Boolean
- `isLoading`: Boolean (optional, for showing spinner)

## 4. Navigation
- **Tab-based Navigation:** A bottom tab navigator could be used for "Configuration" and "Health Data & Sync" screens. This provides easy switching between core functionalities.
- **Stack Navigation:** For any deeper dives (e.g., detailed logs, help screens), stack navigation would be appropriate.

## 5. Visual Design (Conceptual)
- **Color Palette:** Use a consistent color scheme (e.g., primary, secondary, accent colors).
- **Typography:** Define clear font sizes and weights for headers, labels, and body text.
- **Icons:** Use intuitive icons for actions and information.

## 6. Error Handling & Feedback
- **Inline Validation:** Provide immediate feedback for invalid inputs (e.g., invalid URL format).
- **Toast Messages:** Short, non-intrusive messages for successful operations (e.g., "Configuration saved!").
- **Alerts/Modals:** For critical errors or important confirmations (e.g., "Permissions denied", "API call failed").
- **Loading States:** Indicate when operations are in progress (e.g., "Syncing data...").

## 7. Future Enhancements (UI/UX)
- **Scheduled Syncs:** Option to set up automatic data synchronization at regular intervals.
- **Data Visualization:** Simple charts or graphs to show trends of collected health data within the app.
- **User Profiles:** If multiple users are intended, a profile management system.
- **Advanced Filtering:** More granular control over data selection (e.g., date ranges).