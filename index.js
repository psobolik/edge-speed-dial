document.addEventListener('DOMContentLoaded', () => {
    showBookmarks();
    setupAddButton();
    setupPopups();
    setupSearchButton();
    setupChromeListeners();

    function setupChromeListeners() {
        chrome.bookmarks.onRemoved.addListener(() => {
            showBookmarks();
        });
        chrome.bookmarks.onChanged.addListener(() => {
            showBookmarks();
        });
        chrome.bookmarks.onCreated.addListener(() => {
            showBookmarks();
        });
    }

    function setupSearchButton() {
        document.getElementById('search-button')
            .addEventListener('click', _event => {
                doSearch();
            });
        document.getElementById('search-input')
            .addEventListener('keypress', _event => {
                if (_event.key === 'Enter') doSearch();
            });
        function doSearch() {
            const text = document.getElementById('search-input').value;
            if (text)
                chrome.search.query({'text': text}, () => {});
        }
    }

    function setupAddButton() {
        document.getElementById('add-button')
            .addEventListener('click', _event => {
                showAddPopup();
            });
    }

    function setupPopups() {
        setupAddPopup();
        setupDeletePopup();
        setupErrorPopup();

        function setupAddPopup() {
            const popup = document.getElementById('add-popup');
            const okButton = popup.querySelector('.ok-button');
            okButton.addEventListener('click', saveBookmark);
            popup.addEventListener('keypress', _event => {
                if (_event.key === 'Enter') saveBookmark({target: okButton});
            })

            popup.querySelector('.cancel-button')
                .addEventListener('click', hideAddPopup);

            function saveBookmark(_event) {
                const popup = document.getElementById('add-popup');
                const id = popup.querySelector('.ok-button').dataset.id;
                const url = popup.querySelector('#add-url-input').value;
                const title = popup.querySelector('#add-name-input').value;
                if (id) {
                    updateBookmark(id, title, url);
                } else {
                    createBookmark(title, url);
                }

                function createBookmark(title, url) {
                    SpeedDial.saveBookmark(title, url)
                        .then(hideAddPopup)
                        .catch(reason => {
                            showErrorPopup(`${reason} (createBookmark)`)
                        });
                }

                function updateBookmark(id, title, url) {
                    SpeedDial.updateBookmark(id, title, url)
                        .then(hideAddPopup)
                        .catch(reason => {
                            showErrorPopup(`${reason} (updateBookmark)`);
                        });
                }
            }
        }

        function setupDeletePopup() {
            const popup = document.getElementById('delete-popup');
            popup.querySelector('.ok-button').addEventListener('click', removeBookmark);
            popup.querySelector('.cancel-button')
                .addEventListener('click', hideDeletePopup);

            function removeBookmark(_event) {
                SpeedDial.deleteBookmark(_event.target.dataset.id)
                    .then(hideDeletePopup)
                    .catch(reason => {
                        showErrorPopup(`${reason} (removeBookmark)`);
                    });
            }
        }

        function setupErrorPopup() {
            document.getElementById('error-popup')
                .querySelector('.ok-button')
                .addEventListener('click', _event => {
                    hideErrorPopup();
                });
        }
    }

    function showBookmarks() {
        document.getElementById('links').innerHTML = '';
        SpeedDial.getSpeedDialFolders()
            .then(folders => {
                for (let i = 0, l = folders.length; i < l; ++i) {
                    const folder = folders[i];
                    chrome.bookmarks.getSubTree(folder.id)
                        .then(subNodes => {
                            for (let i = 0, l = subNodes.length; i < l; ++i) {
                                displayBookmarks(subNodes[i].children);
                            }
                        })
                        .catch(reason => {
                            showErrorPopup(`${reason} (showBookmarks)`);
                        })
                }
            })
            .catch(reason => {
                showErrorPopup(`${reason} (showBookmarks)`);
            });

        function displayBookmarks(bookmarks) {
            if (bookmarks) {
                const linksPanel = document.getElementById('links');

                for (let i = 0, l = bookmarks.length; i < l; ++i) {
                    linksPanel.append(makeLinkCard(bookmarks[i]));
                }

                const cards = document.querySelectorAll('div.card');
                for (let i = 0, l = cards.length; i < l; ++i) {
                    cards[i].addEventListener('click', _event => {
                        document.location = _event.target.href ?? _event.target.querySelector('a').href;
                    });
                }
            }

            function makeLinkCard(bookmark) {
                const linkCard = document.createElement('div');
                linkCard.addEventListener('mouseenter', _event => {
                    _event.target.querySelector('.menu-panel').style.visibility = 'visible';
                })
                linkCard.addEventListener('mouseleave', _event => {
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
                        button.type = 'button';
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
    const popup = document.getElementById('add-popup');
    popup.querySelector('.ok-button').dataset.id = bookmark ? bookmark.id : '';
    popup.querySelector('#add-url-input').value  = bookmark ? bookmark.url : '';
    popup.querySelector('#add-name-input').value = bookmark ? bookmark.title : '';
    const nameInput = popup.querySelector('#add-prompt');
    nameInput.innerText = bookmark ? 'Edit Speed Dial bookmark' : 'Add bookmark to Speed Dial';
    showPopup('add-popup');
    nameInput.focus();
}

function hideAddPopup() {
    hidePopup('add-popup');
}

function showDeletePopup(id) {
    const okButton = document.getElementById('delete-popup')
        .querySelector('.ok-button');
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
    const panel = document.getElementById(id);
    panel.style.display = 'block';
}

function hidePopup(id) {
    document.getElementById(id).style.display = 'none';
}
