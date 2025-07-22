# Directory Structure

Understanding the project's directory structure is crucial for navigating the codebase and contributing effectively. SparkyFitness follows a logical organization to separate frontend, backend, and documentation concerns.

## Root Directory (`SparkyFitness/`)

The top-level directory contains configuration files and the main project folders:

```
SparkyFitness/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   ├── contexts/                 # React Context providers
│   ├── hooks/                    # Custom React hooks
│   ├── pages/                    # Page-level components
│   ├── services/                 # API service layer
│   └── utils/                    # Shared utilities
├── SparkyFitnessServer/          # Backend Node.js application
│   ├── models/                   # Repository pattern (database layer)
│   ├── routes/                   # Express route handlers
│   ├── integrations/             # External API integrations
│   ├── ai/                       # AI provider configurations
│   ├── middleware/               # Express middleware
│   └── utils/                    # Backend utilities
├── docker/                       # Docker configuration files
└── docs/                         # Documentation site (Nuxt Content)
```

## Key Directories Explained

### `src/` (Frontend)

This directory houses the entire React frontend application.

*   **`src/components/`**: Contains reusable UI components that can be used across different pages.
*   **`src/contexts/`**: Holds React Context providers for managing global state (e.g., user preferences, chatbot visibility).
*   **`src/hooks/`**: Custom React hooks for encapsulating reusable logic.
*   **`src/pages/`**: Top-level components that represent different views or routes in the application.
*   **`src/services/`**: Contains the API service layer for interacting with the backend.
*   **`src/utils/`**: General utility functions and helpers used throughout the frontend.

### `SparkyFitnessServer/` (Backend)

This directory contains the Node.js/Express backend application.

*   **`SparkyFitnessServer/models/`**: Implements the repository pattern for database interactions, abstracting data access logic.
*   **`SparkyFitnessServer/routes/`**: Defines the Express route handlers for the API endpoints.
*   **`SparkyFitnessServer/integrations/`**: Manages integrations with external APIs and services (e.g., food databases, exercise APIs).
*   **`SparkyFitnessServer/ai/`**: Contains configurations and logic related to AI provider integrations.
*   **`SparkyFitnessServer/middleware/`**: Express middleware functions for request processing (e.g., authentication, error handling).
*   **`SparkyFitnessServer/utils/`**: Utility functions and helpers specific to the backend.

### `docker/`

This directory contains all Docker-related configuration files, including `Dockerfile`s and `docker-compose` files for both development and production environments.

### `docs/`

This directory contains the source files for this documentation website, built using Nuxt Content and Docus.