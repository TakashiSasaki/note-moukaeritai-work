// Import the functions you need from the SDKs you need
// initializeApp is likely already called in auth.js, so we might not need it here if db is initialized using the default app.
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Assuming firebaseConfig is available from auth.js or initialized similarly
// If not, you'll need to duplicate or import firebaseConfig here
// For simplicity, this example assumes firebaseConfig is globally available via window from auth.js
// Ensure auth.js is loaded before this script if relying on window.firebaseConfig

let db;

try {
    if (window.firebaseConfig) {
        // Initialize Firebase (if not already done by auth.js)
        // const app = initializeApp(window.firebaseConfig); // This might re-initialize if auth.js already did.
        // It's better to get the existing app instance if auth.js initializes it.
        // For modular SDK, initializeApp should only be called once.
        // We will assume auth.js has initialized the app and Firestore can be initialized from the default app.
        db = getFirestore();
        console.log("Firestore initialized successfully.");
    } else {
        console.error("Firebase config not found. Ensure auth.js is loaded first or firebaseConfig is defined.");
        // Fallback or error handling
    }
} catch (error) {
    console.error("Error initializing Firestore:", error);
}


// Placeholder functions for Firestore operations

/**
 * Creates a new note for a given user.
 * @param {string} userId The ID of the user.
 * @param {object} noteData The data for the new note.
 * Expected structure: { title: "My Note", createdAt: serverTimestamp(), ... }
 */
const createNote = async (userId, noteData) => {
  if (!db) {
    console.error("Firestore not initialized.");
    return;
  }
  if (!db) {
    console.error("Firestore not initialized for createNote.");
    throw new Error("Firestore not initialized.");
  }

  const userNotesCol = collection(db, `users/${userId}/notes`);
  // Generate a new ID client-side for use with setDoc
  const newNoteRef = doc(userNotesCol);

  const fullNoteData = {
    ...noteData,
    id: newNoteRef.id, // Store the ID within the document as well
    createdAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
    isPublic: false, // Default for new notes
    ownerUid: userId
  };

  console.log(`Creating note for userId: ${userId} at path users/${userId}/notes/${newNoteRef.id}`, fullNoteData);

  try {
    await setDoc(newNoteRef, fullNoteData);
    console.log("Note created with ID: ", newNoteRef.id);
    return newNoteRef.id;
  } catch (e) {
    console.error("Error creating note: ", e);
    throw e; // Re-throw the error to be caught by the caller
  }
};

/**
 * Adds a new entry to a specific note for a given user.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note.
 * @param {object} entryData The data for the new entry.
 * Expected structure: { content: "This is an entry.", timestamp: serverTimestamp(), ... }
 */
const addNoteEntry = async (userId, noteId, entryData) => {
  if (!db) {
    console.error("Firestore not initialized.");
    return;
  }
  if (!db) {
    console.error("Firestore not initialized for addNoteEntry.");
    throw new Error("Firestore not initialized.");
  }
/**
 * Adds a new entry to a specific note for a given user, using a pre-generated entryId.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note.
 * @param {string} entryId The pre-generated ID for the new entry.
 * @param {object} entryData The data for the new entry (should include text, imageUrls, links).
 */
const addNoteEntry = async (userId, noteId, entryId, entryData) => {
  if (!db) {
    console.error("Firestore not initialized for addNoteEntry.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Adding note entry for userId: ${userId}, noteId: ${noteId}, entryId: ${entryId}`, entryData);
  try {
    // Construct the document reference with the pre-generated entryId
    const entryRef = doc(db, `users/${userId}/notes/${noteId}/entries`, entryId);

    const fullEntryData = {
      id: entryId, // Store id in the document, consistent with other ops
      ...entryData, // This should already contain text, imageUrls, links
      timestamp: serverTimestamp()
    };

    await setDoc(entryRef, fullEntryData);
    console.log("Entry added with ID: ", entryId);
    return entryId; // Return the passed-in entryId
  } catch (e) {
    console.error("Error adding note entry with pre-generated ID: ", e);
    throw e;
  }
};

/**
 * Retrieves a specific note for a given user.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note.
 */
const getNote = async (userId, noteId) => {
  if (!db) {
    console.error("Firestore not initialized.");
    return;
  }
  if (!db) {
    console.error("Firestore not initialized for getNote.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Getting note for userId: ${userId}, noteId: ${noteId}`);
  try {
    const noteRef = doc(db, `users/${userId}/notes/${noteId}`);
    const noteSnap = await getDoc(noteRef);
    if (noteSnap.exists()) {
      console.log("Note data:", noteSnap.data());
      return { id: noteSnap.id, ...noteSnap.data() };
    } else {
      console.log("No such note!");
      return null;
    }
  } catch (e) {
    console.error("Error getting note: ", e);
    throw e;
  }
};

/**
 * Retrieves a specific public note.
 * @param {string} noteId The ID of the public note.
 */
const getPublicNote = async (noteId) => {
  if (!db) {
    console.error("Firestore not initialized.");
    return;
  }
  if (!db) {
    console.error("Firestore not initialized for getPublicNote.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Getting public note for noteId: ${noteId}`);
  try {
    const publicNoteRef = doc(db, `publicNotes/${noteId}`);
    const noteSnap = await getDoc(publicNoteRef);
    if (noteSnap.exists()) {
      console.log("Public note data:", noteSnap.data());
      return { id: noteSnap.id, ...noteSnap.data() };
    } else {
      console.log("No such public note!");
      return null;
    }
  } catch (e) {
    console.error("Error getting public note: ", e);
    throw e;
  }
};

/**
 * Retrieves user statistics summary.
 * @param {string} userId The ID of the user.
 */
const getUserStats = async (userId) => {
  if (!db) {
    console.error("Firestore not initialized.");
    return;
  }
  if (!db) {
    console.error("Firestore not initialized for getUserStats.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Getting user stats for userId: ${userId}`);
  try {
    const statsRef = doc(db, `users/${userId}/statistics/summary`);
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
      console.log("User stats:", statsSnap.data());
      return statsSnap.data();
    } else {
      console.log("No user stats found!");
      return null;
    }
  } catch (e) {
    console.error("Error getting user stats: ", e);
    throw e;
  }
};

/**
 * Deletes a specific note for a given user.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note to delete.
 */
const deleteNote = async (userId, noteId) => {
  if (!db) {
    console.error("Firestore not initialized for deleteNote.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Deleting note for userId: ${userId}, noteId: ${noteId}`);
  try {
    const noteRef = doc(db, `users/${userId}/notes/${noteId}`);
    await deleteDoc(noteRef);
    console.log("Note deleted successfully.");
  } catch (e) {
    console.error("Error deleting note: ", e);
    throw e;
  }
};

/**
 * Retrieves all notes for a given user.
 * @param {string} userId The ID of the user.
 */
const getUserNotes = async (userId) => {
  if (!db) {
    console.error("Firestore not initialized for getUserNotes.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Getting all notes for userId: ${userId}`);
  try {
    const notesCol = collection(db, `users/${userId}/notes`);
    const notesSnapshot = await getDocs(notesCol);
    const notesList = notesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    console.log(`Found ${notesList.length} notes for user ${userId}.`);
    return notesList;
  } catch (e) {
    console.error("Error getting user notes: ", e);
    throw e;
  }
};

/**
 * Updates a specific note for a given user.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note to update.
 * @param {object} updatedData The data to update the note with.
 */
const updateNote = async (userId, noteId, updatedData) => {
  if (!db) {
    console.error("Firestore not initialized for updateNote.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Updating note for userId: ${userId}, noteId: ${noteId}`, updatedData);
  try {
    const noteRef = doc(db, `users/${userId}/notes/${noteId}`);
    await setDoc(noteRef, {
      ...updatedData,
      lastUpdatedAt: serverTimestamp()
    }, { merge: true }); // Use merge:true to only update provided fields and not overwrite the entire doc
    console.log("Note updated successfully.");
  } catch (e) {
    console.error("Error updating note: ", e);
    throw e;
  }
};

/**
 * Retrieves all entries for a specific note, ordered by timestamp.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note.
 */
const getNoteEntries = async (userId, noteId) => {
  if (!db) {
    console.error("Firestore not initialized for getNoteEntries.");
    throw new Error("Firestore not initialized.");
  }
  console.log(`Getting entries for noteId: ${noteId}, userId: ${userId}`);
  try {
    const entriesCol = collection(db, `users/${userId}/notes/${noteId}/entries`);
    // Assuming entries have a 'timestamp' field for ordering
    const entriesQuery = query(entriesCol, orderBy("timestamp", "asc"));
    const entriesSnapshot = await getDocs(entriesQuery);
    const entriesList = entriesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    console.log(`Found ${entriesList.length} entries for note ${noteId}.`);
    return entriesList;
  } catch (e) {
    console.error("Error getting note entries: ", e);
    throw e;
  }
};


// Expose functions to global scope for potential use in index.html or other scripts
window.createNote = createNote;
window.addNoteEntry = addNoteEntry;
window.getNote = getNote;
window.getPublicNote = getPublicNote;
window.getUserStats = getUserStats;
window.deleteNote = deleteNote;
window.getUserNotes = getUserNotes;
window.updateNote = updateNote;
window.getNoteEntries = getNoteEntries;


console.log("firestore_ops.js loaded. Firestore functions are available.");
