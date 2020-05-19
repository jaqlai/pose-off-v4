let rosters = [];
let sendPose = false;
let duration = v.gameOptions['rounds'][0];

// socket.on('add-user', (username) => {
//     // (v.usernames).push(username);
//     v.pushUser(username);
//     if(v.username != "") {
//         socket.emit('usernames', outputUsernames(v.usernames))    
//     }
// });

// socket.on('usernames', (usrsFromServer) => {
//     if (usrsFromServer.length > v.usernames.length) {
//         v.usernames = [...usrsFromServer]
//         myIndex = v.usernames.length-1
//         v.usernames[myIndex] = 8;
//     }
// });

// socket.on('user-disconnected', ()=> {
//     socket.emit('roll-call', v.usernames);
//     rosters = [];
// });
// socket.on('roll-call', attendance => {
//     rosters.push(attendance);
//     checkRoster();
// });
// function checkRoster() {
//     if ((rosters.length) === (v.usernames.length-2)) {
//         let tmpUsrs = [...v.usernames];
//         tmpUsrs.splice(tmpUsrs.indexOf(8),1);
//         rosters.forEach((roster)=>{
//             roster.splice(roster.indexOf(v.username),1);
//             let sender = tmpUsrs.filter(x => roster.indexOf(x) === -1)[0];
//             tmpUsrs.splice(tmpUsrs.indexOf(sender),1);
//         });
//         returnRay = [...v.usernames]
//         returnRay.splice(returnRay.indexOf(tmpUsrs[0]),1);
//         v.usernames = [...returnRay];
//     }
// }
// function outputUsernames(usrs){
//     toReturn = [...usrs];
//     toReturn[myIndex] = v.username;
//     return toReturn;
// }

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

function thisPosing(poseLength) {

    sendPose = true;
    userMessage("start posing!", 500);
    mediaRecorder.start();
    setTimeout(()=> { 
        userMessage("nice stuff!", 500);
        mediaRecorder.stop();
        drawDiv.style.opacity = 0;
        setTimeout(()=> {playVid(drawVideo)}, 800);
    },(poseLength*1000));
    
};


mediaRecorder.onstop = () => {
    var blob = new Blob(chunks, { 'type' : 'video/webm' });
    drawVideo.src = URL.createObjectURL(blob);

    if (sendPose) {
    socket.emit('pose-captured', chunks); 
    }

    sendPose = false;
    chunks = [];  
};

socket.on('pose-captured', (chunks) => {
    var blob = new Blob(chunks, { 'type' : 'video/webm' });
    streamVideo.src = URL.createObjectURL(blob);
    thisMatching();
});

function thisMatching() {

    userMessage("Recieved a pose! Video will play once, and then you'll match it!", 500);

    drawDiv.style.opacity = 0;
    sleep(800);

    v.showBorder();
    playVid(streamVideo);

    setTimeout( ()=> {
        v.hideBorder();
        userMessage("start copying!", 500);
        drawDiv.style.opacity = 0.5;
        sleep(800);

        mediaRecorder.start();
        playVid(streamVideo);

        setTimeout(function() { 
            mediaRecorder.stop();
            drawVideo.style.display = "none";
            userMessage("cool stuff!", 500);
        },duration*1000);

    }, duration*1000);
}

streamVideo.onplay = ()=> {
    streamVideo.style.display = "block";
}
drawVideo.onplay = ()=> {
    drawVideo.style.display = "block"; 
}

drawVideo.onended = () => {
    drawVideo.style.display = "none";
    drawDiv.style.opacity = 1;
};

streamVideo.onended = () => {
    streamVideo.style.display = "none";
    drawDiv.style.opacity = 1;
};

function playVid(video) {
    setTimeout(()=>{
        if (video.readyState >=3 ) {
            video.play();
        }
        else{
            playVid(video);
        }
    },0)
};

mediaRecorder.ondataavailable = function(e) {
    chunks.push(e.data);
};

