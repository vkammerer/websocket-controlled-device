/*
	Dependencies
*/
var http = require('http'),
	config = require('./config');

/*
	Initiate websocket
*/
var deviceController = require('./devices/' + config.type);

if (config.client) {
	var io = require('socket.io/node_modules/socket.io-client');
	var url = config.client.host;
	if (config.client.port) {
		url += ':' + config.client.port;
	}
	var socket = io.connect(url, {
  	'resource' : 'usersocket',
		'query':'rpi=' + config.client.id
	});
	socket.on('connect', function (data){
		deviceController.socketEvents(socket, socket);
	})
}
else if (config.server) {
	var server = http.createServer(function (req, res) {
	  res.writeHead(200, { 'Content-Type': 'text/plain' });
	  res.write('Path: "' + req.url +'"\nHeaders: ' + JSON.stringify(req.headers, true, 2));
	  res.end();
	}).listen(config.server.port);

	var socketio = require('socket.io');
	var io = socketio.listen(server);

	io.configure(function (){
		io.set('resource', '/rpisocket');
	  io.set('authorization', function (handshakeData, callback) {
	  	if (handshakeData.query.pwd !== config.server.pwd) {
		    callback('Wrong password', false);
	  	}
	  	else callback(null, true);
	  });
	});
	io.sockets.on('connection', function (socket) {
		deviceController.socketEvents(socket, io.sockets);
	})
}
var exit = function() {
	deviceController.onExit();
	process.exit();
}

process.on('SIGINT', exit);
