# SparkyFitnessMobile App Documentation

This document outlines the architecture, UI/UX considerations, and implementation details for the SparkyFitnessMobile application.

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [UI/UX Design](#uiux-design)
4. [Data Flow](#data-flow)
5. [Health Data Integration](#health-data-integration)
6. [API Integration](#api-integration)
7. [Extensibility and Modularity](#extensibility-and-modularity)
8. [Running and Testing](#running-and-testing)

## 1. Introduction
The SparkyFitnessMobile app aims to provide a user-friendly interface for collecting health data from Android (Health Connect) and Apple (HealthKit) devices and securely sending it to a user-defined server via a REST API. Users will have control over which health data types are sent and will be able to configure their server endpoint and API key.

## 2. Architecture Overview
The application will be built using Expo, leveraging React Native for cross-platform compatibility. Key architectural components will include:
- **User Interface (UI):** Built with React Native components, focusing on clarity and ease of use for configuration and data selection.
- **Health Data Module:** Responsible for interacting with platform-specific health APIs (Health Connect for Android, HealthKit for iOS) to request permissions and retrieve data.
- **API Integration Module:** Handles secure communication with the user's server, including API key management and data transmission.
- **Local Storage:** For persisting user configurations (server URL, API key, selected data types).

## 3. UI/UX Design
The UI will prioritize simplicity and intuitive navigation.

### Key Screens:
- **Configuration Screen:**
    - Input fields for "Server URL" and "API Key".
    - Clear labels and validation for inputs.
    - A "Save" button to persist settings.
- **Health Data Selection Screen:**
    - A list of available health data types (e.g., steps, heart rate, sleep, calories burned).
    - Checkboxes or toggles for users to select/deselect data types.
    - A "Sync Now" or "Send Data" button.
- **Status/Log Screen (Optional but Recommended):**
    - Displays the status of data synchronization (e.g., "Last synced: [timestamp]", "Data sent successfully", "Error: [error message]").
    - A log of recent data transmissions.

### UI/UX Principles:
- **Clarity:** Ensure all options and actions are clearly understandable.
- **Control:** Give users full control over their data and where it goes.
- **Feedback:** Provide immediate visual feedback for user actions (e.g., successful save, data sending progress).
- **Accessibility:** Design with accessibility in mind for all users.

## 4. Data Flow
1. **User Configuration:** User enters Server URL and API Key on the Configuration Screen. These are saved locally.
2. **Health Data Selection:** User selects desired health data types on the Health Data Selection Screen. These preferences are saved locally.
3. **Permission Request:** Upon first access or when new data types are selected, the app requests necessary health data permissions from the OS.
4. **Data Retrieval:** The Health Data Module retrieves selected health data from Health Connect/HealthKit.
5. **Data Preparation:** Retrieved data is formatted into a standardized structure suitable for API transmission.
6. **API Transmission:** The API Integration Module sends the prepared data to the user's server using the configured URL and API Key.
7. **Status Update:** The app updates its internal state and potentially the Status/Log Screen with the result of the transmission.

## 5. Health Data Integration
- **Android (Health Connect):** Utilize `expo-health-connect` to interact with Android's Health Connect API. This will involve requesting permissions for specific data types and querying the Health Connect store.
- **Apple (HealthKit):** Utilize `expo-healthkit` (or a similar library if `expo-healthkit` is not available/suitable) to interact with Apple's HealthKit. This will involve requesting authorization and fetching health data.

## 6. API Integration
- **HTTP Client:** `axios` will be used for making HTTP requests to the user's server.
- **Authentication:** The API Key will be sent as part of the request headers (e.g., `Authorization: Bearer YOUR_API_KEY`) or as a query parameter, depending on the server's requirements.
- **Error Handling:** Robust error handling will be implemented for API calls, including network errors, server errors, and invalid API keys.

## 7. Extensibility and Modularity
The application will be designed with modularity in mind to facilitate future enhancements:
- **Separate Modules:** Health data handling, API communication, and UI components will be separated into distinct modules/files.
- **Configuration-driven:** Data types and API endpoints can be easily extended or modified through configuration.
- **Component-based UI:** Reusable React Native components will be created for common UI elements.

## 8. Running and Testing
Detailed instructions for setting up the development environment, running the app on emulators/devices, and testing data transmission will be provided. This will include:
- Prerequisites (Node.js, Expo CLI).
- Installation steps.
- Running the app.
- Testing with mock servers or actual server endpoints.