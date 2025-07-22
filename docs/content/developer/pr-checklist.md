# Pull Request Checklist

This checklist outlines the essential steps and considerations for submitting a Pull Request (PR) to the SparkyFitness project. Following these guidelines helps ensure a smooth review process and high-quality contributions.

## Pull Request Process

1.  **Create a feature branch** from `main`: Always base your changes on the latest `main` branch to avoid merge conflicts.
    ```bash
    git checkout main
    git pull origin main
    git checkout -b feature/your-feature-name
    ```
2.  **Make your changes** following existing patterns: Adhere to the project's coding standards and architectural patterns.
3.  **Test thoroughly** using the development environment: Ensure your changes work as expected and do not introduce regressions. Run relevant tests (unit, integration, end-to-end).
4.  **Submit a PR** with clear description of changes:
    *   Provide a concise and informative title.
    *   Describe the problem your PR solves and how it solves it.
    *   Include screenshots or GIFs for UI changes.
    *   Reference any related issues (e.g., `Fixes #123`, `Closes #456`).
5.  **Respond to feedback** from reviewers promptly: Be open to suggestions and be prepared to iterate on your changes based on feedback.

## Before Submitting Your PR

*   **Code Quality**: Ensure your code adheres to the project's code standards. Run linters and formatters.
    *   Refer to the [Development Workflow](./development-workflow) for code quality tools.
*   **Documentation**: Update relevant documentation (this docs site, inline comments, `README.md`s) for any new features, changes, or bug fixes.
*   **Dependencies**: If you've added new dependencies, ensure they are necessary and properly documented.
*   **Security**: Consider any security implications of your changes.

By following this checklist, you contribute to maintaining a high standard of quality and collaboration within the SparkyFitness project.