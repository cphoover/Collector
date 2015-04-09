var stream = require('stream'),
	dgram  = require('dgram' ),
	_      = require('lodash'),
	util   = require('util'  );


function UdpStream(opts){
	var settings = _.defaults({
		type: 'udp6',
		host: 'localhost',
		port: 8888
	}, opts);
	this.socket = dgram.createSocket(settings.type);
	stream.Writable.call(this);
}

util.inherits(UdpStream, stream.Writable);

UdpStream.prototype._write = function(chunk, encoding, done){
  client.send(chunk, 0, chunk.length, this.port, this.host, done);
}

module.exports = UdpStream;
