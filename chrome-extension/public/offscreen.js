const FIREBASE_HOSTING_URL = 'https://your-project-id.web.app'; // Replace with your Firebase hosting URL

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
});
