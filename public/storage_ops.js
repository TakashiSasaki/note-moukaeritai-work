// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL as getStorageDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// Assuming firebaseConfig is available from auth.js or initialized similarly
// If not, you'll need to duplicate or import firebaseConfig here.
// For simplicity, this example assumes firebaseConfig is globally available via window from auth.js.
// Ensure auth.js is loaded before this script if relying on window.firebaseConfig.

let storage;

try {
    if (window.firebaseConfig) {
        // Initialize Firebase (if not already done by auth.js or firestore_ops.js)
        // const app = initializeApp(window.firebaseConfig); // This might re-initialize.
        // It's better to get the existing app instance.
        // We will assume auth.js has initialized the app.
        storage = getStorage();
        console.log("Firebase Storage initialized successfully.");
    } else {
        console.error("Firebase config not found. Ensure auth.js is loaded first or firebaseConfig is defined.");
        // Fallback or error handling
    }
} catch (error) {
    console.error("Error initializing Firebase Storage:", error);
}

/**
 * Uploads an image for a specific note entry.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note.
 * @param {string} entryId The ID of the entry.
 * @param {File} file The image file to upload.
 */
const uploadImage = async (userId, noteId, entryId, file) => {
  if (!storage) {
    console.error("Firebase Storage not initialized.");
    return;
  }
  if (!file) {
    console.error("No file provided for upload.");
    return;
  }
  if (!file) {
    console.error("No file provided for uploadImage.");
    throw new Error("No file provided.");
  }
  // Use entryId in the path to associate the image with a specific entry
  const imageFileName = `${Date.now()}-${file.name}`;
  const storagePath = `users/${userId}/${noteId}/${entryId}/${imageFileName}`;

  console.log(`Uploading image for userId: ${userId}, noteId: ${noteId}, entryId: ${entryId} to path: ${storagePath}`);

  try {
    if (!storage) { // Double check storage initialization
        console.error("Firebase Storage not initialized at point of upload.");
        throw new Error("Storage service not available.");
    }
    const storageRef = ref(storage, storagePath);
    const uploadTaskSnapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded a blob or file!', uploadTaskSnapshot);
    const downloadURL = await getStorageDownloadURL(uploadTaskSnapshot.ref);
    console.log('File available at', downloadURL);
    return downloadURL; // Return only the URL as per typical requirement
  } catch (e) {
    console.error("Error uploading image: ", e);
    throw e; // Re-throw to be caught by caller
  }
};

/**
 * Deletes an image for a specific note entry.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note.
 * @param {string} entryId The ID of the entry.
 * @param {string} imageFileName The name of the image file to delete.
 */
const deleteImage = async (userId, noteId, entryId, imageFileName) => {
  if (!storage) {
    console.error("Firebase Storage not initialized.");
    return;
  }
  const imagePath = `users/${userId}/${noteId}/${entryId}/${imageFileName}`;
  console.log(`Placeholder: deleteImage from path: ${imagePath}`);
  // Example:
  // try {
  //   const storageRef = ref(storage, imagePath);
  //   await deleteObject(storageRef);
  //   console.log('File deleted successfully: ', imagePath);
  // } catch (e) {
  //   console.error("Error deleting image: ", e);
  // }
};

/**
 * Gets the download URL for a given file path in Firebase Storage.
 * @param {string} fullPath The full path to the file in Firebase Storage.
 */
const getDownloadURL = async (fullPath) => {
  if (!storage) {
    console.error("Firebase Storage not initialized.");
    return;
  }
  console.log(`Placeholder: getDownloadURL for path: ${fullPath}`);
  // Example:
  // try {
  //   const storageRef = ref(storage, fullPath);
  //   const url = await getStorageDownloadURL(storageRef);
  //   console.log('Download URL:', url);
  //   return url;
  // } catch (e) {
  //   console.error("Error getting download URL: ", e);
  //   // Handle errors (e.g., file not found, unauthorized)
  // }
};

// Expose functions to global scope
window.uploadImage = uploadImage;
window.deleteImage = deleteImage;
window.getDownloadURL = getDownloadURL; // Note: Name clash with internal getDownloadURL, aliased in import.

/**
 * Uploads a file for data import.
 * @param {string} userId The ID of the user.
 * @param {File} file The ZIP file to upload.
 * @returns {Promise<string>} The full Cloud Storage path of the uploaded file.
 */
const uploadImportFile = async (userId, file) => {
  if (!storage) {
    console.error("Firebase Storage not initialized for uploadImportFile.");
    throw new Error("Storage service not available.");
  }
  if (!file) {
    console.error("No file provided for import.");
    throw new Error("No file provided for import.");
  }
  if (!userId) {
    console.error("User ID is required to upload import file.");
    throw new Error("User ID required.");
  }

  const fileName = `${Date.now()}-${file.name}`;
  const storagePath = `imports/${userId}/${fileName}`; // e.g., imports/USER_ID/timestamp-mydata.zip

  console.log(`Uploading import file for userId: ${userId} to path: ${storagePath}`);

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTaskSnapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded import file:', uploadTaskSnapshot);
    // For import, we typically return the full gs:// path or just the path,
    // as the Cloud Function will operate on it directly via Admin SDK.
    // The Admin SDK uses gs://bucket-name/path/to/file.
    // The client `ref.fullPath` gives `path/to/file` without the bucket.
    // The `gsutilURI` on snapshot.ref might be useful if available and needed.
    // For now, let's return the path that the Admin SDK can use, often just the object path.
    // The Cloud Function will know its default bucket.
    console.log(`Import file path for Cloud Function: ${uploadTaskSnapshot.ref.fullPath}`);
    return uploadTaskSnapshot.ref.fullPath; // This is like "imports/USER_ID/timestamp-mydata.zip"
  } catch (e) {
    console.error("Error uploading import file: ", e);
    throw e;
  }
};

window.uploadImportFile = uploadImportFile;

console.log("storage_ops.js loaded. Firebase Storage placeholder functions are available.");
