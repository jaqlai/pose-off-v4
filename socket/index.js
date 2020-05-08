const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var room1;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    //io.emit('chat message', "joined room: "+room);
    //console.log('connected');

    // if there's a room hash in the url, it joins that room
    socket.on('room hash', (hash) => {
        //ALERT: might need to add a thing to leave  every other room
        socket.join(hash);
        room1 = hash;
    });

    socket.on('chat message', (msg) => {   
        //change to io.emit to send  to  all, not broadcast from the "sending" socket
        if (room1){
            socket.to(room1).emit('chat message', msg);
        }
        else {
            io.emit('chat message', msg);
        }
    });

    socket.on('disconnect', () => {
        //console.log('disconnected');
      });

  });



http.listen(3000, () => {
  console.log('listening on *:3000');
});