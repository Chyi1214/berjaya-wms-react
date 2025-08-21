# Berjaya WMS React - GEMINI.md

## Project Overview

This is a Warehouse Management System (WMS) for Berjaya Autotech, built as a modern web application using React. It's designed to be a mobile-first, responsive application for managing inventory, transactions, and other warehouse operations.

The project uses the following technologies:

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **Backend:** Firebase (Authentication and Firestore Database)
*   **Build Tool:** Vite

The application features Google OAuth for authentication and provides different views based on user roles (Logistics, Production, QA, Manager). It uses a state-based routing system and lazy loading for performance optimization.

## Building and Running

### Prerequisites

*   Node.js 18+
*   npm or yarn
*   A Firebase project with Authentication and Firestore enabled.

### Installation and Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Firebase:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file with your Firebase project credentials.

### Key Commands

*   **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

*   **Build for production:**
    ```bash
    npm run build
    ```
    The production-ready files will be generated in the `dist` directory.

*   **Preview the production build:**
    ```bash
    npm run preview
    ```

*   **Run the linter:**
    ```bash
    npm run lint
    ```

## Development Conventions

*   **Styling:** The project uses Tailwind CSS for utility-first styling.
*   **State Management:** State is managed using React Context (`AuthContext`, `LanguageContext`) and component-level state (`useState`, `useEffect`).
*   **Services:** Business logic is separated into services located in the `src/services` directory. This includes services for interacting with Firebase, managing inventory, handling transactions, etc.
*   **Components:** Reusable UI components are located in the `src/components` directory.
*   **Types:** TypeScript types are defined in the `src/types` directory.
*   **Routing:** The application uses a custom state-based routing mechanism within `App.tsx` to switch between different views.
*   **Performance:** Heavy components are lazy-loaded to improve initial page load times. The Vite build is configured with manual chunking to optimize bundle sizes.
