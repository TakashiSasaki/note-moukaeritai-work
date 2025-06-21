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
    *   *Note: All functions are part of the `note-moukaeritai-work` codebase.*
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
        *   **Creating the Named Database**: (Instructions as before)
            *   **Using Firebase Console**: ...
            *   **Using Google Cloud CLI (`gcloud`)**: ...
        *   Ensure the database is in "Native Mode".
    *   **Cloud Storage**:
        *   Go to Storage > Get started.
        *   Set up with default security rules. Select your location.
    *   **Cloud Functions**:
        *   Ensure your project is on the "Blaze (pay as you go)" plan.
        *   The Node.js runtime for functions is specified in `functions/package.json` (e.g., Node 20).
        *   **Codebase Configuration**: This project configures Cloud Functions under a specific codebase named `note-moukaeritai-work`. The `firebase.json` file defines this, and the `functions` directory (specified as `functions.source`) belongs to this codebase.
3.  **Web App Configuration**: (Instructions as before)

## Local Development Setup

1.  **Prerequisites**: (As before)
2.  **Clone Repository** & **Install Dependencies**: (As before)
3.  **Firebase Login** & **Associate Project**: (As before)
    *   Note: The `firebase.json` is configured for multi-target hosting (`note-moukaeritai-work`) and a specific function codebase (`note-moukaeritai-work`). The client application also targets the named Firestore database `note-moukaeritai-work`.
4.  **(Optional) Running with Emulators**: (As before, with a note on function emulators and codebases)
    *   ...
    *   When emulating functions from a specific codebase, the Firebase CLI handles this automatically based on `firebase.json`.

## Configuration Details

*   **Client-Side Database**: The client application is specifically configured to connect to the Firestore database named `note-moukaeritai-work`. This configuration is set in `public/firestore_ops.js`.
*   **Cloud Functions Database Interaction**: **Important**: Cloud Functions in this project (defined in the `functions` directory under the `note-moukaeritai-work` codebase) currently use the *default* Firestore database. To make them target the `note-moukaeritai-work` database, their `admin.firestore()` initialization needs to be updated (e.g., `admin.firestore("note-moukaeritai-work")`). This is not yet implemented.
*   **Hosting Rewrites**: The rewrite rule in `firebase.json` for the `viewNote` function correctly targets this function within the `note-moukaeritai-work` codebase.

## Deployment

1.  **Deploy to Firebase**:
    *   This project uses multi-target hosting and a specific functions codebase, both named `note-moukaeritai-work`.
    *   To deploy all services, including the specific hosting target and function codebase:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work,functions:note-moukaeritai-work,firestore,storage
    ```
    *   To deploy only the functions in the `note-moukaeritai-work` codebase:
    ```bash
    firebase deploy --only functions:note-moukaeritai-work
    ```
    *   To deploy only the specific hosting target:
    ```bash
    firebase deploy --only hosting:note-moukaeritai-work
    ```
    *   Firestore rules deployment remains generic (as they apply project-wide and paths include database IDs): `firebase deploy --only firestore:rules`.
    *   Ensure the `note-moukaeritai-work` database exists and that client/functions target the correct database as per "Configuration Details".
    *   Ensure you have selected the correct Firebase project (`firebase use <project-alias>`).
    *   Application will be available at your Firebase Hosting URL.

## Client Application Usage
(As previously described)

## Notes on Current Implementation
(As previously described, with the function database targeting note reiterated)
*   **Cloud Functions Database Target**: As noted in "Configuration Details", Cloud Functions currently use the default Firestore database. This needs to be updated if they are to interact with the `note-moukaeritai-work` database.

This README provides a comprehensive guide to the application in its current state.
