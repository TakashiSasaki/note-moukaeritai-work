const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  console.error('Firebase admin initialization error', e);
}

const db = admin.firestore();
const { logger } = functions;

/**
 * logAccess Callable Function
 * Logs access to a note and updates noteReadStatus.
 */
exports.logAccess = functions.https.onCall(async (data, context) => {
  logger.info("logAccess called with data:", data);

  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userId = context.auth.uid;
  const { noteId, type, location, clientInfo } = data;

  if (!noteId || !type) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing noteId or type in data.');
  }

  const logData = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type: type, // 'read', 'link_copied', 'exported', etc.
    userId: userId, // User performing the access
    noteId: noteId,
    location: location || null, // e.g., 'noteView', 'sharingDialog'
    clientInfo: clientInfo || null, // e.g., { userAgent: '...', ip: '...' } - client can pass userAgent
    serverIp: context.rawRequest ? context.rawRequest.ip : null // IP as seen by the function
  };

  try {
    // Write to accessLogs subcollection
    const logRef = await db.collection('users').doc(userId).collection('notes').doc(noteId).collection('accessLogs').add(logData);
    logger.info(`Access log written with ID: ${logRef.id} for user ${userId}, note ${noteId}`);

    // If type is 'read', update noteReadStatus
    if (type === 'read') {
      const noteReadStatusRef = db.collection('users').doc(userId).collection('noteReadStatus').doc(noteId);
      await noteReadStatusRef.set({
        lastReadAt: admin.firestore.FieldValue.serverTimestamp(),
        noteId: noteId // Storing noteId for potential querying
      }, { merge: true }); // Merge true to not overwrite other fields if any
      logger.info(`Note read status updated for user ${userId}, note ${noteId}`);
    }

    return { status: 'success', logId: logRef.id };
  } catch (error) {
    logger.error('Error in logAccess:', error);
    throw new functions.https.HttpsError('internal', 'Failed to log access.', error.message);
  }
});


/**
 * migrateUserData Callable Function (Placeholder)
 * Placeholder for migrating data from an anonymous user to a permanent account.
 */
exports.migrateUserData = functions.https.onCall(async (data, context) => {
  logger.info("migrateUserData called with data:", data);

  // Verify authentication - the new (permanent) user should be calling this.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called by an authenticated user.');
  }
  const newUserId = context.auth.uid;
  const { anonymousUid, newCredentialInfo } = data; // newCredentialInfo might be email, idToken, etc.

  if (!anonymousUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing anonymousUid in data.');
  }

  logger.info(`Placeholder: Attempting to migrate data from anonymous user ${anonymousUid} to new user ${newUserId}.`);
  logger.info("New credential info (if provided):", newCredentialInfo);

  // TODO: Implement actual data migration logic:
  // 1. Read data associated with anonymousUid from Firestore (e.g., /users/{anonymousUid}/notes/*).
  // 2. Write this data to /users/{newUserId}/notes/*.
  // 3. Handle conflicts if newUserId already has some data.
  // 4. Delete data from /users/{anonymousUid} after successful migration.
  // 5. Consider migrating Storage files if any.

  return { status: 'success', message: `Placeholder: Data migration for ${anonymousUid} to ${newUserId} would happen here.` };
});


/**
 * exportUserData Callable Function (Placeholder)
 * Placeholder for initiating a user data export.
 */
exports.exportUserData = functions.https.onCall(async (data, context) => {
  logger.info("exportUserData called by user.");

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userId = context.auth.uid;
  logger.info(`Placeholder: User ${userId} initiated data export.`);
  logger.info("Received data (if any):", data);

  // TODO: Implement actual export logic:
  // 1. Gather all user data from Firestore (notes, entries, stats).
  // 2. Gather list of user's files from Storage.
  // 3. Package data (e.g., into a JSON file or ZIP).
  // 4. Upload the package to a user-specific path in Cloud Storage (e.g., exports/{userId}/{exportFileName}).
  // 5. Notify the user (e.g., via email or in-app message with a download link).

  return { status: 'success', message: `Placeholder: User data export for ${userId} would be processed here.` };
});


/**
 * importUserData Callable Function (Placeholder)
 * Placeholder for initiating a user data import.
 */
exports.importUserData = functions.https.onCall(async (data, context) => {
  logger.info("importUserData called by user.");

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userId = context.auth.uid;
  const { importFilePath } = data; // e.g., path to a file in Cloud Storage like 'imports/{userId}/{fileName}'

  if (!importFilePath) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing importFilePath in data.');
  }

  logger.info(`Placeholder: User ${userId} initiated data import from path: ${importFilePath}.`);

  // TODO: Implement actual import logic:
  // 1. Download the import file from Cloud Storage.
  // 2. Unpack/parse the data.
  // 3. Write data to Firestore under /users/{userId}/...
  // 4. Handle potential conflicts with existing data (e.g., merge, overwrite, skip).
  // 5. If the import includes files, download them from the package and upload to user's Storage.

  return { status: 'success', message: `Placeholder: User data import for ${userId} from ${importFilePath} would be processed here.` };
});


// --- Auto-generated Firebase Auth triggers (from previous tasks, ensure they are still relevant or remove) ---
// TODO: Add Cloud Functions triggers related to user creation or deletion.
// For example, you might want to:
// - Create a user profile in Firestore when a new user signs up.
//   (e.g., using functions.auth.user().onCreate())
// - Clean up user data in Firestore when a user account is deleted.
//   (e.g., using functions.auth.user().onDelete())

// Example Auth Triggers (review if they are needed or if callable functions handle these cases)
// exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
//   logger.info('User created (auth trigger):', user.uid, user.email);
//   // Example: Create a basic user document in Firestore
//   // await db.collection('users').doc(user.uid).set({
//   //   email: user.email,
//   //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
//   //   displayName: user.displayName || null
//   // }, { merge: true });
// });

// exports.deleteUserProfile = functions.auth.user().onDelete(async (user) => {
//   logger.info('User deleted (auth trigger):', user.uid);
//   // Example: Delete user's data from Firestore (be careful with this!)
//   // const userRef = db.collection('users').doc(user.uid);
//   // await db.recursiveDelete(userRef); // Requires firebase-tools >= 8.14.0
//   // Or manually delete subcollections and documents.
// });


// --- Firestore Trigger Functions ---

/**
 * updateNoteStats Firestore Trigger
 * Updates the note count in user statistics when notes are created or deleted.
 */
exports.updateNoteStats = functions.firestore
  .document('users/{userId}/notes/{noteId}')
  .onWrite(async (change, context) => {
    const { userId } = context.params;
    const statsRef = db.doc(`users/${userId}/statistics/summary`);

    if (!change.before.exists && change.after.exists) {
      // Note created
      logger.info(`Note created for user ${userId}, noteId ${context.params.noteId}. Incrementing count.`);
      try {
        await statsRef.set({
          noteCount: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        logger.info(`Incremented note count for user ${userId}.`);
      } catch (error) {
        logger.error(`Failed to increment note count for user ${userId}:`, error);
        // Consider if the stats doc needs to be created if it doesn't exist
        const statsDoc = await statsRef.get();
        if (!statsDoc.exists) {
          logger.info(`Statistics summary for user ${userId} does not exist. Creating with count 1.`);
          await statsRef.set({ noteCount: 1, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
        } else {
           // If it exists but increment failed, could be a concurrent write issue or other error.
           // For now, just log. A more robust solution might retry or use transactions if set fails.
           logger.error(`Increment failed even though stats doc for ${userId} exists.`);
        }
      }
    } else if (change.before.exists && !change.after.exists) {
      // Note deleted
      logger.info(`Note deleted for user ${userId}, noteId ${context.params.noteId}. Decrementing count.`);
      try {
        await statsRef.set({
            noteCount: admin.firestore.FieldValue.increment(-1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // merge:true is important here
        logger.info(`Decremented note count for user ${userId}.`);
      } catch (error) {
        logger.error(`Failed to decrement note count for user ${userId}:`, error);
         // Check if the document exists, similar to increment logic
        const statsDoc = await statsRef.get();
        if (!statsDoc.exists) {
            logger.warn(`Statistics summary for user ${userId} does not exist. Setting count to 0 (or should be negative if possible and desired).`);
            // If it doesn't exist, decrementing means it should be 0 or negative. Firestore increment handles this.
            await statsRef.set({ noteCount: 0, lastUpdated: admin.firestore.FieldValue.serverTimestamp() }); // Or -1 if that's valid for your use case
        } else {
            logger.error(`Decrement failed for ${userId} even though stats doc exists.`);
        }
      }
    }
    // If it's an update (both before and after exist), we do nothing for noteCount.
    return null;
  });

/**
 * syncPublicNote Firestore Trigger
 * Creates, updates, or deletes a corresponding document in the `publicNotes` collection
 * when a user's note `isPublic` status changes or a public note is updated.
 */
exports.syncPublicNote = functions.firestore
  .document('users/{userId}/notes/{noteId}')
  .onWrite(async (change, context) => {
    const { userId, noteId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const publicNoteRef = db.doc(`publicNotes/${noteId}`);

    // Case 1: Note is made public or a new public note is created/updated
    if (afterData && afterData.isPublic) {
      logger.info(`Note ${noteId} for user ${userId} is public. Syncing to publicNotes.`);

      // TODO: Extract description (e.g., first few lines of the first entry)
      // TODO: Extract imageUrl (e.g., first image of the first entry)
      // This might require reading the first entry from the subcollection `users/{userId}/notes/{noteId}/entries`
      // For now, using placeholders.
      let description = afterData.description || "This is a public note."; // Placeholder
      let imageUrl = afterData.imageUrl || null; // Placeholder

      // Example: Fetch first entry for description (simplified)
      // const entriesSnapshot = await db.collection(`users/${userId}/notes/${noteId}/entries`).orderBy('createdAt', 'asc').limit(1).get();
      // if (!entriesSnapshot.empty) {
      //   const firstEntry = entriesSnapshot.docs[0].data();
      //   description = firstEntry.text ? firstEntry.text.substring(0, 200) + (firstEntry.text.length > 200 ? '...' : '') : description;
      //   if (firstEntry.imageUrls && firstEntry.imageUrls.length > 0) {
      //       imageUrl = firstEntry.imageUrls[0];
      //   }
      // }


      const publicNoteData = {
        ownerUid: userId,
        title: afterData.title || "Untitled Note",
        lastUpdatedAt: afterData.lastModified || admin.firestore.FieldValue.serverTimestamp(), // Assuming 'lastModified' field exists on user's note
        description: description,
        imageUrl: imageUrl,
        passwordProtected: !!(afterData.publicPassword && afterData.publicPassword.trim() !== ""),
        // Add any other fields from afterData that should be public
        originalNotePath: `users/${userId}/notes/${noteId}` // For reference or admin use
      };

      try {
        await publicNoteRef.set(publicNoteData, { merge: true });
        logger.info(`Successfully synced note ${noteId} to publicNotes.`);
      } catch (error) {
        logger.error(`Failed to sync note ${noteId} to publicNotes:`, error);
      }
    }
    // Case 2: Note is made private (was public before, now isPublic is false or note deleted)
    else if ((beforeData && beforeData.isPublic) && (!afterData || !afterData.isPublic)) {
      logger.info(`Note ${noteId} for user ${userId} is no longer public. Deleting from publicNotes.`);
      try {
        await publicNoteRef.delete();
        logger.info(`Successfully deleted note ${noteId} from publicNotes.`);
      } catch (error) {
        // Log error if deletion fails, but don't let it fail the function if the doc was already gone.
        if (error.code === 'not-found') {
            logger.warn(`Tried to delete public note ${noteId}, but it was already gone.`);
        } else {
            logger.error(`Failed to delete note ${noteId} from publicNotes:`, error);
        }
      }
    }
    // Other cases (e.g., private note updated, no change to isPublic) don't need action here.
    return null;
  });


/**
 * maintainBacklinks Firestore Trigger (Placeholder)
 * Manages backlinks when entries with links are created, updated, or deleted.
 */
exports.maintainBacklinks = functions.firestore
  .document('users/{userId}/notes/{noteId}/entries/{entryId}')
  .onWrite(async (change, context) => {
    const { userId, noteId, entryId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    logger.info(`maintainBacklinks triggered for entry ${entryId} in note ${noteId} by user ${userId}.`);
    // logger.debug("Change object:", change);
    // logger.debug("Context object:", context);

    // TODO: Implement backlink logic
    // 1. Get `beforeData.links` (array of targetNoteIds or objects like {targetNoteId: "...", targetOwnerId: "..."})
    // 2. Get `afterData.links`
    // 3. Determine added links: links in `afterData` but not in `beforeData`.
    // 4. Determine removed links: links in `beforeData` but not in `afterData`.

    // For each added link to a `targetNoteId`:
    //   - Resolve `targetOwnerId` (if links can be cross-user and this info is stored/derivable).
    //     If not specified, assume target is within the same user: `targetOwnerId = userId`.
    //   - Add a backlink document: `db.doc(\`users/\${targetOwnerId}/notes/\${targetNoteId}/backlinks/\${noteId}\`).set({ sourceEntryId: entryId, sourceNoteTitle: afterData.parentNoteTitle || "Untitled", lastLinkedAt: admin.firestore.FieldValue.serverTimestamp() })`
    //     (Consider storing parentNoteTitle or other useful info in the backlink doc)

    // For each removed link:
    //   - Remove the corresponding backlink document: `db.doc(\`users/\${targetOwnerId}/notes/\${targetNoteId}/backlinks/\${noteId}\`).delete()`

    logger.info("Placeholder: Backlink logic would execute here.");
    return null;
  });


/**
 * cleanupDeletedEntry Firestore Trigger (Placeholder)
 * Cleans up resources associated with a deleted entry (e.g., images, backlinks).
 */
exports.cleanupDeletedEntry = functions.firestore
  .document('users/{userId}/notes/{noteId}/entries/{entryId}')
  .onDelete(async (snapshot, context) => {
    const { userId, noteId, entryId } = context.params;
    const deletedEntryData = snapshot.data();

    logger.info(`cleanupDeletedEntry triggered for deleted entry ${entryId} in note ${noteId} by user ${userId}.`);
    // logger.debug("Snapshot data:", deletedEntryData);
    // logger.debug("Context object:", context);

    // TODO: Implement cleanup logic
    // 1. Delete associated images in Cloud Storage:
    //    - If `deletedEntryData.imageUrls` (or similar field) exists and is an array:
    //      Iterate through the URLs. These might be full download URLs or just paths.
    //      If they are full URLs, parse them to get the storage path.
    //      `const storage = admin.storage();`
    //      `await storage.bucket().file(filePath).delete();` (for each image)

    // 2. Remove any backlinks this entry might have created:
    //    - If `deletedEntryData.links` (array of targetNoteIds or objects) exists:
    //      Iterate through `deletedEntryData.links`.
    //      For each `targetNoteId` (and `targetOwnerId` if applicable):
    //        `db.doc(\`users/\${targetOwnerId}/notes/\${targetNoteId}/backlinks/\${noteId}\`).delete()`
    //        (Ensure the backlink document schema matches what `maintainBacklinks` creates, especially if it includes `sourceEntryId` for more granular cleanup, though the current plan is one backlink doc per source note).

    logger.info("Placeholder: Cleanup logic for deleted entry would execute here.");
    return null;
  });


// --- Storage Trigger Functions ---

/**
 * updateStorageStats Storage Trigger
 * Updates image count and total image size in user statistics when files are uploaded or deleted.
 * This function will trigger for all files in the default bucket.
 * It then filters based on the file path to only act on user-specific files.
 */
const processStorageUpdate = async (object, isDeletion = false) => {
  const filePath = object.name; // File path in the bucket
  const fileSize = parseInt(object.size, 10); // File size in bytes

  logger.info(`updateStorageStats: Processing ${isDeletion ? 'deletion' : 'creation'} for file ${filePath} of size ${fileSize}`);

  // Attempt to extract userId from path: users/{userId}/...
  const pathParts = filePath.split('/');
  if (pathParts.length < 2 || pathParts[0] !== 'users') {
    logger.info(`File path ${filePath} does not match 'users/{userId}/...' structure. Skipping stats update.`);
    return null;
  }
  const userId = pathParts[1];

  if (!userId) {
    logger.warn(`Could not parse userId from path ${filePath}. Skipping stats update.`);
    return null;
  }

  const statsRef = db.doc(`users/${userId}/statistics/summary`);
  const incrementValue = isDeletion ? -1 : 1;
  const sizeChange = isDeletion ? -fileSize : fileSize;

  try {
    const statsDoc = await statsRef.get();
    let currentImageCount = 0;
    let currentTotalImageSize = 0;

    if (statsDoc.exists) {
      currentImageCount = statsDoc.data().imageCount || 0;
      currentTotalImageSize = statsDoc.data().totalImageSize || 0;
    } else {
      logger.info(`Statistics summary for user ${userId} does not exist. Will create.`);
    }

    const newImageCount = currentImageCount + incrementValue;
    const newTotalImageSize = currentTotalImageSize + sizeChange;

    const updateData = {
      imageCount: Math.max(0, newImageCount), // Ensure count doesn't go below 0
      totalImageSize: Math.max(0, newTotalImageSize), // Ensure size doesn't go below 0
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    // Using set with merge:true to create if not exists or update existing.
    await statsRef.set(updateData, { merge: true });

    logger.info(`Successfully updated storage stats for user ${userId}. New count: ${updateData.imageCount}, New total size: ${updateData.totalImageSize}`);

  } catch (error) {
    logger.error(`Failed to update storage stats for user ${userId}, file ${filePath}:`, error);
  }
  return null;
};

// Trigger for when a new file is uploaded and finalized
exports.updateStorageStatsOnFinalize = functions.storage.object().onFinalize(async (object) => {
  return processStorageUpdate(object, false);
});

// Trigger for when a file is deleted
exports.updateStorageStatsOnDelete = functions.storage.object().onDelete(async (object) => {
  return processStorageUpdate(object, true);
});


// --- HTTP Trigger Functions ---

/**
 * viewNote HTTP Trigger
 * Serves an HTML page for a public note, with OGP tags for social sharing
 * and JavaScript for attempting to open in app or redirect to app stores.
 */
exports.viewNote = functions.https.onRequest(async (req, res) => {
  const pathParts = req.path.split('/'); // e.g., /notes/NOTE_ID -> ["", "notes", "NOTE_ID"]
  let noteId;

  // Check typical Cloud Function path structure when routed from Hosting
  if (pathParts.length === 3 && pathParts[1] === 'notes') {
    noteId = pathParts[2];
  } else if (pathParts.length === 2 && pathParts[0] === '' && pathParts[1] !== 'viewNote') {
    // This handles direct invocation like /NOTE_ID if function is deployed as 'viewNote/NOTE_ID'
    // or if a rewrite sends /notes/NOTE_ID directly to the function's root.
    // However, the firebase.json rewrite implies /notes/NOTE_ID will be the full path.
    noteId = pathParts[1];
  } else if (req.path.startsWith('/viewNote/')) { // direct call to /viewNote/NOTE_ID
     noteId = req.path.substring('/viewNote/'.length);
  }


  logger.info(`viewNote called. Path: ${req.path}, Parsed Note ID: ${noteId}`);

  if (!noteId || noteId.trim() === "") {
    logger.warn('Note ID not found in path.');
    res.status(400).send('Invalid request: Note ID missing.');
    return;
  }

  try {
    const publicNoteRef = db.doc(`publicNotes/${noteId}`);
    const noteDoc = await publicNoteRef.get();

    if (!noteDoc.exists) {
      logger.warn(`Public note ${noteId} not found.`);
      res.status(404).set('Content-Type', 'text/html').send(`
        <html><head><title>Note Not Found</title></head>
        <body><h1>404 - Note Not Found</h1><p>The requested note does not exist or is not public.</p></body></html>`);
      return;
    }

    const noteData = noteDoc.data();
    const title = noteData.title || 'A Shared Note';
    const description = noteData.description || 'Check out this note!';
    // Use a default image or ensure imageUrl is always set, even if null/empty string
    const imageUrl = noteData.imageUrl || 'https://via.placeholder.com/300.png?text=Note';
    const passwordProtected = noteData.passwordProtected || false;

    // Construct the full URL for OGP (replace with your actual domain)
    const appDomain = functions.config().hosting?.domain || 'your-app-domain.com'; // Define in Firebase config or hardcode
    const noteUrl = `https://${appDomain}/notes/${noteId}`;


    let bodyContent;
    if (passwordProtected) {
      // For now, just show a message. Full password handling is complex for this step.
      bodyContent = `
        <h1>${title}</h1>
        <p>This note is password protected.</p>
        <p><i>(Password entry form would be here)</i></p>
      `;
    } else {
      bodyContent = `
        <h1>${title}</h1>
        <p>${description.replace(/\n/g, '<br>')}</p>
        ${noteData.imageUrl ? `<img src="${imageUrl}" alt="Note Image" style="max-width: 100%; height: auto;">` : ''}
      `;
    }

    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:url" content="${noteUrl}">
        <meta property="og:type" content="article">
        <style>
          body { font-family: sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #333; }
          p { color: #555; }
          img { margin-top: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          #actions { margin-top: 25px; }
          button { padding: 10px 15px; font-size: 1em; cursor: pointer; margin-right:10px }
        </style>
      </head>
      <body>
        ${bodyContent}
        <div id="actions">
          <button onclick="tryOpenApp()">Open in App</button>
          <button onclick="goToWebApp()">Open in Web App</button>
        </div>
        <script>
          function tryOpenApp() {
            const noteId = "${noteId}";
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const customScheme = \`mynoteapp://notes/\${noteId}\`; // Your app's custom URL scheme
            const appStoreLink = "YOUR_APP_STORE_LINK"; // e.g., https://apps.apple.com/app/your-app-name/idYOUR_APP_ID
            const playStoreLink = "YOUR_PLAY_STORE_LINK"; // e.g., https://play.google.com/store/apps/details?id=com.your.apppackage

            // Attempt to open via custom scheme
            // This is a common approach but has limitations (e.g., no direct feedback if app isn't installed)

            const timeout = setTimeout(() => {
              // If timeout occurs, assume app is not installed or didn't open
              console.log('App not opened via scheme, or took too long.');
              if (/android/i.test(userAgent)) {
                window.location.href = playStoreLink;
              } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
                window.location.href = appStoreLink;
              } else {
                // Fallback for other OS or if store links are not set
                alert("App not found. Please install it from the app store or use the web app.");
                // Optionally, redirect to a generic web page about your app
              }
            }, 2500); // 2.5 seconds timeout

            window.location.href = customScheme;

            // Clear timeout if page is hidden (means app likely opened)
            // This is a heuristic
            document.addEventListener("visibilitychange", () => {
              if (document.visibilityState === 'hidden') {
                clearTimeout(timeout);
              }
            });
            // For older browsers that don't support visibilitychange
            window.addEventListener("pagehide", () => {
                clearTimeout(timeout);
            });

            // Fallback for browsers where the above might not work well or is blocked
            // Some browsers might block programmatic redirects initiated this way
            // A button "Open in App" that directly links to customScheme can be more reliable
            // if the user explicitly clicks it.
          }

          function goToWebApp() {
            const noteId = "${noteId}";
            // Replace with your web app's URL structure
            window.location.href = \`https://${appDomain}/webapp/notes/\${noteId}\`;
          }

          // Optional: Automatically try to open the app if a query param is set, e.g. ?openInApp=true
          // const urlParams = new URLSearchParams(window.location.search);
          // if (urlParams.get('openInApp') === 'true') {
          //  tryOpenApp();
          // }
        <\/script>
      </body>
      </html>
    `;
    res.status(200).set('Content-Type', 'text/html').send(htmlResponse);

  } catch (error) {
    logger.error(`Error retrieving public note ${noteId}:`, error);
    res.status(500).set('Content-Type', 'text/html').send(`
      <html><head><title>Error</title></head>
      <body><h1>500 - Internal Server Error</h1><p>An error occurred while trying to retrieve the note.</p></body></html>`);
  }
});
