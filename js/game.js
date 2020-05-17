let rosters = [];
poseRecieved = false;

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
    if ((rosters.length) === (v.usernames.length-2)) {
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
    game();
});

// async function game() {
//     for (r = 0; r < v.gameOptions['rounds'].length; r++) {
//         const poseLength = v.gameOptions['rounds'][r];
//         const usernamesTemp = {...v.usernames};
//         for (u = 0; u < Object.keys(v.usernames).length; u++) {
//             if (v.usernames[u] === 8) {
//                 // set pose
//                 thisPosing(poseLength);
//                 socket.emit('pose-captured', videoURL);
//             }
//             else{
//                 await (poseRecieved === true);
//                 // match pose
//             }
//         }
//     }
//     // end game
// }
socket.on('pose-captured', (poseUrl) => {
    console.log("GOTIT")
    console.log(poseUrl)
    poseRecieved = true;
    // do a whole thing
    videoStore.src = poseUrl;
    poseRecieved = false;
});

function thisPosing(poseLength) {
    console.log("STARTING! time:"+poseLength)
    mediaRecorder.start();
    recordingPose = true;
    setTimeout(function() { 
        stopRecording();
    },(poseLength*1000));
    socket.emit('pose-captured', videoURL);    
};

mediaRecorder.onstop = function(e) {
    var blob = new Blob(chunks, { 'type' : 'video/webm' });
    chunks = [];
    videoStore.src = URL.createObjectURL(blob);
    drawCanvas.style.display = "none";
    videoStore.style.display = "block";
// some kind of info screen
    videoStore.play();
 };

 function stopRecording(){
    recordingPose = false;
    mediaRecorder.stop();
    console.log("stopped")
}


videoStore.onended = function() {
    videoStore.style.display = "none";
    drawCanvas.style.display = "block";
};
