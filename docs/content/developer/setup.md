# Development Environment Setup

This guide provides detailed instructions on setting up your development environment for SparkyFitness. A well-configured environment is crucial for efficient development and testing.

## Prerequisites

Before you begin, ensure you have the following installed:

### For Docker Deployment (Recommended)

*   **Docker & Docker Compose**: Essential for running SparkyFitness in containerized environments.
*   **Git**: For cloning the SparkyFitness repository.

### For Local Development (without Docker)

*   **Node.js 18+** and **npm**: The JavaScript runtime and package manager.
*   **PostgreSQL 15+**: The database server.
*   **Git**: For version control.

## Quick Start (Docker Recommended)

The fastest way to get SparkyFitness running is using our Docker helper script:

```bash
# Clone the repository
git clone https://github.com/CodeWithCJ/SparkyFitness.git
cd SparkyFitness

# Copy environment template
cp docker/.env.example .env

# Start development environment (with live reloading)
./docker/docker-helper.sh dev up

# Access the application at http://localhost:8080
```

## Installation Options

Choose the deployment method that best fits your needs:

### 🔧 Development Setup (Docker)

For local development with live reloading using Docker:

1.  **Configure Environment**:
    ```bash
    cp docker/.env.example .env
    # Edit .env with your development settings
    ```
2.  **Start Development Environment**:
    ```bash
    # Start all services with live reloading
    ./docker/docker-helper.sh dev up
    ```
3.  **Access Services**:
    *   Frontend: `http://localhost:8080` (live reloading)
    *   Backend API: `http://localhost:3010`
    *   Database: `localhost:5432`

### 🖥️ Local Development (No Docker)

For pure local development without containers:

1.  **Setup Environment**:
    ```bash
    # Copy environment file
    cp docker/.env.example .env
    
    # Install dependencies
    npm install
    cd SparkyFitnessServer && npm install && cd ..
    ```
2.  **Start Services**:
    ```bash
    # Terminal 1: Start backend
    npm run start-backend
    
    # Terminal 2: Start frontend
    npm run dev
    ```
3.  **Access Application**:
    *   Frontend: `http://localhost:8080`
    *   Backend: `http://localhost:3010`

## Environment Configuration

### Required Variables

Copy `docker/.env.example` to `.env` and configure these essential variables:

```bash
# Database Configuration
SPARKY_FITNESS_DB_NAME=sparkyfitness_db
SPARKY_FITNESS_DB_USER=sparky
SPARKY_FITNESS_DB_PASSWORD=your_secure_password

# Backend Configuration
SPARKY_FITNESS_SERVER_HOST=sparkyfitness-server
SPARKY_FITNESS_SERVER_PORT=3010
SPARKY_FITNESS_FRONTEND_URL=http://localhost:8080

# Security (Generate secure keys!)
SPARKY_FITNESS_API_ENCRYPTION_KEY=your_64_character_hex_encryption_key
JWT_SECRET=your_jwt_signing_secret

# Admin Setup
SPARKY_FITNESS_ADMIN_EMAIL=admin@example.com
SPARKY_FITNESS_FORCE_EMAIL_LOGIN=true
```

### Generating Secure Keys

```bash
# Generate encryption key (64-char hex)
openssl rand -hex 32

# Generate JWT secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"