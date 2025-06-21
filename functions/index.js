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

// Main object to group all functions for this codebase
const noteFunctions = {};

/**
 * logAccess Callable Function
 * Logs access to a note and updates noteReadStatus.
 */
noteFunctions.logAccess = functions.https.onCall(async (data, context) => {
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
noteFunctions.migrateUserData = functions.https.onCall(async (data, context) => {
  logger.info("migrateUserData called with data:", data);

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called by an authenticated user.');
  }
  const newUserId = context.auth.uid;
  const { anonymousUid, newCredentialInfo } = data;

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
  // 5. Consider migrating Storage files if any (e.g., from `note/users/{anonymousUid}/...` to `note/users/{newUserId}/...`).
  return { status: 'success', message: `Placeholder: Data migration for ${anonymousUid} to ${newUserId} would happen here.` };
});


/**
 * exportUserData Callable Function (Placeholder)
 * Placeholder for initiating a user data export.
 */
noteFunctions.exportUserData = functions.https.onCall(async (data, context) => {
  logger.info("exportUserData called by user.");

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userId = context.auth.uid;
  logger.info(`Placeholder: User ${userId} initiated data export.`);
  logger.info("Received data (if any):", data);

  // TODO: Implement actual export logic:
  // 1. Gather all user data from Firestore (notes, entries, stats).
  // 2. Gather list of user's files from Storage (e.g., from `note/users/{userId}/...`).
  // 3. Package data (e.g., into a JSON file or ZIP).
  // 4. Upload the package to a user-specific path in Cloud Storage (e.g., `note/exports/{userId}/{exportFileName}.zip`).
  // 5. Notify the user (e.g., via email or in-app message with a download link).
  return { status: 'success', message: `Placeholder: User data export for ${userId} would be processed here.` };
});


/**
 * importUserData Callable Function (Placeholder)
 * Placeholder for initiating a user data import.
 */
noteFunctions.importUserData = functions.https.onCall(async (data, context) => {
  logger.info("importUserData called by user.");

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const userId = context.auth.uid;
  const { importFilePath } = data; // Expected to be like `note/imports/{userId}/{fileName}.zip`

  if (!importFilePath) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing importFilePath in data.');
  }

  logger.info(`Placeholder: User ${userId} initiated data import from path: ${importFilePath}.`);

  // TODO: Implement actual import logic:
  // 1. Download the import file from Cloud Storage (path is `importFilePath`).
  // 2. Unpack/parse the data.
  // 3. Write data to Firestore under /users/{userId}/...
  // 4. Handle potential conflicts with existing data (e.g., merge, overwrite, skip).
  // 5. If the import includes files, download them from the package and upload to user's Storage (e.g., to `note/users/{userId}/...`).
  return { status: 'success', message: `Placeholder: User data import for ${userId} from ${importFilePath} would be processed here.` };
});


// --- Firestore Trigger Functions ---

/**
 * updateNoteStats Firestore Trigger
 */
noteFunctions.updateNoteStats = functions.firestore
  .document('users/{userId}/notes/{noteId}')
  .onWrite(async (change, context) => {
    const { userId } = context.params;
    const statsRef = db.doc(`users/${userId}/statistics/summary`);

    if (!change.before.exists && change.after.exists) { // Note created
      logger.info(`Note created for user ${userId}, noteId ${context.params.noteId}. Incrementing count.`);
      try {
        await statsRef.set({
          noteCount: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        logger.error(`Failed to increment note count for user ${userId}:`, error);
        const statsDoc = await statsRef.get();
        if (!statsDoc.exists) {
          await statsRef.set({ noteCount: 1, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
        } else {
           logger.error(`Increment failed even though stats doc for ${userId} exists.`);
        }
      }
    } else if (change.before.exists && !change.after.exists) { // Note deleted
      logger.info(`Note deleted for user ${userId}, noteId ${context.params.noteId}. Decrementing count.`);
      try {
        await statsRef.set({
            noteCount: admin.firestore.FieldValue.increment(-1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        logger.error(`Failed to decrement note count for user ${userId}:`, error);
        const statsDoc = await statsRef.get();
        if (!statsDoc.exists) {
            await statsRef.set({ noteCount: 0, lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
        } else {
            logger.error(`Decrement failed for ${userId} even though stats doc exists.`);
        }
      }
    }
    return null;
  });

/**
 * syncPublicNote Firestore Trigger
 */
noteFunctions.syncPublicNote = functions.firestore
  .document('users/{userId}/notes/{noteId}')
  .onWrite(async (change, context) => {
    const { userId, noteId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const publicNoteRef = db.doc(`publicNotes/${noteId}`);

    if (afterData && afterData.isPublic) {
      logger.info(`Note ${noteId} for user ${userId} is public. Syncing to publicNotes.`);
      let description = afterData.description || "This is a public note.";
      let imageUrl = afterData.imageUrl || null;
      const publicNoteData = {
        ownerUid: userId,
        title: afterData.title || "Untitled Note",
        lastUpdatedAt: afterData.lastModified || admin.firestore.FieldValue.serverTimestamp(),
        description: description,
        imageUrl: imageUrl,
        passwordProtected: !!(afterData.publicPassword && afterData.publicPassword.trim() !== ""),
        originalNotePath: `users/${userId}/notes/${noteId}`
      };
      try {
        await publicNoteRef.set(publicNoteData, { merge: true });
      } catch (error) {
        logger.error(`Failed to sync note ${noteId} to publicNotes:`, error);
      }
    }
    else if ((beforeData && beforeData.isPublic) && (!afterData || !afterData.isPublic)) {
      logger.info(`Note ${noteId} for user ${userId} is no longer public. Deleting from publicNotes.`);
      try {
        await publicNoteRef.delete();
      } catch (error) {
        if (error.code !== 'not-found') {
            logger.error(`Failed to delete note ${noteId} from publicNotes:`, error);
        }
      }
    }
    return null;
  });


/**
 * maintainBacklinks Firestore Trigger (Placeholder)
 */
noteFunctions.maintainBacklinks = functions.firestore
  .document('users/{userId}/notes/{noteId}/entries/{entryId}')
  .onWrite(async (change, context) => {
    // Placeholder logic
    logger.info("Placeholder: maintainBacklinks triggered.");
    return null;
  });


/**
 * cleanupDeletedEntry Firestore Trigger (Placeholder)
 */
noteFunctions.cleanupDeletedEntry = functions.firestore
  .document('users/{userId}/notes/{noteId}/entries/{entryId}')
  .onDelete(async (snapshot, context) => {
    const { userId, noteId, entryId } = context.params; // Corrected to get params
    const deletedEntryData = snapshot.data();

    logger.info(`cleanupDeletedEntry triggered for deleted entry ${entryId} in note ${noteId} by user ${userId}.`);
    // logger.debug("Snapshot data:", deletedEntryData);

    // TODO: Implement cleanup logic
    // 1. Delete associated images in Cloud Storage:
    //    - If `deletedEntryData.imageUrls` (e.g., ['gs://<bucket>/note/users/UID/.../img.jpg'] or relative paths like 'note/users/UID/.../img.jpg') exists:
    //      Iterate through the URLs/paths.
    //      `const storage = admin.storage(); const bucket = storage.bucket();`
    //      If full gs:// paths, parse them: `const parts = url.substring(5).split('/'); const bucketName = parts.shift(); const filePath = parts.join('/');`
    //      If relative paths, they should already be like `note/users/...`.
    //      `await bucket.file(filePath).delete();` (for each image)
    //      Ensure `filePath` is correctly prefixed with `note/` if imageURLs store paths relative to the `note/` folder.
    //      For example, if imageUrls store `users/UID/NOTEID/ENTRYID/filename.jpg`, then the path to delete is `note/users/UID/NOTEID/ENTRYID/filename.jpg`.

    // 2. Remove any backlinks this entry might have created: (Logic as before)
    logger.info("Placeholder: Cleanup logic for deleted entry would execute here.");
    return null;
  });


// --- Storage Trigger Functions ---
const processStorageUpdate = async (object, isDeletion = false) => {
  const filePath = object.name;
  const fileSize = parseInt(object.size, 10);
  logger.info(`updateStorageStats: Processing ${isDeletion ? 'deletion' : 'creation'} for file ${filePath} of size ${fileSize}`);

  // Expects paths like "note/users/{userId}/..." or "note/imports/{userId}/..."
  const pathParts = filePath.split('/');
  if (pathParts.length < 3 || pathParts[0] !== 'note' || pathParts[1] !== 'users') {
    logger.info(`File path ${filePath} does not match 'note/users/{userId}/...' structure for user stats. Skipping stats update.`);
    return null;
  }
  const userId = pathParts[2]; // userId is now the third part

  if (!userId) {
    logger.warn(`Could not parse userId from path ${filePath}. Skipping stats update.`);
    return null;
  }

  const statsRef = db.doc(`users/${userId}/statistics/summary`);
  const incrementValue = isDeletion ? -1 : 1;
  const sizeChange = isDeletion ? -fileSize : fileSize;
  try {
    const statsDoc = await statsRef.get();
    let currentImageCount = statsDoc.exists ? (statsDoc.data().imageCount || 0) : 0;
    let currentTotalImageSize = statsDoc.exists ? (statsDoc.data().totalImageSize || 0) : 0;
    const newImageCount = currentImageCount + incrementValue;
    const newTotalImageSize = currentTotalImageSize + sizeChange;
    await statsRef.set({
      imageCount: Math.max(0, newImageCount),
      totalImageSize: Math.max(0, newTotalImageSize),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    logger.error(`Failed to update storage stats for user ${userId}, file ${filePath}:`, error);
  }
  return null;
};

noteFunctions.updateStorageStatsOnFinalize = functions.storage.object().onFinalize(async (object) => {
  return processStorageUpdate(object, false);
});

noteFunctions.updateStorageStatsOnDelete = functions.storage.object().onDelete(async (object) => {
  return processStorageUpdate(object, true);
});


// --- HTTP Trigger Functions ---

/**
 * viewNote HTTP Trigger
 */
noteFunctions.viewNote = functions.https.onRequest(async (req, res) => {
  const pathParts = req.path.split('/');
  let noteId;
  if (pathParts.length === 3 && pathParts[1] === 'notes') {
    noteId = pathParts[2];
  } else if (req.path.startsWith('/viewNote/')) { // This case might not be hit if rewrite is /notes/** -> note-viewNote
     noteId = req.path.substring('/viewNote/'.length);
  } else if (pathParts.length === 2 && pathParts[0] === '') { // Handles /NOTE_ID if function name is stripped by rewrite
      noteId = pathParts[1];
  }

  logger.info(`viewNote (note-viewNote) called. Path: ${req.path}, Parsed Note ID: ${noteId}`);
  if (!noteId || noteId.trim() === "") {
    res.status(400).send('Invalid request: Note ID missing.');
    return;
  }
  try {
    const publicNoteRef = db.doc(`publicNotes/${noteId}`);
    const noteDoc = await publicNoteRef.get();
    if (!noteDoc.exists) {
      res.status(404).set('Content-Type', 'text/html').send('Note Not Found');
      return;
    }
    const noteData = noteDoc.data();
    const title = noteData.title || 'A Shared Note';
    const description = noteData.description || 'Check out this note!';
    const imageUrl = noteData.imageUrl || 'https://via.placeholder.com/300.png?text=Note';
    const passwordProtected = noteData.passwordProtected || false; // Added for completion
    const appDomain = functions.config().hosting?.domain || 'your-app-domain.com';
    const noteUrl = `https://${appDomain}/notes/${noteId}`;

    let bodyContentHtml = passwordProtected ?
        `<h1>${title}</h1><p>This note is password protected.</p><p><i>(Password entry form would be here)</i></p>` :
        `<h1>${title}</h1><p>${description.replace(/\n/g, '<br>')}</p>${noteData.imageUrl ? `<img src="${imageUrl}" alt="Note Image" style="max-width: 100%; height: auto;">` : ''}`;

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
          h1 { color: #333; } p { color: #555; }
          img { margin-top: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          #actions { margin-top: 25px; } button { padding: 10px 15px; font-size: 1em; cursor: pointer; margin-right:10px }
        </style>
      </head>
      <body>
        ${bodyContentHtml}
        <div id="actions">
          <button onclick="tryOpenApp()">Open in App</button>
          <button onclick="goToWebApp()">Open in Web App</button>
        </div>
        <script>
          function tryOpenApp() {
            const noteId = "${noteId}";
            const customScheme = \`mynoteapp://notes/\${noteId}\`;
            // Simplified redirection logic for brevity in this example
            window.location.href = customScheme;
            setTimeout(() => {
              // Fallback if app didn't open, e.g., redirect to store or web app
              // This part needs to be robust as per previous full implementation
              console.log('Fallback: app not opened or no app installed.');
              // window.location.href = \`https://${appDomain}/webapp/notes/\${noteId}\`; // Example fallback
            }, 2500);
          }
          function goToWebApp() {
            const noteId = "${noteId}";
            window.location.href = \`https://${appDomain}/webapp/notes/\${noteId}\`;
          }
        <\/script>
      </body>
      </html>`;
    res.status(200).set('Content-Type', 'text/html').send(htmlResponse);
  } catch (error) {
    logger.error(`Error retrieving public note ${noteId}:`, error);
    res.status(500).set('Content-Type', 'text/html').send('Internal Server Error');
  }
});

// Export the grouped functions
exports.note = noteFunctions;
