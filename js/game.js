let rosters = [];
let sendPose = false;
// let duration = v.gameOptions['rounds'][0];

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

// function thisPosing(poseLength) {
//     poseMs = (poseLength*1000);
//     t0 = performance.now();
//     sendPose = true;
//     userMessage("start posing!", 1000);
//     setTimeout(()=> { 
//         t1 = performance.now();
//         console.log("elapsed "+(t1-t0));
//         mediaRecorder.start();
//         setTimeout(()=> { 
//             userMessage("sending your pose...", poseMs);
//             mediaRecorder.stop();
//             drawDiv.style.opacity = 0;
//             playVid(drawVideo)
//             // setTimeout(()=> {playVid(drawVideo)}, 800);
//         },poseMs);
//     },1000);
    
// };

async function thisPosing(round) {
    poseMs = (round['time']*1000);
    console.log("poseMs: "+poseMs)
    t0 = performance.now();
    sendPose = true;
    userMessage("start posing!", 1000);
    await sleep(1000);

    
    mediaRecorder.start();
    let poses = round['poses'];
    for (p=1;p<poses+1;p++) {
        console.log("SET"+(p*(poseMs/p)-900))
        setTimeout(()=>{timerbar(0.9)},(p*poseMs/poses)-900)
    }

    await sleep(poseMs+200);
    t1 = performance.now();
    console.log("elapsed "+(t1-t0));
    userMessage("sending your pose...", poseMs);
    mediaRecorder.stop();
    drawDiv.style.opacity = 0;
    playVid(drawVideo)
    // setTimeout(()=> {playVid(drawVideo)}, 800);
    
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
    streamVideo.style.opacity = 0.2;
    var blob = new Blob(chunks, { 'type' : 'video/webm' });
    streamVideo.src = URL.createObjectURL(blob);
// TEMPORARY
    thisMatching(v.gameOptions['rounds'][2]);
// TEMPORARY

});

async function thisMatching(round) {
 
    let poses = round['poses'];
    let stops = [];
    let pauseFor = 500;
    for (p=1;p<poses+1;p++) {
        stops.push(p * (round['time']/poses))
    }

    let duration = 1000*round['time']+stops.length*pauseFor;
    drawDiv.style.opacity = 0;

    userMessage("Recieved a pose!", 1000);
    await sleep(1000);
    userMessage("Video will play once,", 1000);
    await sleep(1000);
    userMessage("and then you'll match the poses!", 1000);
    await sleep(1000);
    
    setPauses(streamVideo, stops, pauseFor);
    playVid(streamVideo);
    console.log("DURATION:"+duration)
    await sleep(duration);

    userMessage("ready?", 1000);
    await sleep(1000);
    userMessage("set...", 1000);
    await sleep(1000);

    userMessage("Start copying!", 1000);
    await sleep(1000);

    drawDiv.style.opacity = 0.5;
    // sleep(800);

    mediaRecorder.start();
    playFrames(streamVideo, stops);

    setTimeout(function() { 
        mediaRecorder.stop();
        drawVideo.style.display = "none";
        userMessage("Awesome job!", 500);
        drawDiv.style.opacity = 1;
    },duration);

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

// function setEnd(video, func) {
//     video.onended = () => {
//         streamVideo.style.display = "none";
//         drawDiv.style.opacity = 1;
//         func();
//         video.onended = () => {
//             streamVideo.style.display = "none";
//             drawDiv.style.opacity = 1;
//         }
//     };
// }

// // more versatile-- uses array format for stops that includes length of stop.
// function setPause(video, stops) {
//     stop = stops[0];
//     let pauseAt = stop[0];
//     let pauseFor = stop[1];
//     video.ontimeupdate = () => {
//         if(!video.paused && (video.currentTime >= pauseAt)){
//             video.pause();
//             console.log("paused at time "+pauseAt)
//             setTimeout(()=>{
//                 playVid(video);
//                 if(stops.length > 1) {
//                     stops.shift();
//                     setPause(video, stops);
//                 }
//                 else{
//                     video.ontimeupdate = {};
//                 }
//             }, pauseFor);
//         }
//     }
// }

function setPauses(video, argStops, pauseFor=500) {
    let stops = [...argStops]
    console.log("setting pauses at:  "+stops)
    let pauseAt = stops[0];
    video.ontimeupdate = () => {
        if(!video.paused && (video.currentTime >= pauseAt)){
            streamVideo.style.opacity = 1;
            
            video.pause();
            console.log("paused at time "+pauseAt)
            setTimeout(()=>{
                streamVideo.style.opacity = 0.2;
                playVid(video);
                if(stops.length > 1) {
                    stops.shift();
                    setPauses(video, stops);
                }
                else{
                    video.ontimeupdate = {};
                }
            }, pauseFor);
        }
    }
}

function playVid(video) {
    setTimeout(()=>{
        if (video.readyState >=3 ) {
            video.play();
        }
        else{
            playVid(video);
        }
    },10)
};

function playFrames(video, frameArray) {
    streamVideo.style.display = "block";
    let frames = [...frameArray]
    let pauseFor = 600;
    video.currentTime = frames[0];
    video.style.opacity = 0.2;
    setTimeout(()=>{
        video.style.opacity = 1;
        setTimeout(()=>{
            if(frames.length > 1) {
                frames.shift();
                playFrames(video, frames);
            }
            else{
                streamVideo.style.display = "none";
            }
        },pauseFor);
    },video.currentTime*1000)
}

// function pauseVid(video) {
//     setTimeout(()=>{
//         if (video.readyState >=3 ) {
//             video.pause();
//         }
//         else{
//             pauseVid(video);
//         }
//     },10)
// };

mediaRecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    maskBack = 0;
};

mediaRecorder.onstart = () => {
    maskBack = 255;
};

