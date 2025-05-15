const FIREBASE_HOSTING_URL = 'https://testvorgan.web.app/'; // Replace with your Firebase hosting URL

const iframe = document.createElement('iframe');
iframe.src = FIREBASE_HOSTING_URL;
document.body.appendChild(iframe);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getAuth' && message.target === 'offscreen') {
        function handleIframeMessage({data}) {
            try {
                const parsedData = JSON.parse(data);
                window.removeEventListener('message', handleIframeMessage);
                sendResponse(parsedData.user);
            } catch (e) {
                console.error('Error parsing iframe message:', e);
            }
        }

        window.addEventListener('message', handleIframeMessage);
        iframe.contentWindow.postMessage({initAuth: true}, FIREBASE_HOSTING_URL);
        return true; // Indicates we will send a response asynchronously
    }
    if (message.target === 'offscreen') {
        if (message.action === 'uploadScreenshot') {
            handleScreenshotUpload(message.data)
                .then(url => sendResponse({ success: true, url: url }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        }
    }
});

// Function to handle screenshot upload
async function handleScreenshotUpload({ blob, filename }) {
    try {
        // Create a reference to the file location
        const storageRef = ref(storage, filename);
        
        // Upload the blob
        await uploadBytes(storageRef, blob);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading to Firebase Storage:', error);
        throw error;
    }
}

