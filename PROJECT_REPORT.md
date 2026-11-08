# CampusPulse Project Tour

## The tiny-kid version

Think of this project like a school office:
TERA KE YENA MONA E AKHEHILEE MONNA COKE 
- **React** builds the desks, signs, and forms students see.
- **React Router** is the hallway that takes students to Home, Services, and Requests without reloading the whole app.
- **Firebase Authentication** gives a browser a temporary visitor badge.
- **Firestore** is the filing cabinet where request forms are kept.
- **Firestore rules** are the lock on that cabinet.

The app lets a student look through services, send a request, and look at the requests made from that browser. It can also change a request's status or delete it.

## What is inside each project folder?

### `public/` — things the browser gets first

This folder has files the browser needs before React starts.

- `index.html` — the empty page where the React app is placed, plus the page title.
- `favicon.ico`, `logo192.png`, and `logo512.png` — browser and app icons from the starter project.
- `manifest.json` — information used if the site is installed like an app.
- `robots.txt` — a small note for search-engine visitors.

### `src/` — the app's working parts

This is the main workshop. The active application is put together from here.

#### The active app files

- `Portal.jsx` — the main app: navigation, pages, forms, service cards, and screen behavior.
- `Portal.css` — the app's colors, layout, and phone/tablet/desktop styling.
- `App.js` — a small signpost that points React to `Portal.jsx`.
- `index.js` — starts React and puts the app inside `public/index.html`.
- `index.css` — imports the app's styles.
- `Data/Services.js` — the list of the six services and their descriptions, departments, and waiting times.
- `services/requestService.js` — talks to Firebase to create, read, update, and delete requests.
- `lib/Firebase.js` — reads Firebase settings and starts Firebase Authentication and Firestore.
- `App.test.js` — checks important things, including the form's name and student-ID rules.
- `setupTests.js` — gives the tests extra browser-like checking tools.
- `reportWebVitals.js` — optional starter-project page-speed measuring helper.
- `logo.svg` — an image left from the original React starter.

#### Older or unused starter pieces

These are older examples/scaffolding. The current running app gets its pages and components from `Portal.jsx`; these files are not the active page implementation.

- `Pages/` — earlier separate page examples, such as Home, Services, and Confirmation.
- `componets/` — earlier small UI examples such as Navbar and Service. The folder name is spelled `componets` in the project.
- `Layouts/` — an earlier page layout example.
- `App.css` — an earlier starter stylesheet; the current design is in `Portal.css`.
- `App.jsx` and `Main.jsx` — older entry-point examples; `index.js` and `App.js` are the active entry path.
- `firebase.js` — an older Firebase example; the active Firebase setup is `lib/Firebase.js`.
- `report.txt` — an empty placeholder file.

### `node_modules/` — downloaded tools

This folder is made by `npm install`. It contains React and all the helper tools the app needs. You normally do not edit it or send it to someone; npm can download it again from the package files.

### `build/` — the ready-to-publish copy

This folder is made by `npm run build`. It contains the compressed version of the website for hosting. If it is missing, run the build command to make it again.

## Important files beside the folders

- `package.json` — the app's shopping list of tools and its shortcuts such as `npm start`.
- `package-lock.json` — the exact versions npm picked, so installs are more repeatable.
- `.env.example` — a blank example showing which Firebase setting names the app expects.
- `.env.local` — your real local Firebase settings. Keep this file private; it is ignored by Git and should not be pasted into chats or committed.
- `.gitignore` — tells Git not to collect private settings, downloaded tools, or generated build files.
- `firestore.rules` — instructions Firebase uses to decide who may read or change a request. Publish these rules in the Firebase Console.
- `README.md` — setup instructions for installing and running the project.
- `PROJECT_REPORT.md` — this friendly tour of the project.

## Technologies, in simple words

| Technology | What it does here |
|---|---|
| React | Builds the pages and updates them when something changes. |
| JSX | Lets the page layout be written using HTML-like pieces inside JavaScript. |
| React Router | Moves between app pages without a full browser reload. |
| Firebase Authentication | Gives each browser an anonymous identity so requests can be associated with their creator. It is not a university student login. |
| Cloud Firestore | Stores requests online and sends the app changes when request data changes. |
| Firebase JavaScript SDK | The set of tools the app uses to talk to Firebase. |
| CSS | Makes the app look polished and fit different screen sizes. |
| Lucide React | Supplies the small icons used in buttons and cards. |
| Create React App | Starts the local development server and packages the app for production. |
| Jest and React Testing Library | Check that screens and form behavior work. |

## What happens when someone sends a request?

1. The student fills in the form. The name accepts letters and spaces (up to 20 characters); the student ID accepts digits only (up to 9 digits).
2. The app checks the other required information, including email, service, and request description.
3. Firebase gives that browser an anonymous ID if it does not already have one.
4. The app saves the request in the Firestore `requests` collection with a `Pending` status.
5. Firestore rules check that the data is valid and belongs to that browser.
6. The app shows a confirmation and a Firestore document ID as the reference.
7. The Requests page reads that browser's requests and lets it change a status or delete a request.

## Start the app

Open a terminal in the `campuspulse` folder and run:

```sh
npm install
npm start
```

To check the project:

```sh
npm test -- --watchAll=false
npm run build
```

Before Firebase features work, the Firebase project needs **Anonymous sign-in** enabled, a Firestore database, the correct local settings in `.env.local`, and the rules from `firestore.rules` published. Restart the development server after changing `.env.local`.

> **A note for a real university:** Anonymous sign-in identifies the browser, not the real student. For a real student system, connect the university's sign-in service and let authorized staff manage request statuses.
