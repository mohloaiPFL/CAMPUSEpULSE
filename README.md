# Limkokwing Student Services

A responsive React portal for browsing university services and submitting and managing student service requests. Requests are stored in Firebase Cloud Firestore and tied to an anonymous Firebase Authentication session so a student's records are not visible to other portal users.

## Features

- Home page and searchable catalogue of six student services
- Dynamic service details and request routes, nested React Router layout, and a not-found page
- Validated request form and confirmation summary
- Firestore create, realtime read, status update, and delete
- Owner-scoped Firestore rules and anonymous sign-in
- Responsive layouts, accessible labels, loading and error states

## Run locally

1. Install Node.js (LTS).
2. From this directory, install dependencies and start the app:

   ```sh
   npm install
   npm start
   ```

3. Configure Firebase as described below. The UI can be browsed without Firebase configuration, but request submission and the requests page will show an explicit setup error until Firebase is connected.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. In Firebase Console, enable **Authentication → Sign-in method → Anonymous**.
3. Create a **Cloud Firestore** database.
4. Copy `.env.example` to `.env.local` and replace each placeholder with the Firebase Web app configuration values. Create React App reads `REACT_APP_` variables at build time; restart `npm start` after editing the file.
5. Publish the rules in `firestore.rules` to the project's Firestore database. These rules restrict read, update, and delete access to the anonymous account that created each request. Do not replace them with open test-mode rules in a deployed project.
6. Start the app and submit a test request. The requests query filters by the owner and sorts results in the app, so it does not require a composite Firestore index.

The public Firebase Web configuration is intended for client applications, but it does not replace security rules. The rules are the access-control boundary. Anonymous identity is kept by Firebase in the current browser profile; it is not an institution-wide student login. For production use, integrate the university's authenticated identity provider and map authenticated students to their verified student records.

## Available scripts

- `npm start` — start the development server.
- `npm test -- --watchAll=false` — run tests once.
- `npm run build` — create a production build.

## Project structure

- `src/Portal.jsx` — layout, routes, pages, form, and reusable UI components
- `src/Data/Services.js` — service catalogue
- `src/services/requestService.js` — Firestore request operations
- `src/lib/Firebase.js` — Firebase app, Auth, and Firestore configuration
- `src/Portal.css` — portal styles and responsive layouts
- `firestore.rules` — per-owner database access rules
