# Internship Records API

A beginner-friendly REST API built with **Node.js, Express and SQLite**. It supports CRUD operations, input validation, search, filtering and pagination.

## Features

- `GET /api/internships` — list, search, filter and paginate records
- `GET /api/internships/:id` — retrieve one record
- `POST /api/internships` — create a record
- `PUT /api/internships/:id` — replace a record
- `PATCH /api/internships/:id` — update selected fields
- `DELETE /api/internships/:id` — delete a record
- `GET /api/health` — health check
- SQLite persistence with schema and fictional seed records
- Consistent JSON success and error response shapes
- Validation for required fields, string lengths, numeric ranges and status values

## Requirements

- Node.js 18 or newer
- npm

Check versions:

```bash
node -v
npm -v
```

## Setup

```bash
npm install
npm run seed
npm run dev
```

The API runs at `http://localhost:3000`.

For normal start (without auto-reload):

```bash
npm start
```

The SQLite database is created automatically at `data/internships.db`. The database file is ignored by Git; the schema and seed data are committed so reviewers can recreate it.

## Data model

| Field | Type | Required | Rules |
|---|---|---:|---|
| id | integer | generated | Primary key |
| title | string | yes | 3–100 characters |
| company | string | yes | 2–100 characters |
| domain | string | yes | 2–60 characters |
| location | string | yes | 2–100 characters |
| duration_months | integer | yes | 1–24 |
| stipend | integer | no | 0–10,000,000; defaults to 0 |
| description | string | no | Up to 1,000 characters |
| status | string | no | `open` or `closed`; defaults to `open` |
| created_at | timestamp | generated | Creation time |
| updated_at | timestamp | generated | Last update time |

The SQLite schema is also provided in `data/schema.sql`.

## API contract

Base URL: `http://localhost:3000`

### List and pagination

```http
GET /api/internships?page=1&limit=10
```

Optional query parameters:
- `page`: positive integer, default `1`
- `limit`: integer from `1` to `100`, default `10`
- `q`: searches title, company and description
- `domain`: exact domain filter

Successful list response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

### Create record

```http
POST /api/internships
Content-Type: application/json
```

```json
{
  "title": "React Developer Intern",
  "company": "Northstar Apps",
  "domain": "Web Development",
  "location": "Remote",
  "duration_months": 3,
  "stipend": 12000,
  "description": "Build reusable React user interface components.",
  "status": "open"
}
```

Returns `201 Created`.

### Detail, update and delete

```http
GET    /api/internships/1
PUT    /api/internships/1
PATCH  /api/internships/1
DELETE /api/internships/1
```

`PUT` expects the complete required record. `PATCH` accepts one or more valid fields.

## Status codes

| Code | Meaning |
|---|---|
| 200 | Successful read, update or delete |
| 201 | Record created |
| 400 | Invalid ID, pagination or malformed JSON |
| 404 | Record or route not found |
| 422 | Input validation failed |
| 500 | Unexpected server error |

Error response example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": {
      "title": "Must be 3–100 characters."
    }
  }
}
```

## Test the API

You can use the REST Client VS Code extension with `examples/requests.http`, Postman, Thunder Client, or curl.

Health check:

```bash
curl http://localhost:3000/api/health
```

List records:

```bash
curl "http://localhost:3000/api/internships?page=1&limit=3"
```

Create record:

```bash
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Intern","company":"TestWorks","domain":"Testing","location":"Remote","duration_months":2}'
```

## Project structure

```text
internship-api/
├── data/
│   ├── schema.sql
│   └── seed.json
├── examples/
│   └── requests.http
├── src/
│   ├── app.js
│   ├── db.js
│   ├── seed.js
│   ├── server.js
│   └── validation.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Notes

- The seed records are fictional examples.
- Run `npm run seed` to reset the database to the supplied sample records.
- This project is an educational API starter, not a production deployment. For production, add authentication, rate limiting, structured logging, automated tests and deployment-specific database backups.
