# Troubleshooting

This page provides common troubleshooting tips and solutions for developers working with SparkyFitness.

## Common Issues and Solutions

### Port Conflicts

If you encounter errors indicating that a port is already in use, another application is likely using one of the ports required by SparkyFitness (e.g., 8080 for frontend, 3010 for backend, 5432 for PostgreSQL).

**Solution:**
1.  **Identify the conflicting process**:
    *   On Linux/macOS: `lsof -i :<port_number>` (e.g., `lsof -i :8080`)
    *   On Windows: `netstat -ano | findstr :<port_number>` followed by `taskkill /PID <PID> /F`
2.  **Stop the conflicting service** or **change the port** in your `.env` file.

### Database Connection Issues

Problems connecting to the PostgreSQL database can arise from incorrect credentials, the database not running, or network issues.

**Solution:**
1.  **Check database logs**:
    ```bash
    ./docker/docker-helper.sh dev logs sparkyfitness-db
    ```
2.  **Verify `.env` settings**: Ensure `SPARKY_FITNESS_DB_NAME`, `SPARKY_FITNESS_DB_USER`, and `SPARKY_FITNESS_DB_PASSWORD` are correct.
3.  **Reset database (Development only!)**: If data integrity is not critical, you can perform a destructive reset.
    ```bash
    ./docker/docker-helper.sh dev down
    ./docker/docker-helper.sh dev clean
    ./docker/docker-helper.sh dev up
    ```

### Build Failures

Issues during the build process (e.g., `npm install` or Docker image builds) can be caused by corrupted caches or dependency problems.

**Solution:**
1.  **Clean rebuild**:
    ```bash
    ./docker/docker-helper.sh dev build --no-cache
    ```
2.  **Full reset**:
    ```bash
    ./docker/docker-helper.sh dev clean
    ./docker/docker-helper.sh dev up
    ```

### Permission Issues (Linux/WSL)

On Linux or Windows Subsystem for Linux (WSL), you might encounter permission errors related to Docker volumes, especially for the PostgreSQL data directory.

**Solution:**
1.  **Fix volume permissions**:
    ```bash
    sudo chown -R $USER:$USER ./postgresql
    ```

### "Invalid key length" error

This error typically indicates that your `SPARKY_FITNESS_API_ENCRYPTION_KEY` in your `.env` file is not correctly configured. Ensure it is a 64-character hexadecimal string, as mentioned in the example `.env` file and installation guides.

**Solution:**
Generate a valid key using:
```bash
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Debugging Tips

### View Logs

*   **All services**: `./docker/docker-helper.sh dev logs`
*   **Specific service**: `./docker/docker-helper.sh dev logs sparkyfitness-frontend`
*   **Follow logs in real-time**: `docker-compose -f docker/docker-compose.dev.yml logs -f`

### Container Inspection

*   **List running containers**: `./docker/docker-helper.sh dev ps`
*   **Execute commands in container**:
    *   `docker exec -it sparkyfitness-frontend-1 sh`
    *   `docker exec -it sparkyfitness-server-1 sh`
    *   `docker exec -it sparkyfitness-db-1 psql -U sparky -d sparkyfitness_db`

## Getting Help

If you're still facing issues, consider reaching out to the community:

*   **Discord Community**: https://discord.gg/vcnMT5cPEA
*   **GitHub Discussions**: Post questions and issues
*   **Documentation**: Search this comprehensive documentation site.