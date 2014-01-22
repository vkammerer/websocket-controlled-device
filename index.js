/*
	Dependencies
*/
var	http = require('http'),
	fs = require('fs'),
	Q = require('q');

var configDefer =Q.defer();

fs.readFile('config.json', function (err, data) {
	if (err) throw err;
	configDefer.resolve(JSON.parse(data))
});

/*
	Initiate websocket
*/
configDefer.promise.then(function(config){
	var deviceController = require('./devices/' + config.type + '/index.js');

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
		deviceController.socketEvents(socket, socket);
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

})
