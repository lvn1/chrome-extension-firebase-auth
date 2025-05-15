const FIREBASE_HOSTING_URL = 'https://testvorgan.web.app/'; // Replace with your Firebase hosting URL

// Add cached auth state
let cachedAuth = null;

const iframe = document.createElement('iframe');
iframe.src = FIREBASE_HOSTING_URL;
document.body.appendChild(iframe);

// Function to get auth state with caching
async function getAuthState() {
    return new Promise((resolve) => {
        if (cachedAuth) {
            resolve(cachedAuth);
            return;
        }

        function handleIframeMessage({data}) {
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.user) {
                    cachedAuth = parsedData.user;
                    window.removeEventListener('message', handleIframeMessage);
                    resolve(cachedAuth);
                }
            } catch (e) {
                console.error('Error parsing iframe message:', e);
            }
        }

        window.addEventListener('message', handleIframeMessage);
        iframe.contentWindow.postMessage({initAuth: true}, FIREBASE_HOSTING_URL);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getAuth' && message.target === 'offscreen') {
        getAuthState()
            .then(user => sendResponse(user))
            .catch(error => {
                console.error('Auth error:', error);
                sendResponse(null);
            });
        return true;
    }
    if (message.target === 'offscreen') {
        if (message.action === 'uploadScreenshot') {
            handleScreenshotUpload(message.data)
                .then(url => sendResponse({ success: true, url: url }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
        } else if (message.action === 'clearAuth') {
            // Add handler to clear cached auth on sign out
            cachedAuth = null;
            sendResponse({ success: true });
            return true;
        }
    }
});

// Function to handle screenshot upload
async function handleScreenshotUpload({ blob, filename }) {
    try {
        // Ensure we have auth before proceeding
        const auth = await getAuthState();
        if (!auth) {
            throw new Error('Not authenticated');
        }

        return new Promise((resolve, reject) => {
            function handleUploadResponse({data}) {
                try {
                    const response = typeof data === 'string' ? JSON.parse(data) : data;
                    if (response.success) {
                        window.removeEventListener('message', handleUploadResponse);
                        resolve(response.url);
                    } else if (response.error) {
                        window.removeEventListener('message', handleUploadResponse);
                        reject(new Error(response.error));
                    }
                } catch (e) {
                    console.error('Error parsing upload response:', e);
                    reject(e);
                }
            }

            window.addEventListener('message', handleUploadResponse);
            iframe.contentWindow.postMessage({
                action: 'uploadScreenshot',
                data: {
                    blob: blob,
                    filename: filename
                }
            }, FIREBASE_HOSTING_URL);
        });
    } catch (error) {
        console.error('Error handling screenshot upload:', error);
        throw error;
    }
}