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
    *   **Firestore**:
        *   Go to Firestore Database > Create database.
        *   Start in **Production mode** (you will deploy rules via `firebase deploy`). Select your desired location.
    *   **Cloud Storage**:
        *   Go to Storage > Get started.
        *   Set up with default security rules (you will deploy updated rules via `firebase deploy`). Select your location.
    *   **Cloud Functions**:
        *   Ensure your project is on the "Blaze (pay as you go)" plan to use Cloud Functions, especially if they make outbound network requests (though current functions primarily interact with other Firebase services).
        *   The Node.js runtime for functions is specified in `functions/package.json` (e.g., Node 20). Firebase will use this during deployment.
3.  **Web App Configuration**:
    *   In your Firebase project settings (click the gear icon next to "Project Overview"), go to the "General" tab.
    *   Under "Your apps", click the Web icon (`</>`) to add a web app. If you already have one, you can find its config there.
    *   Register the app (give it a nickname).
    *   After registration, Firebase will provide a `firebaseConfig` object. Copy this entire object.
    *   Paste this `firebaseConfig` object into the `public/auth.js` file, replacing the placeholder object:
        ```javascript
        // In public/auth.js
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY", // Replace with your actual config values
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID"
        };
        ```

## Local Development Setup

1.  **Prerequisites**:
    *   Node.js (version specified in `functions/package.json` or higher, e.g., v20 is used here). You can use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions.
    *   Firebase CLI: Install globally using npm: `npm install -g firebase-tools`
2.  **Clone Repository**:
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```
3.  **Install Function Dependencies**:
    Cloud Functions have their own dependencies listed in `functions/package.json`.
    ```bash
    cd functions
    npm install
    cd ..
    ```
4.  **Firebase Login**:
    Log in to Firebase using your Google account:
    ```bash
    firebase login
    ```
5.  **Associate with Firebase Project**:
    Link your local project directory to your Firebase project:
    ```bash
    firebase use --add
    ```
    Select your Firebase project ID from the list and choose an alias (e.g., `default` or `dev`).
    *   Note: The `firebase.json` in this project is configured for multi-target hosting, with the primary application target named `note-moukaeritai-work`.
6.  **(Optional) Running with Emulators**:
    The Firebase Local Emulator Suite allows you to run and test Firebase services locally.
    *   Initialize emulators (if not done before): `firebase init emulators` (select Auth, Functions, Firestore, Storage, Hosting).
    *   Start the emulators:
        ```bash
        firebase emulators:start
        ```
    *   This will typically host your web app (target `note-moukaeritai-work`) on `http://localhost:5000` (check CLI output for specific ports). The client-side Firebase SDKs should automatically connect to the emulators when they are running.
    *   The Emulator UI will be available at `http://localhost:4000`.

## Deployment

1.  **Deploy to Firebase**:
    *   This project uses a multi-target hosting configuration. The primary application target is named `note-moukaeritai-work`.
    *   To deploy the hosting configuration for this target, along with other Firebase services like Functions, Firestore rules, and Storage rules, use:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work,functions,firestore,storage
    ```
    *   To deploy only the specific hosting target:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work
    ```
    *   If you have only changed Firestore rules (and do not have a `firestore.indexes.json` file or it hasn't changed), you can deploy only the rules more quickly using: `firebase deploy --only firestore:rules`. Similarly for Storage rules: `firebase deploy --only storage:rules`.
    *   Ensure you have selected the correct Firebase project (`firebase use <project-alias>`) if you have multiple.
    *   After deployment, your application will be available at your Firebase Hosting URL (e.g., `your-project-id.web.app` or your custom domain).

## Client Application Usage

1.  **Access the Application**: Open your Firebase Hosting URL in a browser.
2.  **Authentication**:
    *   You begin as an anonymous user. You can create notes and entries.
    *   To save your data permanently, use the "Sign Up" (with email/password) or "Sign In with Google" buttons. This will link your anonymous data to the new permanent account (Note: `migrateUserData` function is a placeholder).
    *   Use "Sign In" if you have an existing email/password account.
    *   "Sign Out" will log you out.
3.  **Note Management**:
    *   The "Note Management" section appears once you are interacting with the app (even anonymously).
    *   **Create Note**: Fill in the title, tags (comma-separated), optional NFC Tag ID, and optional QR Code Data. Click "Create Note".
    *   **View/Edit Note**: Click on a note title in the "My Notes" list. This opens the detail view for that note.
    *   **Update Note**: In the detail view, modify the note's title, tags, etc., and click "Update Note Details".
    *   **Delete Note**: Click the "Delete" button next to a note in the "My Notes" list. A confirmation will be asked.
4.  **Note Entries**:
    *   When viewing a note's details:
    *   **Add Entry**: Fill in the text content, optionally upload an image (single file per entry), and add links to other Note IDs (comma-separated). Click "Add Entry".
    *   Existing entries for the note are listed below the form, showing text, image (if any), links, and timestamp.
5.  **Data Export/Import**:
    *   **Export**: Click "Export All Data". The backend function is a placeholder, so this will simulate a call but not produce a full data export yet.
    *   **Import**: Choose a `.zip` file and click "Import Data". This will upload the file, and the backend function (also a placeholder) will be called. No actual data import occurs yet.

## Notes on Current Implementation

*   **Placeholder Cloud Functions**:
    *   `migrateUserData`: For transferring data from an anonymous account to a permanent one. Currently logs and returns a placeholder message.
    *   `exportUserData`: For exporting user data. Currently logs and returns a placeholder message (no actual data bundle or download URL is generated).
    *   `importUserData`: For importing user data from an uploaded file. Currently logs the path and returns a placeholder message.
    *   `maintainBacklinks` (Firestore Trigger): Placeholder for logic to create/delete backlink documents when note entries are changed.
    *   `cleanupDeletedEntry` (Firestore Trigger): Placeholder for logic to clean up related data (like images in Storage or backlinks) when a note entry is deleted.
*   **Image Upload**: Client-side image upload is implemented for a single file per note entry.
*   **OGP Content in `viewNote`**: The `description` and `imageUrl` for OGP tags in the `viewNote` function are currently using placeholders or direct properties from the `publicNotes` document. A more advanced implementation would dynamically derive these from the note's entries content.
*   **Error Handling**: Client-side error handling is basic (using `alert()` in many places). This could be improved with more user-friendly notifications or UI elements.
*   **UI for `isPublic` & `publicPassword`**: There isn't a direct UI element in `index.html` to set a note's `isPublic` flag or `publicPassword`. This is currently managed by the `syncPublicNote` trigger if these fields are updated in Firestore directly (e.g., via an admin interface or a more complete note editing UI not yet built).

This README provides a comprehensive guide to the application in its current state.
