# TactiVision IA

TactiVision IA is a web platform for intelligent soccer tactical analysis.

## Current Prototype

The current prototype verifies the connection between:

- React + TypeScript frontend
- FastAPI backend
- PostgreSQL database on Neon

The frontend provides a system verification button that checks the backend and database connection.

## Technologies

### Frontend
- React
- TypeScript
- Vite

### Backend
- Python
- FastAPI
- Uvicorn

### Database
- PostgreSQL
- Neon

## Run the frontend

Install dependencies:

```cmd
npm install
```

Start the development server:

```cmd
npm run dev
```

The frontend uses:

```text
http://localhost:5173
```

The local backend uses:

```text
http://localhost:8000
```

The backend URL is configured through:

```env
VITE_API_URL=http://localhost:8000
```

## Available scripts

```cmd
npm run dev
npm run build
npm run lint
npm run preview
```

## Project structure

```text
src/
├── App.tsx
├── App.css
├── index.css
└── main.tsx

public/
└── favicon.svg
```

## Scope

This repository currently contains the initial system connectivity prototype.

Future tactical analysis features will be incorporated in later development stages.
