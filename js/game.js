let usernames;

socket.on('new-user', (username) => {
    username[Object.keys(usernames).length] = username;
});

socket.on('joined-room', () => {
    username[Object.keys(usernames).length] = 8;
});

socket.on('start-game', () => {

    for (r = 0; r < v.gameOptions['rounds'].length; r++) {
        const poseLength = v.gameOptions['rounds'][r];
        const usernamesTemp = {...usernames};
        for (u = 0; u < Object.keys(usernames).length; u++) {
            if (usernames[u] == 8) {

            }
        }
    }
    

});