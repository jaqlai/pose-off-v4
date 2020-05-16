let roster = [];
socket.on('add-user', (username) => {
    v.usernames.push(username);
    if(v.username != "") {
        socket.emit('usernames', outputUsernames(v.usernames))    
    }
});

socket.on('usernames', (usrsFromServer) => {
    if (usrsFromServer.length > v.usernames.length) {
        v.usernames = {...usrsFromServer}
        myIndex = v.usernames.length-1
        v.usernames[myIndex] = 8;
    }
});

socket.on('user-disconnected', ()=> {
    socket.emit('roll-call', v.usernames);
});
socket.on('roll-call', attendance => {
    roster.push(attendance);
    checkRoster();
});
function checkRoster() {
    if ((roster.length) == (v.usernames.length-2)) {
        tmpUsrs = [...v.usernames];
        tmpUsrs.splice(v.usernames.indexOf(v.username),1);
        for (const roster of rosters) {
            roster.splice(roster.indexOf(v.username),1);
            console.log(roster);
            // var difference = tmpUsrs.filter(x => second.indexOf(x) === -1);
        }
    }
}
// socket.on('start-game', () => {

//     for (r = 0; r < v.gameOptions['rounds'].length; r++) {
//         const poseLength = v.gameOptions['rounds'][r];
//         const usernamesTemp = {...v.usernames};
//         for (u = 0; u < Object.keys(v.usernames).length; u++) {
//             if (v.usernames[u] == 8) {

//             }
//         }
//     }
// });

function outputUsernames(usrs){
    toReturn = [...usrs];
    toReturn[myIndex] = v.username;
    return toReturn;
}