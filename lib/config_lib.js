"use strict";

var path     = require("path"),
	Provider = require("nconf").Provider;

module.exports = function () {
	var conf = (new Provider()).argv().env('__'),
		env  = (conf.get("NODE_ENV") || "development"),
		args = arguments,
		len  = arguments.length,
		i;

	for(i=0;i<len;++i){ conf.use("local"+i, { type: 'file', file: path.join(args[i],  "local.json") }); }
	for(i=0;i<len;++i){ conf.use("env"  +i, { type: 'file', file: path.join(args[i], env + ".json") }); }
	for(i=0;i<len;++i){ conf.use("base" +i, { type: 'file', file: path.join(args[i],   "base.json") }); }

	return { get: conf.get.bind(conf) };
};