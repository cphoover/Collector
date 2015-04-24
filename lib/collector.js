var _        = require('lodash'         )             ,
	hi       = require('highland'       )             ,
	UdpStream= require('./udp_stream'   )             ,
	hostname = require('os'             ) .hostname() ,
	exec     = require('child_process'  ) .exec       ,
	CronJob  = require('cron'           ) .CronJob    ,
	fmt      = require('util'           ) .format     ,
	forever  = require('forever-monitor')             ,
	logger   = require('./logger'       )             ;
/**
*
**/
function Collector(_config){

	_config = _config || {};

	this.options = _config.get('options');

	this.foreverConfig = _config.get('forever') || {};
	

	// if we have a log level less than info (e.g debug, trace, verbose);
	logger.level = _config.get('options:log_level');
	this.noisy = logger.levels[logger.level] < 3;

	this.inputs = _config.get('inputs');

	// this should be a UdpPoolStream Object in future
	this.udpStream = new UdpStream(_config.get('options:remote'));
	this.tailStreams = [];
	this.foreverChildren = [];
	this.execStreams = [];
	this.init();
}


/**
*
**/
Collector.prototype.init = function(){
	logger.info("Initializing Collector Agent");

	// setup tails
	this.tailStreams = _.map(this.inputs.files, function(val,key,map){
		var readStream = this.wrapStreamWithKeyAndHost(this.createTailStream(val, key), key);
		readStream.fork().pipe(this.udpStream);
		if(this.noisy) { readStream.fork().pipe(process.stdout); }
		return readStream;
	}.bind(this));

	// setup execs
	this.execStreams = _.map(this.inputs.exec, function(val, key, map){
		var readStream = this.wrapStreamWithKeyAndHost(this.createExecStream(val, key), key);
		readStream.fork().pipe(this.udpStream);
		if(this.noisy) { readStream.fork().pipe(process.stdout); }
		return readStream;
	}.bind(this));


	// add exit handler to clean up after ourselves
	process.on('exit', function (){
		logger.info("Cleaning Up");
		logger.debug("Cleaning up child tail processes");
		this.foreverChildren.forEach(function(child){
			child.stop();
		});

		// @todo actually do this
		logger.debug("Closing UDP Socket");
	});

};

Collector.prototype.wrapStreamWithKeyAndHost = function(readStream, key) {
	var prefix = fmt("[%s] [%s] [%s] - ", this.options.type, key, hostname );
	return hi(readStream).split().map(function(dat){
		return prefix + dat + "\n";
	}.bind(this));
};

Collector.prototype.createExecStream = function(val, key){
	if(!_.isString(val.cmd)) {
		throw new TypeError("exec must be provided with string cmd value!");
	}

	logger.debug("Creating exec stream on cmd:", val.cmd);

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
	}).merge().errors(function(err){
		logger.error("An Error with ExecStream has occurred:", err);
		logger.error("Error running command:", val.cmd);
		
	});

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

	logger.debug("Creating tail stream on file:" + filename);

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
	return (val.sample_ratio && hi(stream).filter(function(dat){
		return Math.random() > val.sample_ratio;
	}) || stream).errors(function(err){
		logger.error("An Error with TailStream has occurred:", err);
		logger.error("Error tailing:", filename);
		
	});

};

/**
* Creates a tail stream given a filename string..
**/
Collector.prototype.tail = function(filename){
	return hi(function(push, next){ // this is apparently the way to pipe multiple streams into one stream
		var child = forever.start(fmt(this.options.tailCmd, filename).split(" "), this.foreverConfig);
		child.on('start', function(){ push(null, hi(child.child.stdout));   }); // initial pipe
		child.on('restart', function(){ push(null, hi(child.child.stdout)); }); // need to repipe new stdout stream on restart
	}.bind(this)).merge();
};



module.exports = function(_config){ return new Collector(_config); };

