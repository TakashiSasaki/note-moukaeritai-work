// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  EmailAuthProvider,
  linkWithCredential
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig); // Export app

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Function for Google Sign-In
const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  const currentUser = auth.currentUser;

  // Regardless of whether a user is anonymous or not, we start the popup flow.
  // The linking/conflict logic is handled *after* a successful popup.
  signInWithPopup(auth, provider)
    .then((result) => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user; // This is the user from the Google Sign-In

      if (currentUser && currentUser.isAnonymous) {
        // If there was an anonymous user, try to link
        linkWithCredential(currentUser, credential)
          .then((linkResult) => {
            console.log("Anonymous account successfully linked with Google.", linkResult.user.uid);
            // UI update will be handled by onAuthStateChanged
          })
          .catch((error) => {
            if (error.code === 'auth/credential-already-in-use') {
              console.warn("Error linking: Google credential already in use by another account.", error);
              // At this point, 'result.user' is the Google account that already exists.
              // 'currentUser' is still the anonymous user.
              if (window.confirm(`This Google account (${result.user.email}) is already registered. Would you like to sign in with this Google account and migrate your anonymous data?`)) {
                // To sign in with the existing Google account and then migrate:
                // 1. Sign out the anonymous user.
                // 2. The Google account ('result.user') is ALREADY signed in by the signInWithPopup.
                //    So, we don't need to signInWithPopup again.
                //    The key is that `signInWithPopup` already switched the auth state to the Google user.
                //    We need to ensure the `currentUser` reference is updated or rely on `onAuthStateChanged`.
                //
                // Let's verify the current user after signInWithPopup when conflict occurs.
                // Firebase automatically signs in the new user (from popup) if there's a conflict during link.
                // So, auth.currentUser is now the Google User. The anonymous user is detached.
                console.log("Current user is now the Google user:", auth.currentUser.uid, ". Anonymous user is detached.");
                alert(`You are now signed in as ${auth.currentUser.email}. The anonymous session's data needs to be migrated.`);
                requestDataMigration(credential); // Pass the Google credential for migration.
              } else {
                // User chose not to migrate.
                // The anonymous user was detached by the failed link attempt where the new user (Google) took over.
                // To revert to an anonymous-like state, we could sign out the Google user,
                // and then sign back in anonymously, but this would lose the anonymous UID.
                // This scenario is complex. For now, the user is logged in as the Google user.
                console.log("User chose not to migrate. Currently logged in as the Google user.");
                alert(`You are now signed in as ${auth.currentUser.email}. The previous anonymous session was not merged.`);
              }
            } else {
              console.error("Error linking anonymous account with Google:", error);
              alert(`Error linking with Google: ${error.message}`);
            }
          });
      } else {
        // This is a normal Google sign-in (not an anonymous user linking)
        console.log("Signed in with Google:", user.displayName, user.email);
        // UI update will be handled by onAuthStateChanged
      }
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      const email = error.customData ? error.customData.email : 'N/A';
      console.error("Google sign-in main error:", errorCode, errorMessage, email);
      if (errorCode === 'auth/popup-closed-by-user') {
        alert("Sign-in popup closed by user. Please try again.");
      } else if (errorCode === 'auth/cancelled-popup-request') {
        alert("Multiple sign-in popups opened. Please complete one or try again.");
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        // This error occurs if the user tries to sign in with Google,
        // and that Google email is already linked to an email/password account,
        // but not directly a Google account.
        // Firebase usually provides `error.email` and `error.credential` in this case.
        alert(`An account already exists with the email ${email}, but with a different sign-in method. Try signing in with your password, or link your Google account from your profile settings if available.`);
      }
      else {
        alert(`Google Sign-In Error: ${errorMessage}`);
      }
    });
};

// Function for anonymous sign-in
const signInAnonymouslyHandler = () => {
  signInAnonymously(auth)
    .then((userCredential) => {
      // Signed in anonymously
      const user = userCredential.user;
      console.log("Signed in anonymously:", user.uid);
      // Update UI or redirect
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error("Anonymous sign-in error:", errorCode, errorMessage);
    });
};

// Function for email/password sign-up
const createUserWithEmailAndPasswordHandler = (email, password) => {
  // This function is for new user sign-up, so direct linking isn't the primary path here.
  // If an anonymous user uses this form, they are intending to create a new distinct account.
  // Account linking should happen if an anonymous user tries to SIGN IN with existing credentials.
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      console.log("Signed up with email and password:", user.uid);
      // Update UI or redirect
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error("Email/password sign-up error:", errorCode, errorMessage);
      // Potentially handle 'auth/email-already-in-use' for sign-up if needed.
    });
};

// Placeholder for data migration function
const requestDataMigration = (conflictingCredential, anonymousUserUid) => {
  if (!auth) {
    console.error("Auth service not initialized in requestDataMigration.");
    return;
  }
  if (!anonymousUserUid) {
    console.error("Anonymous user UID is required for data migration.");
    alert("Error: Anonymous user ID not available for migration.");
    return;
  }

  console.log("Requesting data migration for anonymous UID:", anonymousUserUid);
  console.log("Conflicting/Target credential for permanent account:", conflictingCredential);

  let migrationPayload = {
    anonymousUid: anonymousUserUid,
    newCredentialInfo: {
      providerId: conflictingCredential.providerId
    }
  };

  if (conflictingCredential.providerId === 'password' && conflictingCredential.email) {
    // For email/password, we pass the email. The password is not directly passed.
    // The callable function assumes the user is ALREADY signed in with this email/password.
    migrationPayload.newCredentialInfo.email = conflictingCredential.email;
  } else if (conflictingCredential.providerId === 'google.com' && conflictingCredential.idToken) {
    // For Google (and other OAuth providers), pass the idToken.
    migrationPayload.newCredentialInfo.idToken = conflictingCredential.idToken;
    migrationPayload.newCredentialInfo.email = conflictingCredential.email; // Also useful for logging/linking
  } else {
    console.warn("Credential type for migration is not fully handled or is missing expected fields:", conflictingCredential);
    alert("Could not prepare migration request for this account type.");
    return;
  }

  console.log("Data that WOULD be sent to migrateUserData callable function:", migrationPayload);
  alert("Data migration request prepared (logged to console). Actual call to Cloud Function is commented out.");

  // Example of how you might call the function (ensure you have getFunctions and httpsCallable from 'firebase/functions'):
  // import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
  // const functions = getFunctions(getApp()); // Assuming getApp() is available or app is passed
  // const migrateUserDataFn = httpsCallable(functions, 'note-migrateUserData'); // Updated to note-migrateUserData
  // migrateUserDataFn(migrationPayload)
  //   .then((result) => {
  //     console.log('migrateUserData callable function returned:', result);
  //     alert('Data migration process initiated: ' + result.data.message);
  //   })
  //   .catch((error) => {
  //     console.error('Error calling migrateUserData callable function:', error);
  //     alert('Error initiating data migration: ' + error.message);
  //   });
};


// Function for email/password sign-in
const signInWithEmailAndPasswordHandler = (email, password) => {
  const currentUser = auth.currentUser;
  const credential = EmailAuthProvider.credential(email, password);

  if (currentUser && currentUser.isAnonymous) {
    linkWithCredential(currentUser, credential)
      .then((usercred) => {
        const user = usercred.user;
        console.log("Anonymous account successfully linked with email/password.", user.uid);
        // Update UI or redirect
      })
      .catch((error) => {
        if (error.code === 'auth/credential-already-in-use') {
          console.warn("Error linking: Credential already in use.", error);
          if (window.confirm("This email is already associated with an account. Would you like to sign in to that account and migrate your anonymous data?")) {
            // User wants to migrate. Sign out anonymous user, then sign in with the conflicting credential.
            const existingUserEmail = error.customData?.email || "the existing account"; // error.customData.email might not be available for password creds
            signOut(auth).then(() => {
                signInWithEmailAndPassword(auth, email, password).then(userCredential => {
                    console.log(`Signed in to existing account: ${userCredential.user.uid}. Now attempting to signal data migration.`);
                    alert(`You are now signed in to ${existingUserEmail}. Anonymous data migration needs to be implemented via a Cloud Function call.`);
            // The anonymous user was currentUser before signOut.
            const originalAnonymousUid = currentUser.uid;
            requestDataMigration(EmailAuthProvider.credential(email, password), originalAnonymousUid);
                }).catch(signInError => {
                    console.error("Error signing into existing account during migration attempt:", signInError);
                    alert(`Error signing into existing account: ${signInError.message}`);
                });
            }).catch(signOutError => {
                console.error("Error signing out anonymous user during migration attempt:", signOutError);
                alert(`Error signing out anonymous user: ${signOutError.message}`);
            });
          } else {
            // User does not want to migrate. Optionally sign out anonymous user or offer other solutions.
            console.log("User chose not to migrate. Anonymous user remains.");
            alert("You are still signed in as an anonymous user. Your data has not been migrated.");
          }
        } else {
          console.error("Error linking anonymous account with email/password:", error);
          alert(`Error linking account: ${error.message}`);
        }
      });
  } else {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log("Signed in with email and password:", user.uid);
        // Update UI or redirect
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Email/password sign-in error:", errorCode, errorMessage);
         if (errorCode === 'auth/user-not-found') {
            alert("No user found with this email. Please sign up or try again.");
        } else if (errorCode === 'auth/wrong-password') {
            alert("Incorrect password. Please try again.");
        } else {
            alert(`Error: ${errorMessage}`);
        }
      });
  }
};

// Function for sign-out
const signOutHandler = () => {
  signOut(auth)
    .then(() => {
      // Sign-out successful.
      console.log("Signed out");
      // Update UI or redirect
    })
    .catch((error) => {
      // An error happened.
      console.error("Sign-out error:", error);
    });
};

// Observer for authentication state changes
onAuthStateChanged(auth, (user) => {
  const userStatusElement = document.getElementById("user-status");
  const anonUpgradePrompt = document.getElementById("anonymous-upgrade-prompt");
  const noteManagementSection = document.getElementById("note-management-section");
  const notesListDiv = document.getElementById('notes-list'); // For clearing on logout

  if (user) {
    console.log("User is signed in:", user);
    let statusText = `Logged in as: ${user.email || (user.providerData[0] && user.providerData[0].displayName) || user.uid}`;
    if (user.isAnonymous) {
      statusText = `Logged in as: Anonymous (${user.uid})`;
      if (anonUpgradePrompt) anonUpgradePrompt.style.display = 'block';
    } else {
      if (anonUpgradePrompt) anonUpgradePrompt.style.display = 'none';
    }
    userStatusElement.textContent = statusText;

    if (noteManagementSection) noteManagementSection.style.display = 'block';
    if (window.appLoadUserNotes) {
      window.appLoadUserNotes(); // Load notes for the logged-in user
    } else {
      console.warn("window.appLoadUserNotes not defined. Ensure app.js is loaded.");
    }

  } else {
    console.log("User is signed out");
    userStatusElement.textContent = "Not logged in.";
    if (anonUpgradePrompt) anonUpgradePrompt.style.display = 'none';
    if (noteManagementSection) noteManagementSection.style.display = 'none';
    if (notesListDiv) notesListDiv.innerHTML = ''; // Clear notes list on logout
  }
});

// Expose functions to global scope for event handlers in index.html
window.signInAnonymouslyHandler = signInAnonymouslyHandler;
window.createUserWithEmailAndPasswordHandler = createUserWithEmailAndPasswordHandler;
window.signInWithEmailAndPasswordHandler = signInWithEmailAndPasswordHandler;
window.signOutHandler = signOutHandler;
window.signInWithGoogle = signInWithGoogle; // Expose Google Sign-In handler
window.requestDataMigration = requestDataMigration; // Expose for potential manual call or future use
window.auth = auth; // expose auth for convenience if needed elsewhere
window.getAuth = getAuth; // expose getAuth for convenience if needed elsewhere
window.initializeApp = initializeApp; // expose initializeApp for convenience if needed elsewhere
window.firebaseConfig = firebaseConfig; // expose firebaseConfig for convenience if needed elsewhere
console.log("auth.js loaded and Firebase initialized (check your actual firebaseConfig)");
