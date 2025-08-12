# SparkyFitness Mobile App - Technical Design Document

## 1. Overview

This document outlines the technical design and architecture for the SparkyFitness mobile application. The application will allow users to configure their server details, select health data to track (starting with steps), and sync this data with their personal SparkyFitness server.

The initial version will be for Android, with a technology choice that allows for future expansion to iOS.

## 2. Technology Stack

*   **Framework:** React Native. This is a cross-platform framework that will allow for a single codebase to be used for both Android and iOS in the future, as requested.
*   **Health Data Integration:** `react-native-health-connect`. This library will be used to read health data from Android's Health Connect.
*   **Local Storage:** `AsyncStorage` (built into React Native) will be used for persisting the server URL and API key.
*   **API Client:** `axios` or the built-in `fetch` API for making REST API calls to the SparkyFitness server.

## 3. High-Level Architecture

The application will have a simple, single-screen interface for the initial version.

```mermaid
graph TD
    A[User Launches App] --> B{Configuration Present?};
    B -- No --> C[Settings Screen: Enter URL/API Key];
    B -- Yes --> D[Main Screen];
    C --> E[Save Configuration];
    E --> D;
    D --> F[Select Health Data (Steps Checkbox)];
    D --> G[Select Sync Range (24h, 3d, 7d)];
    D --> H[Sync Button];
    H --> I[Read Health Data via Health Connect];
    I --> J[Aggregate Data by Date];
    J --> K[Send Data to SparkyFitness Server];
    K --> L[Display Sync Status];
    D --> M[Edit/Delete Configuration];
    M --> C;
```

## 4. API Design (Mobile to Server)

The mobile app will communicate with the SparkyFitness server via a REST API.

**Endpoint:** `POST /health-data`

**Request Body:**

The body should be an array of data entries. For steps, the server expects the `type` to be `step`.

```json
[
  {
    "type": "step",
    "date": "2025-08-11",
    "value": 10500
  },
  {
    "type": "step",
    "date": "2025-08-10",
    "value": 8200
  }
]
```

**Headers:**

*   `Authorization`: `Bearer <API_KEY>`
*   `Content-Type`: `application/json`

## 5. Data Flow for Sync

1.  User clicks the "Sync" button.
2.  The app reads the saved server URL and API key from local storage.
3.  The app requests permission to read "Steps" data from Health Connect.
4.  User selects a sync duration (24 hours, 3 days, or 7 days) from a dropdown.
5.  If permission is granted, the app fetches the steps data for the selected period.
6.  The app aggregates the step counts, summing them up for each distinct date.
7.  The app constructs a JSON payload with the aggregated steps data, conforming to the server's expected format.
8.  The app sends a `POST` request to `https://<USER_SERVER_URL>/health-data` with the payload and API key in the header.
9.  The app displays a success or failure message to the user based on the server's response.

## 6. Project Structure

A new directory `SparkyFitnessMobile` will be created.

```
SparkyFitnessMobile/
├── android/
├── ios/
├── src/
│   ├── components/
│   │   └── SettingsForm.js
│   ├── screens/
│   │   └── MainScreen.js
│   ├── services/
│   │   ├── api.js
│   │   └── storage.js
│   └── App.js
├── docs/
│   └── technical-design-document.md
├── package.json
└── ... (other react-native files)