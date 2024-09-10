document.addEventListener('DOMContentLoaded', function() {
    const signInButton = document.getElementById('signInButton');
    const signOutButton = document.getElementById('signOutButton');
    const userInfo = document.getElementById('userInfo');

    function updateUI(user) {
        if (user) {
            userInfo.textContent = `Signed in as: ${user.email}`;
            signInButton.style.display = 'none';
            signOutButton.style.display = 'block';
        } else {
            userInfo.textContent = 'Not signed in';
            signInButton.style.display = 'block';
            signOutButton.style.display = 'none';
        }
    }

    chrome.storage.local.get(['user'], function(result) {
        updateUI(result.user);
    });

    signInButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'signIn'}, function(response) {
            if (response.user) {
                updateUI(response.user);
            }
        });
    });

    signOutButton.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'signOut'}, function() {
            updateUI(null);
        });
    });
});
