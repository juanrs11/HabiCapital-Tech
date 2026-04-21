# Workspace

## Overview

HabiPay backend API implemented as a Python FastAPI service inside `artifacts/api-server`. The API supports user auth, balances, peer-to-peer transfers, groups/shared expenses, recurring payments, and payment links.

## Stack

- **Backend**: Python 3.11 + FastAPI
- **Database**: PostgreSQL + SQLAlchemy async + asyncpg
- **Migrations**: Alembic
- **Auth**: bcrypt password hashing + JWT bearer tokens
- **Money handling**: PostgreSQL `Numeric(18,2)` and Python `Decimal`; never use floats
- **Monorepo tool**: pnpm workspaces for service scripts

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run the FastAPI API server
- `pnpm --filter @workspace/api-server run build` — compile-check Python files
- `cd artifacts/api-server && alembic upgrade head` — run database migrations

## Architecture Notes

- Main app entrypoint: `artifacts/api-server/app/main.py`
- Database/session setup: `artifacts/api-server/app/db.py`
- Models: `artifacts/api-server/app/models/`
- Schemas: `artifacts/api-server/app/schemas/`
- Routes: `artifacts/api-server/app/routers/`
- Atomic transfer logic: `artifacts/api-server/app/services/transfer_service.py`
- Every money-moving flow uses `execute_transfer()` so transfer behavior is centralized and row-locked with `SELECT FOR UPDATE`.
- The service is mounted at `/api` in Replit but also supports unprefixed routes for local use.
