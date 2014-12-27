var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var sillyname = require('sillyname');

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use('/static/css', express.static(__dirname + '/public'));
app.use('/static/js', express.static(__dirname + '/public'));
app.use('/static/images', express.static(__dirname + '/public'));

var JankenEvents = {
  moveSend: 'move_send',
  roundComplete: 'round_complete',
  utilityMessage: 'utility_message',
  message: 'message',
  joinRoom: 'join_room'
};

var winMsg = "You win!";
var tieMsg = "It's a tie";
var loseMsg = "You lose  :(";

var clients = {};

var rooms = {};
var room = 'default';
io.on('connection', function(socket){
  socket.nickname = sillyname();
  if (!socket.room) {
    joinRoom(room);
  }

  clients[socket.id] = socket;

  io.to(socket.id).emit(
    JankenEvents.message, 
    "Hello " + socket.nickname + "!"
  );

  // Move send
  socket.on(JankenEvents.moveSend, function(move){
    rooms[socket.room].moves.push({
      id: socket.id,
      move: move,
    });

    if (rooms[socket.room].moves.length === 2) {
      var p1 = rooms[socket.room].moves[0];
      var p2 = rooms[socket.room].moves[1];
      var m1, m2;

      var whoWins = isMoveAWinner(p1.move, p2.move);
      if (whoWins === 0) {
        m1 = loseMsg;
        m2 = winMsg;
      } else if (whoWins === 1) {
        m1 = winMsg;
        m2 = loseMsg;
      } else {
        m1 = tieMsg;
        m2 = tieMsg;
      }

      io.to(p1.id).emit(JankenEvents.roundComplete, m1 
                        + " you played " + p1.move + " and your opponent played " + p2.move);
      io.to(p2.id).emit(JankenEvents.roundComplete, m2
                        + " you played " + p2.move + " and your opponent played " + p1.move);
      rooms[socket.room].moves = []
    } else {
    }
  });

  // client join room
  socket.on(JankenEvents.joinRoom, function(roomName) {
    joinRoom(roomName);
  });

  // client disconnect
  socket.on('disconnect', function() {
    if (clients[socket.id]) {
      delete clients[socket.id];
    }

    io.to(socket.room).emit(
      JankenEvents.utilityMessage, 
      socket.nickname + " has left"
    );
  });

  function joinRoom(roomName) {
    socket.join(roomName);
    socket.room = roomName;
    io.to(roomName).emit(
      JankenEvents.utilityMessage, 
      socket.nickname + " has just joined " + roomName
    );

    if (!rooms[roomName]) {
      rooms[roomName] = {
        moves: []
      };
    }
  }
});

app.get('/', function(request, response) {
  response.sendFile(__dirname + '/index.html');
});

http.listen(app.get('port'));

/**
 * returns 1 for winner, 2 for tie, 0 for loser
 * move1 is the proposed winner
 */
function isMoveAWinner(move1, move2) {
  if (move1.localeCompare(move2) === 0) {
    return 2;
  }
  if (
    move1 === 'rock' && move2 === 'paper' ||
    move1 === 'paper' && move2 === 'scissors' ||
    move1 === 'scissors' && move2 === 'rock'
  ) {
    return 0;
  }
  return 1;
}
