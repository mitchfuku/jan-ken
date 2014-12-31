require('newrelic');

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
  joinRoom: 'join_room',
  updateRoomList: 'update_room_list'
};

var clients = {};
var rooms = {};

io.on('connection', function(socket){
  socket.nickname = sillyname();
  if (!socket.room) {
    var defaultRoom = 'lobby';
    joinRoom(defaultRoom);
  }

  clients[socket.id] = socket;

  io.to(socket.id).emit(
    JankenEvents.message, 
    "Hello! Your user name is " + socket.nickname + "."
  );

  // Move send
  socket.on(JankenEvents.moveSend, function(move){
    rooms[socket.room].moves.push({
      id: socket.id,
      move: move,
    });

    io.to(socket.room).emit(
      JankenEvents.utilityMessage, 
      socket.nickname + " has played a move"
    );
    var movesReadOnly = rooms[socket.room].moves;
    if (movesReadOnly.length === 2) {
      var p1 = movesReadOnly[0];
      var p2 = movesReadOnly[1];
      var m1, m2;

      var whoWins = isMoveAWinner(p1.move, p2.move);
      if (whoWins === 0) {
        io.to(socket.room).emit(
          JankenEvents.roundComplete, 
          generateWinnerMessage(p1, p2)
        );
      } else if (whoWins === 1) {
        io.to(socket.room).emit(
          JankenEvents.roundComplete, 
          generateWinnerMessage(p2, p1)
        );
      } else {
        io.to(socket.room).emit(
          JankenEvents.roundComplete, 
          [
            "It's a tie!",
            clients[p1.id].nickname + " and " + clients[p2.id].nickname +
              " played " + p1.move
          ]
        );
      }

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
    roomName = "" + roomName;
    socket.join(roomName);
    socket.room = roomName;
    io.to(roomName).emit(
      JankenEvents.utilityMessage, 
      socket.nickname + " has just joined " + roomName
    );

    if (!rooms[roomName]) {
      rooms[roomName] = {
        moves: [],
        name: roomName
      };
    }
    
    var numClientsInRoom = 
      Object.keys(io.nsps['/'].adapter.rooms[roomName]).length;

    if (numClientsInRoom === 1) {
      io.to(roomName).emit(
        JankenEvents.utilityMessage, 
        "There is " + numClientsInRoom + " player in " + roomName
      );
    } else {
      io.to(roomName).emit(
        JankenEvents.utilityMessage, 
        "There are " + numClientsInRoom + " players in " + roomName
      );
    }

    socket.emit(
      JankenEvents.updateRoomList,
      rooms
    );
  }

  function generateWinnerMessage(p1, p2) {
    var winnerNick = clients[p1.id].nickname;
    return [
      winnerNick + " wins!",
      (
        winnerNick + " played " + p1.move + " and " +
        clients[p2.id].nickname + " played " + p2.move
      )
    ];
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
