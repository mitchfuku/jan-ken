var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use('/static/css', express.static(__dirname + '/public'));
app.use('/static/js', express.static(__dirname + '/public'));
app.use('/static/images', express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('chat message', function(msg){
        io.emit('chat message', msg);
          });
});

http.listen(app.get('port'));
