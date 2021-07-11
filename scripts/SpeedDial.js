const SpeedDial = {
    _speedDialFolderName: 'Speed Dial',

    getSpeedDialFolders: async () => {
        return new Promise(function (resolve, reject) {
            _findSpeedDialFolders(SpeedDial._speedDialFolderName)
                .then((folders) => {
                    resolve(folders);
                })
                .catch(() => {
                    _createSpeedDialFolder(SpeedDial._speedDialFolderName)
                        .then((folder) => {
                            resolve([folder]);
                        })
                        .catch(() => {
                            reject("Can't find or create Speed Dial folder");
                        });
                })
        })

        async function _findSpeedDialFolders(speedDialFolderName) {
            return new Promise(function (resolve, reject) {
                let result = [];
                chrome.bookmarks.search({
                    title: speedDialFolderName
                })
                    .then((nodes) => {
                        for (let i = 0, l = nodes.length; i < l; ++i) {
                            const node = nodes[i];
                            if (!node.url) { // If the node is a folder, i.e. not a bookmark
                                result.push(node);
                            }
                        }
                        if (result.length > 0) resolve(result);
                        else reject("Can't create Speed Dial folder");
                    });
            })
        }

        async function _createSpeedDialFolder(speedDialFolderName) {
            return new Promise(function (resolve, reject) {
                chrome.bookmarks.create({
                    title: speedDialFolderName,
                    parentId: '1'
                })
                    .then((node) => {
                        resolve(node);
                    })
                    .catch((reason) => {
                        reject(reason);
                    });
            })
        }
    },

    saveBookmark: async (title, url) => {
        return new Promise(function (resolve, reject) {
            if (title === null || title.length === 0 || url === null || url.length === 0) reject(`Error: Both Name and URL are required.`);
            else {
                SpeedDial.getSpeedDialFolders()
                    .then((folders) => {
                        const bookmark = {
                            title: title,
                            url: url,
                            parentId: folders[0].id
                        };
                        // alert(`bookmark: { title: '${bookmark.title}', url: '${bookmark.url}', parentId: '${bookmark.parentId}' }`);
                        chrome.bookmarks.create(bookmark)
                            .then((result) => {
                                resolve(result);
                            })
                            .catch((reason) => {
                                reject(reason)
                            });
                    })
                    .catch((reason) => {
                        reject(reason);
                    });
            }
        })
    },

    updateBookmark: async (id, title, url) => {
        return new Promise((resolve, reject) => {
            if (!id) reject('Error: Missing bookmark ID');
            else if (title === null || title.length === 0 || url === null || url.length === 0) reject(`Error: Both Name and URL are required.`);
            else  {
                chrome.bookmarks.update(id, {title: title, url: url})
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((reason) => {
                        reject(reason);
                    });
            }
        });
    },

    deleteBookmark: async (id) => {
        return new Promise((resolve, reject) => {
            if (!id) reject('Error: Missing bookmark ID');
            chrome.bookmarks.remove(id)
                .then((result) => {
                    resolve(result);
                })
                .catch((reason) => {
                    reject(reason);
                });
        })
    }
}