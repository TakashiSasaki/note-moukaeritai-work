# Firebase Image Note Application

## Overview

This application is a Firebase-based note-taking platform designed for private image notes. It allows users to start as anonymous users and later link their accounts to permanent authentication methods (Email/Password, Google Sign-In) to preserve their data. Users can create rich notes with time-ordered entries, including text and images. Notes can be optionally associated with NFC tags or QR codes and can be made public for sharing via a special URL that includes Open Graph Protocol (OGP) tags for social media previews. The system also tracks basic statistics and access logs for notes.

## Features

*   **User Authentication**:
    *   Anonymous user sessions with seamless upgrade/linking.
    *   Registered user accounts via Email/Password and Google Sign-In.
*   **Note Management**:
    *   Create, edit, and delete notes.
    *   Associate notes with tags (comma-separated).
    *   Optional fields for NFC Tag ID and QR Code data.
*   **Note Entries**:
    *   Time-ordered entries within each note.
    *   Entries can contain text and uploaded images (currently one image per entry via client).
    *   Entries can link to other notes (currently via comma-separated Note IDs).
*   **Cloud Functions (Backend Logic)**:
    *   `logAccess`: Callable function to log note access events (read, write) to Firestore, including client details and IP. Updates `noteReadStatus`.
    *   `updateNoteStats`: Firestore trigger to maintain `noteCount` in user statistics upon note creation/deletion.
    *   `updateStorageStats`: Cloud Storage trigger to maintain `imageCount` and `totalImageSize` in user statistics upon file upload/deletion.
    *   `syncPublicNote`: Firestore trigger to synchronize notes marked as `isPublic` to a separate `publicNotes` collection for sharing.
    *   `viewNote`: HTTP Cloud Function that serves an HTML page for public notes, including OGP tags for social media previews and client-side logic for app deep linking.
*   **Data Management (Client-Side Placeholders)**:
    *   Client-side UI and function calls for initiating data export (`exportUserData`) and import (`importUserData`). Backend Cloud Functions are currently placeholders.
*   **Security**:
    *   Firestore security rules to protect user data and manage access to public notes.
    *   Cloud Storage security rules to protect user files and manage access to import/export paths.
*   **User Experience**:
    *   Basic responsive UI for improved usability on different screen sizes.
    *   Offline support:
        *   App shell (HTML, CSS, JS) caching via a Service Worker.
        *   Firestore data persistence for offline viewing and modification of notes.

## Firebase Project Setup

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Services**:
    *   **Authentication**:
        *   Go to Authentication > Sign-in method.
        *   Enable "Anonymous", "Email/Password", and "Google" providers. For Google Sign-In, ensure you configure the OAuth consent screen and add your authorized domains if prompted.
    *   **Firestore (Named Database)**:
        *   This project uses a non-default Firestore database named `note-moukaeritai-work`.
        *   **Creating the Named Database**:
            *   **Using Firebase Console**:
                1.  Go to Firestore Database > Create database.
                2.  Choose to start in **Production mode**.
                3.  Select your desired region/location.
                4.  After the *default* database `(default)` is created, you need to create the named database.
                5.  Go to Firestore Database > Data. Click the three dots next to your default database name (or the "Databases" dropdown) and select "Add database".
                6.  Enter `note-moukaeritai-work` as the Database ID.
                7.  Choose a location (it's recommended to use the same location as your default database and functions).
                8.  Select "Native Mode".
            *   **Using Google Cloud CLI (`gcloud`)**:
                ```bash
                gcloud auth login # If you haven't already
                gcloud config set project YOUR_PROJECT_ID
                gcloud alpha firestore databases create --database="note-moukaeritai-work" --location=YOUR_CHOSEN_LOCATION --type=firestore-native --project=YOUR_PROJECT_ID
                # Replace YOUR_PROJECT_ID and YOUR_CHOSEN_LOCATION (e.g., nam5, eur3)
                ```
        *   Ensure the database is in "Native Mode".
    *   **Cloud Storage**:
        *   Go to Storage > Get started.
        *   Set up with default security rules (you will deploy updated rules via `firebase deploy`). Select your location.
    *   **Cloud Functions**:
        *   Ensure your project is on the "Blaze (pay as you go)" plan to use Cloud Functions.
        *   The Node.js runtime for functions is specified in `functions/package.json` (e.g., Node 20).
3.  **Web App Configuration**:
    *   In your Firebase project settings (click the gear icon next to "Project Overview"), go to the "General" tab.
    *   Under "Your apps", click the Web icon (`</>`) to add a web app.
    *   Register the app and copy the `firebaseConfig` object.
    *   Paste this `firebaseConfig` object into `public/auth.js`, replacing the placeholder.

## Local Development Setup

1.  **Prerequisites**:
    *   Node.js (v20 as per `functions/package.json`). Use [nvm](https://github.com/nvm-sh/nvm) to manage versions.
    *   Firebase CLI: `npm install -g firebase-tools`
    *   Google Cloud CLI (`gcloud`): Optional, but useful for managing specific Firestore databases if not using the console.
2.  **Clone Repository** & **Install Dependencies** (as previously described).
3.  **Firebase Login** & **Associate Project** (as previously described).
    *   Note: The `firebase.json` is configured for multi-target hosting (`note-moukaeritai-work`), and the client application in `public/firestore_ops.js` is configured to connect to the Firestore database named `note-moukaeritai-work`.
4.  **(Optional) Running with Emulators**:
    *   `firebase init emulators` (select Auth, Functions, Firestore, Storage, Hosting).
    *   `firebase emulators:start`
    *   To use the named Firestore database with the emulator, you might need to ensure your client-side code (in `firestore_ops.js`) that connects to `getFirestore(app, "note-moukaeritai-work")` correctly interacts with the emulator. The emulator typically serves a default Firestore instance, but can be configured. Check Firebase Emulator documentation for specifics on emulating named databases if issues arise. For many local scenarios, testing against the default emulated Firestore instance might be sufficient if the rules structure (`/databases/{database}/documents/...`) is generic.

## Configuration Details

*   **Client-Side Database**: The client application is specifically configured to connect to the Firestore database named `note-moukaeritai-work`. This configuration is set in `public/firestore_ops.js` where `getFirestore(app, "note-moukaeritai-work")` is called. All client-side Firestore operations target this named database.
*   **Cloud Functions Database Interaction**: Cloud Functions in this project (e.g., `logAccess`, `syncPublicNote`) also interact with the Firestore database. By default, `admin.firestore()` in the Admin SDK will connect to the *default* Firestore database. To make functions target the `note-moukaeritai-work` database, their initialization would need to be: `admin.initializeApp(); admin.firestore().database("note-moukaeritai-work");` or by initializing a specific Firestore instance for that database: `const dbNamed = admin.firestore("note-moukaeritai-work");`. **This change has not been implemented in the current codebase for functions; they will target the default database.** This is a key point for correct deployment and testing if the default database is not the intended one for functions.

## Deployment

1.  **Deploy to Firebase**:
    *   This project uses a multi-target hosting configuration. The primary application target is named `note-moukaeritai-work`.
    *   To deploy the hosting configuration for this target, along with Cloud Functions, and rules for the *default* Firestore database and Storage:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work,functions,firestore,storage
    ```
    *   **Deploying Firestore Rules for a Named Database**:
        *   The `firestore.rules` file is written to be generic using the `/databases/{database}/documents` path, making it applicable to any database ID.
        *   The standard `firebase deploy --only firestore:rules` command deploys rules to your project, and these rules are evaluated for any database accessed within that project.
        *   Ensure the `note-moukaeritai-work` database has been created in your project (see "Firebase Project Setup"). The client and (eventually) functions must be configured to *use* this database.
    *   To deploy only the specific hosting target:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work
    ```
    *   Ensure you have selected the correct Firebase project (`firebase use <project-alias>`).
    *   Application will be available at your Firebase Hosting URL.

## Client Application Usage
(As previously described)

## Notes on Current Implementation
(As previously described, with the addition of the function database targeting note)
*   **Cloud Functions Database Target**: Cloud Functions currently use the default Firestore database. For them to interact with the `note-moukaeritai-work` database, their `admin.firestore()` initialization needs to be updated (e.g., `admin.firestore("note-moukaeritai-work")`). This is not yet implemented.

This README provides a comprehensive guide to the application in its current state.
