document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('event-popup');
    const okButton = popup.querySelector('.ok-button');
    okButton.addEventListener('click', saveBookmark);
    popup.addEventListener('keypress', (_event) => {
        if (_event.key === 'Enter') saveBookmark({target: okButton});
    })
    chrome.tabs.query({active: true})
        .then((selectedTabs) => {
            if (selectedTabs.length > 0) {
                const selectedTab = selectedTabs[0];
                document.getElementById('add-name-input').value = selectedTab.title;
                document.getElementById('add-url-input').value = selectedTab.url;
            }
        })
    popup.querySelector('.cancel-button')
        .addEventListener('click', () => {
            window.close()
        });

    function saveBookmark() {
        SpeedDial.saveBookmark(document.getElementById('add-name-input').value, document.getElementById('add-url-input').value)
            .then(() => {
                window.close();
            })
            .catch((error) => {
                showError(error);
            });
    }
});

function showError(message) {
    alert(message);
}