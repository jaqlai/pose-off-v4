var socket = io();
let live=false;
let myIndex;

var colors = [{r: 0, g: 255, b: 0, a: 100}, {r: 255, g: 0, b: 0, a: 100}, {r: 0, g: 0, b: 255, a: 100}];
const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

// element selectors
const sourceVideo = document.querySelector('#webcamVideo');
const videoStore = document.querySelector("#videoStore");

const drawCanvas = document.querySelector('#drawCanvas');
const offscreenCanvas = document.querySelector('#offscreenCanvas');
const miniCanvas = document.querySelector('#miniCanvas')
const streamCanvas = document.querySelector('#streamCanvas');
const gridCanvas = document.querySelector('#gridCanvas');
const streamImg = document.getElementById("streamImg");


// canvas setup
const drawCtx = drawCanvas.getContext('2d');
const streamCtx = streamCanvas.getContext('2d');
const offCtx = offscreenCanvas.getContext('2d');
const miniCtx = miniCanvas.getContext('2d');
const gridCtx = gridCanvas.getContext('2d');



// Model control buttons
// const fastButton = document.querySelector('button#highSpeed');
// const normalButton = document.querySelector('button#normalSpeed');
// const slowerButton = document.querySelector('button#lowerSpeed');
// const slowButton = document.querySelector('button#lowSpeed');


// Get video camera
function handleSuccess(stream) {
    const video = document.querySelector('video');
    console.log(`Using video device: ${stream.getVideoTracks()[0].label}`);
    video.srcObject = stream;
}

function handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
        console.error(`The resolution requested is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
        console.error("User denied access to media devices");
    }
    console.error(`getUserMedia error: ${error.name}`, error);
}
    navigator.mediaDevices.getUserMedia({video: {width: 640, height: 480}})
        .then(handleSuccess)
        .catch(handleError)

// Initialize the dashboard
function enableDashboard(initial=false) {

    drawCanvas.style.display = "block";
    streamCanvas.style.display = "block";
    gridCanvas.style.display = "block";


    userMessage.innerText = "Monitor running";
    // showStats.hidden = false;

    // startTime = new Date().getTime();

    // if(initial){
    //     fastButton.disabled = false;
    //     normalButton.disabled = false;
    //     slowerButton.disabled = false;
    //     slowButton.disabled = false;
    // }

    firstRun = false;
}
let colorScheme;
var v = new Vue({
    el: '#overlay',
    data:{
        shows:{
            welcome:false,
            menu:false,
            lobby:false,
            roomInput:false,
            usernameInput:false,
        },
        opacities:{
            drawCanvas:0.8
        },
        roomName:"",
        isHost:false,
        username:"",
        usernames:[],
        overlayOpacity:1.0,
        gameOptions: {
            rounds:[3,2,1]
        }
    },
    methods: {
      changeColor: () => {
          console.log(colorSchemes)
        colorSchemes.push(colorSchemes.shift());
        colorScheme = colorSchemes[0];
      },

      openMenu: (mode) => {
        v.shows['welcome'] = false;
        v.shows['roomInput']=true;
        v.shows['menu'] = true;
        v.mode = mode;
      },
      addMe: () => {
        v.shows['usernameInput']=false;
        socket.emit('add-user',v.username);
        v.overlayOpacity=0.15;
        myIndex = Object.keys(v.usernames).length
        if (myIndex == 0) {
            v.usernames[myIndex] = 8;
        }
      },
      pushUser: (user) => {
          v.usernames.push(user);
      },
      joinRoom: () => {
        location.hash = v.roomName;
        socket.emit('room-hash', location.hash);
        v.shows['menu']=false;
      },
      startGame: () => {
        //   need to change later, for now it bypasses stuff
        thisPosing(v.gameOptions['rounds'][0]);
        v.shows['lobby'] = false;
      }
    }
});

socket.on('joined-room', () => {
    v.roomName = location.hash;
    v.overlayOpacity=0.15;
    v.shows['usernameInput'] = true;
    v.shows['lobby']=true;
    // live = true;
});

const colorSchemes = [

    [
        [110, 64, 170], [143, 61, 178], [178, 60, 178], [210, 62, 167],
        [238, 67, 149], [255, 78, 125], [255, 94, 99],  [255, 115, 75],
        [255, 140, 56], [239, 167, 47], [217, 194, 49], [194, 219, 64],
        [175, 240, 91], [135, 245, 87], [96, 247, 96],  [64, 243, 115],
        [40, 234, 141], [28, 219, 169], [26, 199, 194], [33, 176, 213],
        [47, 150, 224], [65, 125, 224], [84, 101, 214], [99, 81, 195]
      ],
      
      [
        [110, 64, 170], [106, 72, 183], [100, 81, 196], [92, 91, 206],
        [84, 101, 214], [75, 113, 221], [66, 125, 224], [56, 138, 226],
        [48, 150, 224], [40, 163, 220], [33, 176, 214], [29, 188, 205],
        [26, 199, 194], [26, 210, 182], [28, 219, 169], [33, 227, 155],
        [41, 234, 141], [51, 240, 128], [64, 243, 116], [79, 246, 105],
        [96, 247, 97],  [115, 246, 91], [134, 245, 88], [155, 243, 88]
      ],
      
      [
        [158, 1, 66],    [181, 26, 71],   [202, 50, 74],   [219, 73, 74],
        [232, 94, 73],   [242, 117, 75],  [248, 142, 83],  [251, 167, 96],
        [253, 190, 112], [254, 210, 129], [254, 227, 149], [254, 240, 166],
        [251, 248, 176], [243, 249, 172], [231, 245, 163], [213, 238, 159],
        [190, 229, 160], [164, 218, 163], [137, 207, 165], [110, 192, 168],
        [86, 173, 174],  [70, 150, 179],  [67, 127, 180],  [77, 103, 173]
      ]
    
]

const myScheme = {
    left_face:[143, 61, 178],
    right_face:[143, 61, 178],	
    left_upper_arm_front:[175, 240, 91],
    left_upper_arm_back	:[175, 240, 91],
    
	right_upper_arm_front:[175, 240, 91],	
	right_upper_arm_back:[175, 240, 91],
	left_lower_arm_front:[255, 94, 99],
    left_lower_arm_back	:[255, 94, 99],
    
    right_lower_arm_front:[255, 140, 56],	
	right_lower_arm_back:[255, 140, 56],	
	left_hand:[255, 140, 56],
    right_hand:[255, 94, 99],	
    
    torso_front:[175, 240, 91],
    torso_back:[175, 240, 91],
    left_upper_leg_front:[96, 247, 96],
    left_upper_leg_back:[96, 247, 96],

    right_upper_leg_front:[96, 247, 96],
    right_upper_leg_back:[96, 247, 96],
    left_lower_leg_front:[96, 247, 96],
    left_lower_leg_back:[96, 247, 96],

    right_lower_leg_front:[96, 247, 96],
    right_lower_leg_back:[96, 247, 96],
    left_feet:[178, 60, 178],
    right_feet:[178, 60, 178],
}

function dictToArray(dict) {
    var colorArray = Object.keys(dict).map(function(key) {
        return myScheme[key]
    });
    return colorArray
}



colorScheme = colorSchemes['rainbow'];

colorSchemes.push(dictToArray(myScheme));