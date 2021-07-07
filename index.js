let g_parentId = '';
const g_parentName = 'Speed Dial';

document.addEventListener('DOMContentLoaded', () => {
    showBookmarks();
    setupAddButton();
    setupPopups();
    setupSearchButton();
    setupChromeListeners();

    function setupChromeListeners() {
        chrome.bookmarks.onRemoved.addListener((id, changeInfo) => {
            showBookmarks();
        });
        chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
            showBookmarks();
        });
        chrome.bookmarks.onCreated.addListener((id, changeInfo) => {
            showBookmarks();
        });
    }

    function setupSearchButton() {
        document.getElementById('search-button')
            .addEventListener('click', (_event) => {
                doSearch();
            });
        document.getElementById('search-input')
            .addEventListener('keypress', doSearch);

        function doSearch() {
            const text = document.getElementById('search-input').value;
            if (text) chrome.search.query({ 'text': text })
                .catch((reason) => {
                    showErrorPopup(`${reason} (doSearch)`);
                });
        }
    }

    function setupAddButton() {
        document.getElementById('add-button')
            .addEventListener('click', (_event) => {
                showAddPopup();
            });
    }

    function setupPopups() {
        window.addEventListener('resize', (_event) => {
            placePopups();
        });
        setupAddPopup();
        setupDeletePopup();
        setupErrorPopup();

        function setupAddPopup() {
            const popup = document.getElementById('add-popup');
            const okButton = popup.querySelector('.ok-button');
            okButton.addEventListener('click', saveBookmark);
            popup.addEventListener('keypress', (_event) => {
                if (_event.key === 'Enter') saveBookmark({ target: okButton });
            })

            popup.querySelector('.cancel-button')
                .addEventListener('click', hideAddPopup);

            function saveBookmark(_event) {
                const bookmark = {
                    title: document.getElementById('add-name-input').value,
                    url: document.getElementById('add-url-input').value
                }
                const id = _event.target.dataset.id;
                if (id) {
                    updateBookmark(id, bookmark);
                } else {
                    bookmark.parentId = g_parentId;
                    createBookmark(bookmark);
                }

                function createBookmark(bookmark) {
                    if (bookmark.title && bookmark.url && bookmark.parentId) {
                        chrome.bookmarks.create(bookmark)
                            .then((result) => {
                                hideAddPopup();
                            })
                            .catch((reason) => {
                                showErrorPopup(`${reason} (createBookmark)`);
                            });
                    } else {
                        showErrorPopup(`Error: Both Name and URL are required. [createBookmark]`)
                    }
                }

                function updateBookmark(id, bookmark) {
                    if (bookmark.title && bookmark.url) {
                        chrome.bookmarks.update(id, bookmark)
                            .then((result) => {
                                hideAddPopup();
                            })
                            .catch((reason) => {
                                showErrorPopup(`${reason} (updateBookmark)`);
                            });
                    } else {
                        showErrorPopup(`Error: Both Name and URL are required. [updateBookmark]`)
                    }
                }
            }
        }

        function setupDeletePopup() {
            const popup = document.getElementById('delete-popup');
            popup.querySelector('.ok-button').addEventListener('click', removeBookmark);
            popup.querySelector('.cancel-button')
                .addEventListener('click', hideDeletePopup);

            function removeBookmark(_event) {
                chrome.bookmarks.remove(_event.target.dataset.id)
                    .catch((reason) => {
                        showErrorPopup(`${reason} (removeBookmark)`);
                    });
                hideDeletePopup();
            }
        }

        function setupErrorPopup() {
            document.getElementById('error-popup')
                .querySelector('.ok-button')
                .addEventListener('click', (_event) => {
                    hideErrorPopup();
                });
        }
    }

    function showBookmarks() {
        document.getElementById('links').innerHTML = '';
        g_parentId = '';
        chrome.bookmarks.search({
            title: g_parentName
        })
            .then((nodes) => {
                for (let i = 0, l = nodes.length; i < l; ++i) {
                    const node = nodes[i];
                    if (!node.url) { // If the node is not a bookmark (i.e. if it's a folder)
                        if (g_parentId === '')
                            g_parentId = node.id;
                        chrome.bookmarks.getSubTree(node.id)
                            .then((subNodes) => {
                                for (let i = 0, l = subNodes.length; i < l; ++i) {
                                    displayBookmarks(subNodes[i].children);
                                }
                            })
                            .catch((reason) => {
                                showErrorPopup(`${reason} (showBookmarks)`);
                            })
                    }
                }
                if (g_parentId === '') {
                    // Create the Speed Dial folder in the first folder,
                    // which should be the Bookmarks bar
                    chrome.bookmarks.create({title: g_parentName, parentId: '1'})
                        .catch((reason) => {
                            showErrorPopup(`${reason} [showBookmarks]`);
                        });
                }
            })
            .catch((reason) => {
                showErrorPopup(`${reason} {showBookmarks}`);
            });

        function displayBookmarks(bookmarks) {
            if (bookmarks) {
                const linksPanel = document.getElementById('links');

                for (let i = 0, l = bookmarks.length; i < l; ++i) {
                    linksPanel.append(makeLinkCard(bookmarks[i]));
                }
            }

            function makeLinkCard(bookmark) {
                const linkCard = document.createElement('div');
                linkCard.addEventListener('mouseenter', (_event) => {
                    _event.target.querySelector('.menu-panel').style.visibility = 'visible';
                })
                linkCard.addEventListener('mouseleave', (_event) => {
                    _event.target.querySelector('.menu-panel').style.visibility = 'hidden';
                })
                linkCard.setAttribute('class', 'link-card');
                linkCard.append(makeMenu(bookmark));
                linkCard.append(makeLink(bookmark));
                return linkCard;

                function makeMenu(bookmark) {
                    const menu = document.createElement('div');
                    menu.setAttribute('class', 'menu-panel');
                    menu.append(makeIconButton('Edit Bookmark', bookmark, 'fa-pen-square', doEdit));
                    menu.append(makeIconButton('Delete Bookmark', bookmark, 'fa-minus-square', doDelete));
                    return menu;

                    function makeIconButton(text, bookmark, iconClass, action) {
                        const button = document.createElement('button');
                        button.classList.add('icon-button');
                        button.append(makeIconElement(text, bookmark, iconClass, action));
                        return button;

                        function makeIconElement(text, bookmark, iconClass, action) {
                            const element = document.createElement('span');
                            button.addEventListener('click', action);
                            element.dataset.id = bookmark.id;
                            element.dataset.title = bookmark.title;
                            element.dataset.url = bookmark.url;
                            element.classList.add('fa');
                            element.classList.add(iconClass);
                            element.title = text;
                            return element;
                        }
                    }
                }

                function makeLink(bookmark) {
                    const card = makeCard(bookmark);
                    card.append(makeLink(bookmark));
                    return card;

                    function makeLink(bookmark) {
                        const link = document.createElement('a');
                        link.href = bookmark.url;
                        link.innerText = bookmark.title;
                        return link;
                    }

                    function makeCard(bookmark) {
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.setAttribute('title', bookmark.title);
                        return card;
                    }
                }

                function doEdit(_event) {
                    showAddPopup({
                        id: _event.target.dataset.id,
                        title: _event.target.dataset.title,
                        url: _event.target.dataset.url
                    });
                }

                function doDelete(_event) {
                    const id = _event.target.dataset.id;
                    showDeletePopup(id);
                }
            }
        }
    }
});

function showAddPopup(bookmark) {
    document.getElementById('add-popup')
        .querySelector('.ok-button').dataset.id = bookmark ? bookmark.id : '';
    document.getElementById('add-url-input').value = bookmark ? bookmark.url : '';
    const nameInput = document.getElementById('add-name-input');
    nameInput.value = bookmark ? bookmark.title : '';
    showPopup('add-popup');
    nameInput.focus();
}

function hideAddPopup() {
    hidePopup('add-popup');
}

function showDeletePopup(id) {
    const okButton = document.getElementById('delete-popup').querySelector('.ok-button');
    okButton.dataset.id = id;
    showPopup('delete-popup');
    okButton.focus();
}

function hideDeletePopup() {
    hidePopup('delete-popup');
}

function showErrorPopup(message) {
    document.getElementById('error-popup')
        .querySelector('p').innerText = message;
    showPopup('error-popup');
}

function hideErrorPopup() {
    hidePopup('error-popup');
}

function showPopup(id) {
    document.getElementById(id).style.display = 'block';
    placePopups();
}

function hidePopup(id) {
    document.getElementById(id).style.display = 'none';
}

function placePopups() {
    const panels = document.getElementsByClassName('popup-panel');
    for (let i = 0, l = panels.length; i < l; ++i) {
        const panel = panels[i];
        if (panel.style.display !== 'none') {
            const popup = panel.querySelector('.popup');
            const left = (panel.scrollWidth - popup.scrollWidth) / 2;
            popup.style.left = `${left}px`;
        }
    }
}