document.addEventListener('DOMContentLoaded', () => {
    const userInfoDiv = document.getElementById('userInfo');
    const signInButton = document.getElementById('signInButton');
    const signOutButton = document.getElementById('signOutButton');
    const screenshotButton = document.getElementById('screenshotButton');
    const statusMessage = document.getElementById('statusMessage');

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        statusMessage.className = isError ? 'error' : 'success';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }

    function updateUI(user) {
        if (user) {
            userInfoDiv.textContent = `Signed in as: ${user.email}`;
            signInButton.style.display = 'none';
            signOutButton.style.display = 'block';
            screenshotButton.style.display = 'block';
        } else {
            userInfoDiv.textContent = 'Not signed in';
            signInButton.style.display = 'block';
            signOutButton.style.display = 'none';
            screenshotButton.style.display = 'none';
        }
    }

    // Check initial auth state
    chrome.storage.local.get(['user'], (result) => {
        updateUI(result.user);
    });

    signInButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({action: 'signIn'}, (response) => {
            if (response.error) {
                showStatus('Sign in failed: ' + response.error, true);
            } else {
                updateUI(response.user);
                showStatus('Successfully signed in!');
            }
        });
    });

    signOutButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({action: 'signOut'}, () => {
            updateUI(null);
            showStatus('Successfully signed out!');
        });
    });

    screenshotButton.addEventListener('click', () => {
        screenshotButton.disabled = true;
        showStatus('Taking screenshot...');
        
        chrome.runtime.sendMessage({action: 'takeScreenshot'}, (response) => {
            screenshotButton.disabled = false;
            
            if (response.success) {
                showStatus('Screenshot uploaded successfully!');
                console.log('Screenshot URL:', response.url);
            } else {
                showStatus('Failed to take screenshot: ' + response.error, true);
            }
        });
    });
});
