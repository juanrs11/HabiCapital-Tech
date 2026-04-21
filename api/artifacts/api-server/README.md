python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8080


# HabiPay API

REST API for HabiPay, a peer-to-peer money transfer platform built with Python 3.11, FastAPI, PostgreSQL, SQLAlchemy async, asyncpg, and Alembic.

## Environment variables

Copy `.env.example` to `.env` for local development.

- `DATABASE_URL`: PostgreSQL URL. Use `postgresql+asyncpg://user:password@localhost/habipay` locally.
- `SECRET_KEY`: JWT signing secret.
- `ALGORITHM`: JWT algorithm. Defaults to `HS256`.
- `PORT`: HTTP port. Replit sets this automatically.

## Run locally

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

In this project, the API is served through `/api`, so both `/health` and `/api/health` work.

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <token>
```

Tokens expire after 7 days.

## Endpoints

### Health

- `GET /health` — returns `{ "status": "ok" }`.

### Auth

- `POST /auth/register` — create a user with initial balance `0.00`.
  - Body: `{ "name": "Alice", "email": "alice@example.com", "password": "secret" }`
- `POST /auth/login` — return a JWT token.
  - Body: `{ "email": "alice@example.com", "password": "secret" }`

### Accounts

- `GET /me` — current user profile and balance. Requires JWT.
- `POST /accounts/topup` — add funds to own balance and insert a `top_up` transaction. Requires JWT.
  - Body: `{ "amount": "100.00" }`

### Transfers

- `POST /transfers` — atomic peer-to-peer transfer. Requires JWT.
  - Body: `{ "receiver_id": "uuid", "amount": "25.00", "description": "Dinner" }`
- `GET /transfers/history` — sent, received, and top-up history sorted newest first. Requires JWT.
- `GET /transfers/tags` — unique transfer descriptions for the current user. Requires JWT.

### Groups and shared expenses

- `POST /groups` — create a group. Requires JWT.
  - Body: `{ "name": "Roommates" }`
- `POST /groups/{id}/members` — add a member by user ID. Requires JWT.
  - Body: `{ "user_id": "uuid" }`
- `POST /groups/{id}/expenses` — create an equally split group expense. Requires JWT.
  - Body: `{ "paid_by": "uuid", "total_amount": "60.00", "description": "Groceries" }`
- `GET /groups/{id}/balances` — unsettled net pair balances. Requires JWT.
- `POST /groups/{id}/settle` — transfer debtor to creditor and mark matching splits settled. Requires JWT.
  - Body: `{ "debtor_id": "uuid", "creditor_id": "uuid" }`

### Recurring payments

- `POST /recurring` — create recurring payment. Requires JWT.
  - Body: `{ "to_user_id": "uuid", "amount": "10.00", "label": "Rent", "frequency": "monthly", "start_date": "2026-04-17T00:00:00" }`
- `GET /recurring` — list active recurring payments with `to_name`. Requires JWT.
- `DELETE /recurring/{id}` — cancel a recurring payment. Requires JWT.
- `POST /recurring/tick` — execute due recurring payments. No auth.
  - Returns: `{ "executed": 1, "skipped": 0 }`

### Payment links

- `POST /payment-links` — create a payment link. Requires JWT.
  - Body: `{ "amount": "15.00", "description": "Coffee" }`
- `GET /payment-links` — list links created by current user. Requires JWT.
- `GET /payment-links/{token}` — public payment link details.
- `POST /payment-links/{token}/pay` — pay a link as current JWT user. Requires JWT.

## Financial integrity

All balances and transaction amounts use PostgreSQL `Numeric(18,2)` and Python `Decimal`. Manual transfers, group settlements, recurring ticks, and payment link payments all call `transfer_service.execute_transfer()`, which locks user rows with `SELECT FOR UPDATE`, validates balances, debits the sender, credits the receiver, and inserts the transaction in one database transaction.
