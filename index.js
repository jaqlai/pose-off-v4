const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 5000;

var room1;

app.get('/js/scan.js', function(req, res){
  res.sendFile(__dirname + '/js/scan.js');
});

app.get('/js/ui-helper.js', function(req, res){
  res.sendFile(__dirname + '/js/ui-helper.js');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/css/style.css', (req, res) => {
  res.sendFile(__dirname + '/css/style.css');
});

io.on('connection', (socket) => {
    //io.emit('chat message', "joined room: "+room);
    //console.log('connected');

    // if there's a room hash in the url, it joins that room
    socket.on('room-hash', (hash) => {
        //ALERT: might need to add a thing to leave  every other room
        socket.join(hash);
        room1 = hash;
    });

    socket.on('seg-stream', (data) => {
        socket.broadcast.emit('seg-stream',data);
    });

    socket.on('chat message', (msg) => {   
        //change to io.emit to send  to  all, not broadcast from the "sending" socket
        if (room1){
            socket.to(room1).emit('chat message', msg);
        }
        else {
            io.emit('chat message', msg);
        }
        console.log(msg);
    });

    socket.on('server-msg', (msg) => {   
      console.log(msg);
  });

    socket.on('disconnect', () => {
        //console.log('disconnected');
      });
    

    socket.on('run-match', () => {
      const room = Object.keys(io.sockets.adapter.sids[socket.id])[1];
      io.in(room).emit('match');
      // socket.to(room).emit('match', img);
      // console.log(room);
    });

  });

// function compare(img1, img2) {
//   // const img1 = PNG.sync.read(fs.readFileSync('img1.png'));
//   // const img2 = PNG.sync.read(fs.readFileSync('img2.png'));
//   const {width, height} = img1;
//   const diff = new PNG({width, height});
//   const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.1})
//   console.log(diffPixels);
//   return(diffPixels)

// fs.writeFileSync('diff.png', PNG.sync.write(diff));
// }

http.listen(PORT, () => {
  console.log('listening on *'+PORT);
});