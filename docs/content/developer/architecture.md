# Architecture

SparkyFitness is built with a modern, full-stack architecture designed for scalability, maintainability, and performance.

## High-Level Overview

The application follows a client-server model, with a clear separation of concerns between the frontend, backend, and database.

```mermaid
graph TD
    User ---> Frontend (React)
    Frontend --> Backend (Node.js/Express)
    Backend --> Database (PostgreSQL)
    Backend --> AI Services (OpenAI, Google Gemini, Anthropic)
    Backend --> External APIs (Nutritionix, OpenFoodFacts, FatSecret, Wger)
```

## Components

### Frontend (src/)

*   **Technology**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
*   **Purpose**: Provides the user interface for interacting with the application. Handles data presentation, user input, and client-side logic.
*   **Key Features**:
    *   Responsive design for various devices.
    *   State management using React Context and TanStack Query.
    *   Modular components for reusability.

### Backend (SparkyFitnessServer/)

*   **Technology**: Node.js, Express.js
*   **Purpose**: Serves as the application's API layer. Handles business logic, data processing, authentication, and integration with external services.
*   **Key Features**:
    *   RESTful API endpoints.
    *   Authentication and authorization (JWT, RLS).
    *   Integration with AI services for nutrition coaching and data processing.
    *   Integration with external food and exercise databases.
    *   Repository pattern for database interactions.

### Database

*   **Technology**: PostgreSQL
*   **Purpose**: Stores all application data, including user profiles, food entries, exercise logs, measurements, goals, and chat history.
*   **Key Features**:
    *   Row Level Security (RLS) for data privacy.
    *   UUIDs for primary keys.
    *   Database migrations for schema management.

### AI Integration

*   **Technology**: OpenAI, Google Gemini, Anthropic (configurable)
*   **Purpose**: Powers the Sparky Buddy AI Nutrition Coach, enabling natural language interaction for logging food, exercise, and measurements, and providing personalized guidance.

### External API Integrations

*   **Purpose**: Extends the application's data capabilities by integrating with third-party services for comprehensive food and exercise data.
*   **Examples**: Nutritionix, OpenFoodFacts, FatSecret (for food data), Wger (for exercise data).

## Data Flow

User interactions on the frontend trigger API calls to the backend. The backend processes these requests, interacts with the PostgreSQL database and external AI/data services, and returns responses to the frontend. Data is secured using JWT for API authentication and RLS at the database level.