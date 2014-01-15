var _ = require('underscore'),
	Gpio = require('onoff').Gpio,
	pilight = require('../../node-pilight/pilight');


var vkGpios = [],
		thisSocketAudience;

var pilightSettings = {
	'gpio-sender' : pilight.getSender()
};

pilight.serviceStart();

console.log('Current pin for "gpio-sender" is: ' + pilightSettings['gpio-sender']);

exports.socketEvents = function(socket, socketAudience){
	thisSocketAudience = socketAudience;
	socket.on('connect', onConnect);
	socket.on('disconnect', onDisconnect);
	socket.on('gpioOutput', gpioOutput);
	socket.on('initGpioInput', initGpioInput);
	socket.on('rfcdOutput', rfcdOutput);
}
exports.onExit = function() {
	unexportAll();
}

/*
	Exports and assigns value to GPIO pin
*/
function gpioOutput(data){
	console.log(data);
	if (vkGpios[data.pin]) {
		if (vkGpios[data.pin].listeners.length != 0) {
			vkGpios[data.pin].unexport();
		}
	}
	else {
    vkGpios[data.pin] = new Gpio(parseInt(data.pin), 'out');
	}
  vkGpios[data.pin].writeSync(parseInt(data.value));
}

/*
	Exports and listens to GPIO pin value
*/
function initGpioInput(data){
	if (vkGpios[data.pin]) {
		if (vkGpios[data.pin].listeners.length == 0) {
			vkGpios[data.pin].unexport();
		}
	}
	else {
	  vkGpios[data.pin] = new Gpio(data.pin, 'in', 'both', {persistentWatch: true});
	}
	vkGpios[data.pin].watch(function(err, value) {
		var inputData = {
			pin:data.pin,
			value:value
		};
		thisSocketAudience.emit('gpioInput', inputData);
	});
}

/*
	Turns on or off power switch with pilight
*/
function rfcdOutput(data){

	var raw = data.status == 'on' ? data.rfcd.oncode : data.rfcd.offcode;

	if (pilightSettings['gpio-sender'] !== data.rfcd.gpio.pin.toString()) {
		console.log('Changing pin for "gpio-sender" from: ' + pilightSettings['gpio-sender']
			+ ' to: ' + data.rfcd.gpio.pin.toString());
		pilight.setSender(data.rfcd.gpio.pin).then(function(){			
			pilightSettings['gpio-sender'] = data.rfcd.gpio.pin.toString();
			console.log('Current pin for "gpio-sender" is: ' + pilightSettings['gpio-sender']);
			console.log('Restarting pilight service');
			pilight.serviceRestart().then(function(){
				console.log('Pilight service restarted');
				console.log('Sending raw output: ' + raw);
				pilight.sendRaw(raw);
			})
		})
	}
	else {
		console.log('Sending raw output: ' + raw);
		pilight.sendRaw(raw);
	}
}

/*
	Free resources on disconnect and exit
*/
function onConnect() {
	console.log('Connected via websocket');
}
function onDisconnect() {
	if (thisSocketAudience.length == 0)  {
		unexportAll();
	}
}
function unexportAll() {
	_.each(vkGpios, function(vkGpio){
		if (vkGpio.gpio) {
			vkGpio.unexport();
		}
	})
}