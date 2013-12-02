/*
	Dependencies
*/
var _ = require('underscore'),
	Gpio = require('onoff').Gpio;


var vkGpios = [],
		thisSocketAudience;

exports.socketEvents = function(socket, socketAudience){
	thisSocketAudience = socketAudience;
	socket.on('disconnect', onDisconnect);
	socket.on('gpioOutput', gpioOutput);
	socket.on('initGpioInput', initGpioInput);
}
exports.onExit = function() {
	unexportAll();
}

/*
	Exports and assigns value to GPIO pin
*/
function gpioOutput(data){
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
	Free resources on disconnect and exit
*/
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