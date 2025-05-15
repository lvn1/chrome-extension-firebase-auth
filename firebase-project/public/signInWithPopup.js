import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js'

const firebaseConfig = {
  apiKey: "AIzaSyDUnp1zjqoB5hc-3c4f9m289TtEQaI39EU",
  authDomain: "testvorgan.firebaseapp.com",
  projectId: "testvorgan",
  storageBucket: "testvorgan.appspot.com",
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

// Add auth state observer
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? {
        uid: user.uid,
        email: user.email,
        isAnonymous: user.isAnonymous
    } : 'No user');
});

// Handle file upload to Firebase Storage
async function handleFileUpload(blob, filename) {
    try {
        // Log current auth state
        const currentUser = auth.currentUser;
        console.log('Current user:', currentUser ? {
            uid: currentUser.uid,
            email: currentUser.email,
            isAnonymous: currentUser.isAnonymous,
            emailVerified: currentUser.emailVerified,
            token: await currentUser.getIdToken()
        } : 'No user');

        if (!currentUser) {
            console.error('No authenticated user found');
            return { success: false, error: 'No authenticated user found' };
        }

        // Use proper path with user isolation
        const securePath = `screenshots/${currentUser.uid}/${new Date().getTime()}.png`;
        console.log('Attempting upload to path:', securePath);

        // Create a reference to the file location
        const storageRef = ref(storage, securePath);
        console.log('Storage reference:', storageRef);
        
        // Upload the blob with metadata
        const metadata = {
            contentType: 'image/png',
            customMetadata: {
                'uploadedBy': currentUser.uid,
                'uploadTime': new Date().toISOString()
            }
        };

        console.log('Starting upload with path:', securePath);
        console.log('Storage bucket:', storage.app.options.storageBucket);
        
        const uploadResult = await uploadBytes(storageRef, blob, metadata);
        console.log('Upload completed:', uploadResult);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Download URL obtained:', downloadURL);
        
        return { success: true, url: downloadURL };
    } catch (error) {
        console.error('Upload error:', {
            code: error.code,
            message: error.message,
            serverResponse: error.serverResponse,
            fullError: error
        });
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
