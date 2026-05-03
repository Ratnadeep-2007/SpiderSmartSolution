# Technology Stack - Spider Smart Solution IMS

This document provides a comprehensive overview of the technologies, libraries, and tools used in the Inventory Management System (IMS).

## Frontend (React Single Page Application)
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:**
  - [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
  - [shadcn/ui](https://ui.shadcn.com/) for high-quality, accessible UI components.
  - [Lucide React](https://lucide.dev/) for iconography.
- **State Management:** [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) for lightweight global state.
- **Form Management:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for schema validation.
- **Routing:** [React Router](https://reactrouter.com/) (if applicable, or internal state-based routing).
- **Charts:** [Recharts](https://recharts.org/) for analytics and reporting visualizations.
- **API Client:** [Axios](https://axios-http.com/) for backend communication.

## Backend (FastAPI Python Application)
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13)
- **Asynchronous Engine:** [Uvicorn](https://www.uvicorn.org/) as the ASGI server.
- **Data Validation:** [Pydantic v2](https://docs.pydantic.dev/latest/) for request/response schemas and settings management.
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (Async) for database interactions.
- **Database Migrations:** [Alembic](https://alembic.sqlalchemy.org/) for version-controlled schema changes.
- **Security:**
  - [PyJWT](https://pyjwt.readthedocs.io/) for JSON Web Token (JWT) implementation.
  - [Passlib](https://passlib.readthedocs.io/) with bcrypt for password hashing.
- **Utilities:**
  - [Python-multipart](https://andrew-d.github.io/python-multipart/) for form-data and file uploads.
  - [WeasyPrint](https://weasyprint.org/) for PDF report generation.

## Database & Infrastructure
- **Provider:** [Supabase](https://supabase.com/)
- **Engine:** [PostgreSQL 15](https://www.postgresql.org/)
- **Key DB Features:**
  - **Full-Text Search:** Utilizing PostgreSQL `tsvector` and `tsquery` with GIN indexes for high-performance record searching.
  - **Generated Columns:** For real-time search vector updates.
  - **Triggers/Procedures:** (As needed for complex audit or automation logic).

## Security & Compliance
- **Authentication:** JWT-based stateless authentication (HS256).
- **Authorization:** Role-Based Access Control (RBAC) supporting Admin, Auditor, and User roles.
- **Audit Logging:** SHA-256 cryptographic chaining for tamper-evident audit trails.

## Development & DevOps
- **Environment Management:** `.env` files for configuration.
- **Package Managers:** `npm` (Frontend) and `pip` (Backend).
- **Version Control:** Git.
