import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js'

const firebaseConfig = {
  apiKey: "AIzaSyDUnp1zjqoB5hc-3c4f9m289TtEQaI39EU",
  authDomain: "testvorgan.firebaseapp.com",
  projectId: "testvorgan",
  storageBucket: "testvorgan.firebasestorage.app",
  messagingSenderId: "521105889239",
  appId: "1:521105889239:web:33cbc3bf4e845444a75d92",
  measurementId: "G-V26T8W2SBL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const storage = getStorage(app);

// This gives you a reference to the parent frame, i.e. the offscreen document.
const PARENT_FRAME = document.location.ancestorOrigins[0];

const PROVIDER = new GoogleAuthProvider();

function sendResponse(result) {
  window.parent.postMessage(JSON.stringify(result), PARENT_FRAME);
}

// Handle file upload to Firebase Storage
async function handleFileUpload(blob, filename) {
    try {
        // Create a reference to the file location
        const storageRef = ref(storage, filename);
        
        // Upload the blob
        await uploadBytes(storageRef, blob);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        return { success: true, url: downloadURL };
    } catch (error) {
        console.error('Error uploading to Firebase Storage:', error);
        return { success: false, error: error.message };
    }
}

window.addEventListener('message', async function({data}) {
    if (data.initAuth) {
        signInWithPopup(auth, PROVIDER)
            .then(sendResponse)
            .catch(sendResponse);
    } else if (data.action === 'uploadScreenshot') {
        const result = await handleFileUpload(data.data.blob, data.data.filename);
        sendResponse(result);
    }
});
