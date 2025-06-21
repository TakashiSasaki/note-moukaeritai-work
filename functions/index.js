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

  // TODO: Implement actual data migration logic
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

  // TODO: Implement actual export logic
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
  const { importFilePath } = data;

  if (!importFilePath) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing importFilePath in data.');
  }

  logger.info(`Placeholder: User ${userId} initiated data import from path: ${importFilePath}.`);

  // TODO: Implement actual import logic
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
    // Placeholder logic
    logger.info("Placeholder: cleanupDeletedEntry triggered.");
    return null;
  });


// --- Storage Trigger Functions ---
const processStorageUpdate = async (object, isDeletion = false) => {
  const filePath = object.name;
  const fileSize = parseInt(object.size, 10);
  logger.info(`updateStorageStats: Processing ${isDeletion ? 'deletion' : 'creation'} for file ${filePath} of size ${fileSize}`);
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
  } else if (req.path.startsWith('/viewNote/')) {
     noteId = req.path.substring('/viewNote/'.length);
  }
  logger.info(`viewNote called. Path: ${req.path}, Parsed Note ID: ${noteId}`);
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
    const appDomain = functions.config().hosting?.domain || 'your-app-domain.com';
    const noteUrl = `https://${appDomain}/notes/${noteId}`;
    let bodyContent = passwordProtected ? `<p>This note is password protected.</p>` : `<p>${description.replace(/\n/g, '<br>')}</p>`;
    if (!noteData.passwordProtected && noteData.imageUrl) {
        bodyContent += `<img src="${imageUrl}" alt="Note Image" style="max-width: 100%; height: auto;">`;
    }
    const htmlResponse = `...`; // Full HTML as before, shortened for brevity here
    res.status(200).set('Content-Type', 'text/html').send(htmlResponse);
  } catch (error) {
    logger.error(`Error retrieving public note ${noteId}:`, error);
    res.status(500).set('Content-Type', 'text/html').send('Internal Server Error');
  }
});

// Export the grouped functions
exports.note = noteFunctions;
