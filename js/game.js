let rosters = [];

socket.on('add-user', (username) => {
    // (v.usernames).push(username);
    v.pushUser(username);
    if(v.username != "") {
        socket.emit('usernames', outputUsernames(v.usernames))    
    }
});

socket.on('usernames', (usrsFromServer) => {
    if (usrsFromServer.length > v.usernames.length) {
        v.usernames = [...usrsFromServer]
        myIndex = v.usernames.length-1
        v.usernames[myIndex] = 8;
    }
});

socket.on('user-disconnected', ()=> {
    socket.emit('roll-call', v.usernames);
    rosters = [];
});
socket.on('roll-call', attendance => {
    rosters.push(attendance);
    checkRoster();
});
function checkRoster() {
    if ((rosters.length) == (v.usernames.length-2)) {
        let tmpUsrs = [...v.usernames];
        tmpUsrs.splice(tmpUsrs.indexOf(8),1);
        rosters.forEach((roster)=>{
            roster.splice(roster.indexOf(v.username),1);
            let sender = tmpUsrs.filter(x => roster.indexOf(x) === -1)[0];
            tmpUsrs.splice(tmpUsrs.indexOf(sender),1);
        });
        returnRay = [...v.usernames]
        returnRay.splice(returnRay.indexOf(tmpUsrs[0]),1);
        v.usernames = [...returnRay];
    }
}
function outputUsernames(usrs){
    toReturn = [...usrs];
    toReturn[myIndex] = v.username;
    return toReturn;
}

socket.on('start-game', () => {
    for (r = 0; r < v.gameOptions['rounds'].length; r++) {
        const poseLength = v.gameOptions['rounds'][r];
        const usernamesTemp = {...v.usernames};
        for (u = 0; u < Object.keys(v.usernames).length; u++) {
            if (v.usernames[u] == 8) {
                // set pose
                thisPosing(poseLength);
            }
            else{
                // match pose
            }
        }
    }
    // end game
});

function thisPosing(poseLength) {
    mediaRecorder.start();
    recordingPose = true;
    setTimeout(function() { 
        stopRecording();
    },(poseLength*1000));
    
};

function stopRecording(){
    recordingPose = false;
    mediaRecorder.stop();
    drawCanvas.style.display = "none";
    videoStore.style.display = "block";
// some kind of info screen
        videoStore.play();
}

videoStore.onended = function() {
    videoStore.style.display = "none";
    drawCanvas.style.display = "block";
};
