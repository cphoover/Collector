var config = require("nconf")
config.file("local" , __dirname + "/local.json" );
config.file("base"  , __dirname + "/base.json"  );
module.exports = { get : config.get.bind(config) };
