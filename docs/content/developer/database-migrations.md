# Database Migrations

SparkyFitness uses database migrations to manage changes to its PostgreSQL database schema. This ensures that the database structure can evolve over time in a controlled and versioned manner.

## Overview

Database migrations are essential for:

*   **Version Control**: Tracking changes to the database schema alongside code changes.
*   **Consistency**: Ensuring all development, staging, and production environments have the same database structure.
*   **Collaboration**: Facilitating teamwork by providing a clear way to apply and revert database changes.

## Migration Process

SparkyFitness uses a custom migration system that runs on application startup.

1.  **Migration Files**: Migration scripts are located in the `SparkyFitnessServer/db/migrations/` directory. Each migration is a SQL file (e.g., `YYYYMMDDHHMMSS_migration_name.sql`).
2.  **Version Tracking**: The system tracks applied migrations in a dedicated table (e.g., `schema_migrations`).
3.  **Automatic Application**: When the SparkyFitness server starts, it checks for new, unapplied migration files in the `migrations` directory. It then applies these migrations in chronological order.

## Creating a New Migration

To create a new database migration:

1.  **Create a new SQL file**: In the `SparkyFitnessServer/db/migrations/` directory, create a new `.sql` file with a timestamp prefix (e.g., `20250722000000_add_new_table.sql`).
2.  **Write your SQL changes**: Add your SQL statements (e.g., `CREATE TABLE`, `ALTER TABLE`, `INSERT INTO`) to this file.
3.  **Restart the server**: The migration will be automatically applied the next time the SparkyFitness server starts.

## Example Migration File

```sql
-- SparkyFitnessServer/db/migrations/YYYYMMDDHHMMSS_create_example_table.sql

CREATE TABLE public.example_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any other necessary schema changes or data insertions
```

## Troubleshooting Migrations

*   **Migration Failures**: If a migration fails, the server will typically log an error. Review the server logs for details.
*   **Manual Rollback**: In development, you might need to manually revert database changes if a migration causes issues. In production, ensure you have proper database backups.
*   **Schema Conflicts**: If working in a team, ensure you pull the latest changes before creating new migrations to avoid conflicts.

For more details on the migration logic, refer to `SparkyFitnessServer/utils/dbMigrations.js`.