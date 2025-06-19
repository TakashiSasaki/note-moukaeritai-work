// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
      .catch(error => console.log('ServiceWorker registration failed: ', error));
  });
}

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, collection } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"; // Added doc, collection

// Ensure Firebase app is initialized (usually in auth.js or a central init file)
// We rely on auth.js to initialize Firebase and expose firebaseConfig and the auth instance.
// Firestore ops functions are expected to be available on window object from firestore_ops.js

const auth = getAuth(); // Get auth instance from auth.js (assuming it's initialized there)
const db = getFirestore(); // Get firestore instance

const noteManagementSection = document.getElementById('note-management-section');
const createNoteForm = document.getElementById('create-note-form'); // Assuming the form itself has this ID or a child of it
const createNoteButton = document.getElementById('create-note-button');
const notesListDiv = document.getElementById('notes-list');

// Form input fields
const noteTitleInput = document.getElementById('note-title');
const noteTagsInput = document.getElementById('note-tags');
const noteNfcInput = document.getElementById('note-nfc');
const noteQrInput = document.getElementById('note-qr');


/**
 * Handles the creation of a new note.
 */
const createNoteHandler = async () => {
  const title = noteTitleInput.value.trim();
  const tags = noteTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
  const nfcTagId = noteNfcInput.value.trim();
  const qrCodeData = noteQrInput.value.trim();

  if (!title) {
    alert("Note title is required.");
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("You must be logged in to create a note.");
    return;
  }
  const userId = currentUser.uid;

  const noteData = {
    title,
    tags,
    nfcTagId: nfcTagId || null,
    qrCodeData: qrCodeData || null,
    // isPublic will be set to false by default in firestore_ops.createNote
    // createdAt and lastUpdatedAt will be set by firestore_ops.createNote
  };

  console.log("Creating note for userId:", userId, "with data:", noteData);

  try {
    if (window.createNote) {
      const newNoteId = await window.createNote(userId, noteData); // Assuming createNote returns the new note's ID
      console.log("Note creation initiated, ID:", newNoteId);
      if (newNoteId && window.callLogAccess) {
        window.callLogAccess(newNoteId, 'write', { action: 'createNote' })
          .catch(err => console.warn("Failed to log write access for createNote:", err));
      }
      // Clear form
      noteTitleInput.value = '';
      noteTagsInput.value = '';
      noteNfcInput.value = '';
      noteQrInput.value = '';
      // Refresh notes list
      loadUserNotes();
    } else {
      console.error("window.createNote function not found. Ensure firestore_ops.js is loaded and exposes it.");
      alert("Error: Cannot create note at this time.");
    }
  } catch (error) {
    console.error("Error creating note:", error);
    alert("Failed to create note: " + error.message);
  }
};

/**
 * Handles the deletion of a note.
 * @param {string} noteId The ID of the note to delete.
 */
const deleteNoteHandler = async (noteId) => {
  if (!noteId) {
    alert("Note ID is missing.");
    return;
  }
  if (!confirm(`Are you sure you want to delete note ${noteId}?`)) {
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("You must be logged in to delete a note.");
    return;
  }
  const userId = currentUser.uid;

  console.log(`Deleting note: ${noteId} for user: ${userId}`);

  try {
    if (window.deleteNote) {
      await window.deleteNote(userId, noteId);
      console.log("Note deletion initiated for ID:", noteId);
      if (window.callLogAccess) {
         // Using the noteId that was just deleted for the log.
        window.callLogAccess(noteId, 'write', { action: 'deleteNote' })
          .catch(err => console.warn("Failed to log write access for deleteNote:", err));
      }
      // Refresh notes list
      loadUserNotes();
    } else {
      console.error("window.deleteNote function not found. Ensure firestore_ops.js is loaded and exposes it.");
      alert("Error: Cannot delete note at this time.");
    }
  } catch (error) {
    console.error("Error deleting note:", error);
    alert("Failed to delete note: " + error.message);
  }
};

/**
 * Loads and displays the current user's notes.
 */
const loadUserNotes = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in, cannot load notes.");
    notesListDiv.innerHTML = '<p>Please log in to see your notes.</p>';
    return;
  }
  const userId = currentUser.uid;

  notesListDiv.innerHTML = '<p>Loading notes...</p>'; // Show loading state

  try {
    if (window.getUserNotes) {
      const notes = await window.getUserNotes(userId);
      if (notes && notes.length > 0) {
        let notesHtml = '<ul>';
        notes.forEach(note => {
          notesHtml += `
            <li style="margin-bottom: 10px; padding: 5px; border: 1px solid #eee;">
              <strong>${note.title || 'Untitled Note'}</strong> (ID: ${note.id}) <br>
              <small>Tags: ${note.tags ? note.tags.join(', ') : 'N/A'}</small><br>
              <button class="delete-note-btn" data-note-id="${note.id}">Delete</button>
            </li>`;
        });
        notesHtml += '</ul>';
        notesListDiv.innerHTML = notesHtml;

        // Add event listeners to new delete buttons
        document.querySelectorAll('.delete-note-btn').forEach(button => {
          button.addEventListener('click', (event) => {
            deleteNoteHandler(event.target.dataset.noteId);
          });
        });

      } else {
        notesListDiv.innerHTML = '<p>No notes found. Create one!</p>';
      }
    } else {
      console.error("window.getUserNotes function not found. Ensure firestore_ops.js is loaded and exposes it.");
      notesListDiv.innerHTML = '<p>Error: Could not load notes.</p>';
    }
  } catch (error) {
    console.error("Error loading user notes:", error);
    notesListDiv.innerHTML = `<p>Error loading notes: ${error.message}</p>`;
  }
};


// Event Listeners
if (createNoteButton) {
    createNoteButton.addEventListener('click', createNoteHandler);
} else {
    console.warn("#create-note-button not found.");
}


// Expose functions to be called from auth.js or HTML
window.appLoadUserNotes = loadUserNotes; // Renamed to avoid conflict if auth.js also has a loadUserNotes

// Initial setup based on auth state (handled by auth.js calling appLoadUserNotes)
console.log("app.js loaded and event listeners attached.");

// --- Note Detail View and Entry Management ---
const noteDetailSection = document.getElementById('note-detail-section');
const notesListContainer = document.getElementById('notes-list'); // Assuming this is the container for the list
const mainNoteManagementSection = document.getElementById('note-management-section'); // The overall section for notes list and create form

// Edit Note Form Inputs
const editNoteTitleInput = document.getElementById('edit-note-title');
const editNoteTagsInput = document.getElementById('edit-note-tags');
const editNoteNfcInput = document.getElementById('edit-note-nfc');
const editNoteQrInput = document.getElementById('edit-note-qr');
const currentNoteIdInput = document.getElementById('current-note-id'); // Hidden input
const updateNoteButton = document.getElementById('update-note-button');
const backToListButton = document.getElementById('back-to-list-button');

// Add Entry Form Inputs
const entryTextInput = document.getElementById('entry-text');
// const entryImageUrlsInput = document.getElementById('entry-image-urls'); // This was replaced by file input
const entryImageFileInput = document.getElementById('entry-image-file'); // New file input
const entryLinksInput = document.getElementById('entry-links');
const addEntryButton = document.getElementById('add-entry-button');
const noteEntriesListDiv = document.getElementById('note-entries-list');

let currentEditingNoteId = null; // To keep track of the note being viewed/edited

/**
 * Shows the note detail view and loads its data.
 * @param {string} noteId The ID of the note to show.
 */
const showNoteDetailView = async (noteId) => {
  currentEditingNoteId = noteId; // Store the current note ID
  currentNoteIdInput.value = noteId; // Also set in hidden input if needed by other parts

  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("User not logged in.");
    return;
  }
  const userId = currentUser.uid;

  console.log(`Showing detail view for note: ${noteId}`);

  try {
    // Log read access conditionally
    if (window.getNoteReadStatus && window.callLogAccess) {
      const lastReadAt = await window.getNoteReadStatus(userId, noteId);
      // Firestore timestamps can be null or Firestore Timestamp objects
      const lastReadDate = lastReadAt ? (typeof lastReadAt.toDate === 'function' ? lastReadAt.toDate() : new Date(lastReadAt.seconds * 1000)) : null;
      const oneHour = 60 * 60 * 1000;

      if (!lastReadDate || (new Date() - lastReadDate) > oneHour) {
        console.log(`Logging 'read' access for note ${noteId}`);
        window.callLogAccess(noteId, 'read', { source: 'showNoteDetailView' })
          .catch(err => console.warn("Failed to log read access:", err)); // Non-critical, so just warn
      } else {
        console.log(`Note ${noteId} was read recently. No log needed.`);
      }
    } else {
      console.warn("getNoteReadStatus or callLogAccess not available on window.");
    }

    if (window.getNote) {
      const note = await window.getNote(userId, noteId);
      if (note) {
        editNoteTitleInput.value = note.title || '';
        editNoteTagsInput.value = note.tags ? note.tags.join(', ') : '';
        editNoteNfcInput.value = note.nfcTagId || '';
        editNoteQrInput.value = note.qrCodeData || '';

        if(mainNoteManagementSection) mainNoteManagementSection.style.display = 'none';
        if(noteDetailSection) noteDetailSection.style.display = 'block';

        loadNoteEntries(userId, noteId);
      } else {
        alert("Note not found.");
        showListView(); // Go back to list if note not found
      }
    } else {
      console.error("window.getNote is not defined.");
      alert("Error: Cannot fetch note details.");
    }
  } catch (error) {
    console.error("Error fetching note details:", error);
    alert("Error fetching note: " + error.message);
  }
};

/**
 * Hides the note detail view and shows the main notes list view.
 */
const showListView = () => {
  if(noteDetailSection) noteDetailSection.style.display = 'none';
  if(mainNoteManagementSection) mainNoteManagementSection.style.display = 'block';
  currentEditingNoteId = null;
  currentNoteIdInput.value = ''; // Clear hidden input
  loadUserNotes(); // Refresh notes list when going back
};

/**
 * Handles updating the currently edited note's details.
 */
const updateNoteHandler = async () => {
  if (!currentEditingNoteId) {
    alert("No note selected for update.");
    return;
  }
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("User not logged in.");
    return;
  }
  const userId = currentUser.uid;

  const updatedData = {
    title: editNoteTitleInput.value.trim(),
    tags: editNoteTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag),
    nfcTagId: editNoteNfcInput.value.trim() || null,
    qrCodeData: editNoteQrInput.value.trim() || null,
    // lastUpdatedAt will be handled by firestore_ops.updateNote
  };

  if (!updatedData.title) {
    alert("Note title is required.");
    return;
  }

  console.log(`Updating note ${currentEditingNoteId} for user ${userId} with data:`, updatedData);

  try {
    if (window.updateNote) {
      await window.updateNote(userId, currentEditingNoteId, updatedData);
      alert("Note updated successfully!");
      if (window.callLogAccess) {
        window.callLogAccess(currentEditingNoteId, 'write', { action: 'updateNote' })
          .catch(err => console.warn("Failed to log write access for updateNote:", err));
      }
      // Optionally, refresh just this note's view or go back to list
      // For simplicity, we can just stay on the page. The data is saved.
    } else {
      console.error("window.updateNote is not defined.");
      alert("Error: Cannot update note.");
    }
  } catch (error) {
    console.error("Error updating note:", error);
    alert("Failed to update note: " + error.message);
  }
};

/**
 * Handles adding a new entry to the current note.
 */
const addNoteEntryHandler = async () => {
  if (!currentEditingNoteId) {
    alert("No note selected to add an entry to.");
    return;
  }
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("User not logged in.");
    return;
  }
  const userId = currentUser.uid;

  addEntryButton.disabled = true;
  let downloadURL = null;
  const file = entryImageFileInput.files[0];

  // 1. Generate entryId client-side
  // We need 'db' which is getFirestore() instance, already available in app.js
  const tempEntryCollection = collection(db, `users/${userId}/notes/${currentEditingNoteId}/entries`);
  const newEntryRef = doc(tempEntryCollection); // Generates a new DocRef with a unique ID
  const entryId = newEntryRef.id;

  try {
    // 2. Upload image if a file is selected
    if (file && window.uploadImage) {
      console.log(`Uploading image for new entry ${entryId}...`);
      downloadURL = await window.uploadImage(userId, currentEditingNoteId, entryId, file);
      if (!downloadURL) {
        throw new Error("Image upload failed to return a URL.");
      }
      console.log("Image uploaded, URL:", downloadURL);
    }

    // 3. Prepare entry data
    const entryData = {
      text: entryTextInput.value.trim(),
      imageUrls: downloadURL ? [downloadURL] : [], // Store URL in an array
      links: entryLinksInput.value.split(',').map(id => id.trim()).filter(id => id),
      // id: entryId, // This will be handled by firestore_ops.addNoteEntry now using the passed entryId
      // timestamp will be handled by firestore_ops.addNoteEntry
    };

    if (!entryData.text && entryData.imageUrls.length === 0) {
      alert("Entry must have either text or an image.");
      addEntryButton.disabled = false;
      return;
    }

    console.log(`Adding entry (ID: ${entryId}) to note ${currentEditingNoteId} for user ${userId}:`, entryData);

    // 4. Call addNoteEntry with pre-generated entryId
    if (window.addNoteEntry) {
      // Pass entryId to addNoteEntry in firestore_ops.js
      const createdEntryId = await window.addNoteEntry(userId, currentEditingNoteId, entryId, entryData);
      if (createdEntryId && window.callLogAccess) {
         // Log access for the parent note when an entry is added/modified
        window.callLogAccess(currentEditingNoteId, 'write', { action: 'addNoteEntry', entryId: createdEntryId })
          .catch(err => console.warn("Failed to log write access for addNoteEntry:", err));
      }
      // Clear entry form
      entryTextInput.value = '';
      entryImageFileInput.value = ''; // Clear file input
      entryLinksInput.value = '';

      // Refresh entries list
      loadNoteEntries(userId, currentEditingNoteId);
    } else {
      console.error("window.addNoteEntry is not defined.");
      alert("Error: Cannot add entry.");
    }
  } catch (error) {
    console.error("Error adding note entry or uploading image:", error);
    alert("Failed to add entry: " + error.message);
  } finally {
    addEntryButton.disabled = false;
  }
};

/**
 * Loads and displays entries for a given note.
 * @param {string} userId The ID of the user.
 * @param {string} noteId The ID of the note whose entries to load.
 */
const loadNoteEntries = async (userId, noteId) => {
  noteEntriesListDiv.innerHTML = '<p>Loading entries...</p>';
  try {
    if (window.getNoteEntries) {
      const entries = await window.getNoteEntries(userId, noteId);
      if (entries && entries.length > 0) {
        let entriesHtml = '<ul>';
        entries.forEach(entry => {
          entriesHtml += `
            <li style="margin-bottom: 8px; padding: 4px; border: 1px solid #f0f0f0;">
              <p>${entry.text || '<i>No text</i>'}</p>
              ${entry.imageUrls && entry.imageUrls.length > 0 ? `<p><small>Images: ${entry.imageUrls.join(', ')}</small></p>` : ''}
              ${entry.links && entry.links.length > 0 ? `<p><small>Links: ${entry.links.join(', ')}</small></p>` : ''}
              <small><i>Added: ${entry.timestamp ? new Date(entry.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</i></small>
            </li>`;
        });
        entriesHtml += '</ul>';
        noteEntriesListDiv.innerHTML = entriesHtml;
      } else {
        noteEntriesListDiv.innerHTML = '<p>No entries yet. Add one!</p>';
      }
    } else {
      console.error("window.getNoteEntries is not defined.");
      noteEntriesListDiv.innerHTML = '<p>Error: Could not load entries.</p>';
    }
  } catch (error) {
    console.error(`Error loading entries for note ${noteId}:`, error);
    noteEntriesListDiv.innerHTML = `<p>Error loading entries: ${error.message}</p>`;
  }
};


// Modify loadUserNotes to make notes clickable
const originalLoadUserNotes = window.appLoadUserNotes; // Assuming appLoadUserNotes is already on window
window.appLoadUserNotes = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in, cannot load notes for appLoadUserNotes.");
    if (notesListDiv) notesListDiv.innerHTML = '<p>Please log in to see your notes.</p>';
    return;
  }
  const userId = currentUser.uid;

  if (notesListDiv) notesListDiv.innerHTML = '<p>Loading notes...</p>';

  try {
    if (window.getUserNotes) {
      const notes = await window.getUserNotes(userId);
      if (notes && notes.length > 0) {
        let notesHtml = '<ul>';
        notes.forEach(note => {
          notesHtml += `
            <li style="margin-bottom: 10px; padding: 5px; border: 1px solid #eee;">
              <strong style="cursor:pointer; color:blue;" class="note-item" data-note-id="${note.id}">
                ${note.title || 'Untitled Note'}
              </strong> (ID: ${note.id}) <br>
              <small>Tags: ${note.tags ? note.tags.join(', ') : 'N/A'}</small><br>
              <button class="delete-note-btn" data-note-id="${note.id}">Delete</button>
            </li>`;
        });
        notesHtml += '</ul>';
        if (notesListDiv) notesListDiv.innerHTML = notesHtml;

        document.querySelectorAll('.note-item').forEach(item => {
          item.addEventListener('click', (event) => {
            showNoteDetailView(event.target.dataset.noteId);
          });
        });
        document.querySelectorAll('.delete-note-btn').forEach(button => {
          button.addEventListener('click', (event) => {
            // Stop propagation to prevent note-item click if delete is inside the clickable area
            event.stopPropagation();
            deleteNoteHandler(event.target.dataset.noteId);
          });
        });

      } else {
        if (notesListDiv) notesListDiv.innerHTML = '<p>No notes found. Create one!</p>';
      }
    } else {
      console.error("window.getUserNotes function not found.");
      if (notesListDiv) notesListDiv.innerHTML = '<p>Error: Could not load notes.</p>';
    }
  } catch (error) {
    console.error("Error loading user notes (app.js):", error);
    if (notesListDiv) notesListDiv.innerHTML = `<p>Error loading notes: ${error.message}</p>`;
  }
};


// Add event listeners for new buttons
if (updateNoteButton) {
  updateNoteButton.addEventListener('click', updateNoteHandler);
} else {
  console.warn("#update-note-button not found.");
}

if (addEntryButton) {
  addEntryButton.addEventListener('click', addNoteEntryHandler);
} else {
  console.warn("#add-entry-button not found.");
}

if (backToListButton) {
  backToListButton.addEventListener('click', showListView);
} else {
  console.warn("#back-to-list-button not found.");
}

// Expose showNoteDetailView to be called by note items if needed, or handle internally
window.appShowNoteDetailView = showNoteDetailView;
console.log("app.js extended for note detail view and entry management.");

// --- Data Export and Import ---
const exportDataButton = document.getElementById('export-data-button');
const importFileInput = document.getElementById('import-file-input');
const importDataButton = document.getElementById('import-data-button');
const exportImportStatusDiv = document.getElementById('export-import-status');

const exportDataHandler = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Please log in to export data.");
    return;
  }
  if(exportImportStatusDiv) exportImportStatusDiv.textContent = "Processing export...";
  exportDataButton.disabled = true;

  try {
    if (window.callExportUserData) {
      const result = await window.callExportUserData();
      if (result && result.data && result.data.downloadUrl) {
        if(exportImportStatusDiv) exportImportStatusDiv.textContent = "Export successful! Downloading...";
        const a = document.createElement('a');
        a.href = result.data.downloadUrl;
        a.download = result.data.fileName || "notes-export.zip"; // Cloud function should provide filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
            if(exportImportStatusDiv) exportImportStatusDiv.textContent = "Download started.";
        }, 2000);
      } else if (result && result.data && result.data.message) { // For placeholder messages
        if(exportImportStatusDiv) exportImportStatusDiv.textContent = `Export status: ${result.data.message}`;
         alert(`Export status: ${result.data.message}`);
      }
      else {
        throw new Error("Export function did not return a download URL.");
      }
    } else {
      console.error("window.callExportUserData is not defined.");
      if(exportImportStatusDiv) exportImportStatusDiv.textContent = "Error: Export function not available.";
      alert("Error: Export function not available.");
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    if(exportImportStatusDiv) exportImportStatusDiv.textContent = `Export failed: ${error.message}`;
    alert(`Export failed: ${error.message}`);
  } finally {
    exportDataButton.disabled = false;
  }
};

const importDataHandler = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Please log in to import data.");
    return;
  }
  const userId = currentUser.uid;
  const file = importFileInput.files[0];

  if (!file) {
    alert("Please select a ZIP file to import.");
    return;
  }

  if(exportImportStatusDiv) exportImportStatusDiv.textContent = "Processing import...";
  importDataButton.disabled = true;
  importFileInput.disabled = true;

  try {
    // 1. Upload the file to Cloud Storage
    if (!window.uploadImportFile) {
      throw new Error("Import file upload function not available.");
    }
    if(exportImportStatusDiv) exportImportStatusDiv.textContent = "Uploading import file...";
    const storagePath = await window.uploadImportFile(userId, file);
    if (!storagePath) {
      throw new Error("Failed to upload import file or get storage path.");
    }
    console.log("Import file uploaded to:", storagePath);
    if(exportImportStatusDiv) exportImportStatusDiv.textContent = "File uploaded. Starting import process...";

    // 2. Call the importUserData Cloud Function with the storage path
    if (!window.callImportUserData) {
      throw new Error("Import data function not available.");
    }
    const result = await window.callImportUserData(storagePath);

    if (result && result.data && result.data.message) {
        if(exportImportStatusDiv) exportImportStatusDiv.textContent = `Import successful: ${result.data.message}`;
        alert(`Import successful: ${result.data.message}`);
    } else {
        throw new Error("Import function did not return a success message or failed.");
    }

    // 3. Refresh user notes
    if (window.appLoadUserNotes) {
      window.appLoadUserNotes();
    }

  } catch (error) {
    console.error("Error importing data:", error);
    if(exportImportStatusDiv) exportImportStatusDiv.textContent = `Import failed: ${error.message}`;
    alert(`Import failed: ${error.message}`);
  } finally {
    importDataButton.disabled = false;
    importFileInput.disabled = false;
    importFileInput.value = ''; // Clear the file input
  }
};

// Attach event listeners for export/import
if (exportDataButton) {
  exportDataButton.addEventListener('click', exportDataHandler);
} else {
  console.warn("#export-data-button not found.");
}

if (importDataButton) {
  importDataButton.addEventListener('click', importDataHandler);
} else {
  console.warn("#import-data-button not found.");
}

console.log("app.js extended for data export and import.");
