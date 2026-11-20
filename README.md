# Limkokwing Student Services

A responsive React portal for university services. Students must sign in with a verified Google account, submit their student ID for university approval, and wait for an administrator before they can use the portal. Approved students can submit and track Firestore-backed requests.

## Features

- Home page and searchable catalogue of six student services
- Dynamic service details and request routes, nested React Router layout, and a not-found page
- Validated request form and confirmation summary
- Google account sign-in/sign-up choices and administrator-reviewed student registration
- Enrolment form with faculty, Diploma/Degree/TVET level, gender, sponsorship, contact, address, and next-of-kin details; female applicants choose on/off-campus residence, and a unique `901019` + three-digit student ID is allocated on approval (1,000 possible suffixes)
- Student profile page with approved academic, contact, sponsorship, and next-of-kin details
- Registration inputs immediately remove unsupported characters from names, phone numbers, addresses, and sponsor names; validation also checks phone numbers for 7–15 digits and provides inline accessible correction guidance
- Realtime admin queues for registrations and service requests
- A dedicated staff dashboard with approval metrics, registration decisions, request status management, and queue filters
- Dedicated admin pages for registered students, registration review, all service requests, technical support, recommendation letters, and student ID replacement, with searchable queues and live pending counts
- Student request timelines and unread in-app status notifications, with a read-only admin decision history for registration and request status changes. Notification read state is stored per browser; no email or SMS notifications are sent.
- Admin-approved recommendation requests unlock a personalized A4 PDF letter with the student's name, ID, and faculty
- Student ID replacement includes a demo-only M250 payment-method choice (M-Pesa, EcoCash, CPay, cash, or debit/credit card); no transaction is processed and no payment credentials are collected
- An administrator student directory with search, faculty/level filtering and sorting, plus password-confirmed removal of student registrations, service requests, and allocated student IDs; registration changes immediately revoke active portal access
- Owner-scoped student request access and admin-only approval/status updates enforced by Firestore rules
- Responsive layouts, accessible labels, loading and error states

## Run locally

1. Install Node.js (LTS).
2. From this directory, install dependencies and start the app:

   ```sh
   npm install
   npm start
   ```

3. Configure Firebase as described below. Google sign-in and all portal access require Firebase configuration.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. In Firebase Console, enable **Authentication → Sign-in method → Google**. Configure the project's support email and add the development/production site domains under **Authentication → Settings → Authorized domains**.
3. Create a **Cloud Firestore** database.
4. Copy `.env.example` to `.env.local` and replace each placeholder with the Firebase Web app configuration values. Create React App reads `REACT_APP_` variables at build time; restart `npm start` after editing the file.
5. Publish the current rules in `firestore.rules` to the project's Firestore database. Student registration reads are limited to the signed-in student; verified Google users can submit the required enrolment, sponsorship, gender, residence (female applicants), and next-of-kin details. A student can resubmit only after an administrator has rejected the existing application; pending and approved applications cannot be resubmitted. Portal requests require an approved registration. Student ID replacement requests must include one of the listed demo payment methods and the M250 demo amount; no payment is processed. Request and registration status changes are stored in the append-only `activityLogs` collection; students can read their own activity and only the verified Google administrator can read the complete audit history. Only the verified Google account `mohloaiqamo@gmail.com` can review registrations, allocate student IDs, change request statuses, and delete student portal records. Republish the rules whenever request fields, activity logging, or admin capabilities change. Do not replace these rules with open test-mode rules.
6. In this prototype, `mohloaiqamo@gmail.com` is the only admin account. It is automatically recognized as the administrator and the admin portal asks for the password `@63485293krm?` before showing its queues. The password check is client-side and is not a production security boundary; Firestore authorization is enforced by the verified admin Google identity and the deployed rules.
7. Start the app and sign in or create a portal account with a real Google account. New accounts can submit their enrolment details and see their pending/rejected status, but cannot access portal pages until an admin approves them from `/admin`. Rejected students can return to the form with their previous details filled in and resubmit for review. The admin page also lets staff approve or reject service requests and advance their status. A recommendation letter PDF becomes available to the student only after its request is set to `Approved`.

## Use on multiple devices

The portal is a responsive web app; students can open the same Firebase Hosting URL on a phone, tablet, or computer. Registration and request records are stored in Cloud Firestore, so they are available after signing in on another device with the same Google account and Firebase project. Notification read state is currently local to each browser.

To publish the app:

1. Make sure `.env.local` contains the Firebase web app settings for the same project selected in Firebase CLI.
2. Install and sign in to Firebase CLI (`npm install -g firebase-tools`, then `firebase login`).
3. From this project directory, select the Firebase project with `firebase use --add`. Its project ID must match `REACT_APP_FIREBASE_PROJECT_ID` in `.env.local`.
4. Run `npm run deploy`. This builds the app and publishes the `build` folder and `firestore.rules`.
5. In Firebase Console, add the Hosting domain shown after deployment to **Authentication → Settings → Authorized domains** if it is not already listed.
6. Open the same `https://<project-id>.web.app` URL on each device. Google sign-in and student registration are required on each device; the existing student record is shared when the same account is used.

The deploy command updates the project's Firestore rules as well as Hosting. Do not deploy until the correct Firebase project is selected. Local development with `npm start` is only reachable on that computer unless the development server is explicitly exposed to a local network; use the deployed Hosting URL for regular access across devices.

Google sign-in verifies control of a Google account; it does not independently prove university enrollment. Student ID verification is represented by the university admin's registration approval. Firebase Web configuration is public client configuration, not an authorization boundary; the Firestore rules enforce access. If an authenticated student sees a permissions error on sign-in, publish the current `firestore.rules` file in the Firebase Console and sign in again.

Removing a student from the admin directory permanently deletes their Firestore registration, service requests, and allocated student ID. It does not delete or disable their Google account in Firebase Authentication; the account can sign in again and submit a new registration.

The removal confirmation password is configured as `REACT_APP_STUDENT_REMOVAL_PASSWORD` in the ignored `.env.local` file. React app environment values are included in browser code, so this password is a user-interface confirmation only; Firestore rules and the verified administrator Google account remain the authorization boundary.

## Available scripts

- `npm start` — start the development server.
- `npm test -- --watchAll=false` — run tests once.
- `npm run build` — create a production build.

## Project structure

- `src/Portal.jsx` — layout, routes, pages, form, and reusable UI components
- `src/Data/Services.js` — service catalogue
- `src/Data/Payments.js` — demo ID-replacement payment methods and amount
- `src/services/requestService.js` — Firestore request operations
- `src/utils/recommendationLetter.js` — A4 recommendation letter PDF generation
- `src/services/authService.js` — Google authentication, registration, and admin queue operations
- `src/lib/Firebase.js` — Firebase app, Auth, and Firestore configuration
- `src/Portal.css` — portal styles and responsive layouts
- `firestore.rules` — per-owner database access rules
