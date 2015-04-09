var _        = require('lodash'        )             ,
	hi       = require('highland'      )             ,
	UdpStream= require('./udp_stream'  )             ,
	hostname = require('os'            ) .hostname() ,
	exec     = require('child_process' ) .exec       ,
	CronJob  = require('cron'          ) .CronJob    ,
	format   = require('util'          ) .format     ;
/**
*
**/
function Collector(_config){

	_config = _config || {};

	this.options = _.defaults(_config.options, {
		/** @todo deprecate tail cmd and abstract tail... so it can use node library **/
		"noisy"    : true,
		"tailCmd" : "tail -F --lines=0 %s"//this stuff should be in an options part of the config
	});

	this.inputs = _config.inputs;

	// this should be a UdpPoolStream Object in future
	this.udpStream = new UdpStream(this.options.remote);
	this.tailStreams = [];
	this.execStreams = [];
	this.init();
}


/**
*
**/
Collector.prototype.init = function(){

    // setup all the tails
	this.tailStreams = _.map(this.inputs.files, function(val,key,map){
		var readStream = this.wrapStreamWithKeyAndHost(this.createTailStream(val, key), key);
//		readStream.pipe(this.udpStream);
		if(this.options.noisy) { readStream.pipe(process.stdout); }
		return readStream;
		//return this.wrapStreamWithKeyAndHost(this.createTailStream(val, key).pipe(this.udpStream));
	}.bind(this));
	// setup all the execs
	this.execStreams = _.map(this.inputs.exec, function(val, key, map){
		var readStream = this.wrapStreamWithKeyAndHost(this.createExecStream(val, key), key);
		if(this.options.noisy) { readStream.pipe(process.stdout); }
		return readStream;
	}.bind(this));

};

Collector.prototype.wrapStreamWithKeyAndHost = function(readStream, key) {

	var newStream = hi(readStream).split().map(function(dat){
		return format("[%s] [%s] - %s", hostname, key, dat) + "\n";
	});

	return newStream;
};

Collector.prototype.createExecStream = function(val, key){
	if(!_.isString(val.cmd)) {
		throw new TypeError("exec must be provided with string cmd value!");
	}

	var mainStream = hi(function(push, next){

		if(_.isNumber(val.schedule)){
			setInterval(function(){
				push(null, hi(exec(val.cmd).stdout));
			}, val.schedule * 1000);
		}

		if(_.isString(val.schedule)){
			this.job = new CronJob(val.schedule, function(){
				push(null, hi(exec(val.cmd)));
			});
		}
	}).merge();

	/** set interval **/

	
	return mainStream;
};

/**
*
**/
Collector.prototype.createTailStream = function(val, key){

	var filename;
	if(_.isString(val)){
		filename = val;
	} else if (_.isString(val.src)){
		filename = val.src;
	} else {
		throw new TypeError("tail must be provided with a string src value!");
	}

   
	/**
	* Add RegExp filters on stream
	* @todo ADD key and hostname
	*/
	var stream =  _.reduce(val.filters, function(mem,cur,col){
		if(_.isRegExp(cur)){
			return hi(mem).filter(function(dat){
				return cur.test(dat); // only passthrough lines that pass regex filter
			});
		}
		return mem;
	}, this.tail(filename));

	/**
	* Filter by sample ratio
	* @TODO ADD key and hostname
	*/
	return val.sample_ratio && hi(stream).filter(function(dat){
		return Math.random() > val.sample_ratio;
	}) || stream;

};

/**
* Creates a tail stream given a filename string..
**/
Collector.prototype.tail = function(filename){
	var str = hi(exec(format(this.options.tailCmd, filename)).stdout);
	return str;
};


module.exports = function(_config){ return new Collector(_config); };

