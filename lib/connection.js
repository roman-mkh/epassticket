var Q = require('kew');

var debugDbConn = require('debug')('ept:db:conn')

// http://afshinm.name/mongodb-singleton-connection-in-nodejs
var MongoClient = require('mongodb').MongoClient

// the MongoDB connection
var connectionInstance;

// TODO experiment with Promise.prototype.failBound/successBound

// ensureIndex for tables

module.exports = function(callback) {
	// if already we have a connection, don't connect to database again
	// https://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html
	var deferred = Q.defer();
	if (!connectionInstance) {
		var defConnUrl = 'mongodb://localhost/epassticket';
		var connUrl = (process.env.MONGODB_URL || defConnUrl);

		debugDbConn("Connecting to %s ...", connUrl);

		MongoClient.connect(connUrl, function(err, database) {
			if (!err) {
				debugDbConn("...sucessful.");
				connectionInstance = database;
				deferred.resolve(connectionInstance);

			} else {
				debugDbConn("...failed", err);
				deferred.reject(err);
			}
		});

	} else {
		debugDbConn("Already connected");
		deferred.resolve(connectionInstance);
	}
	return deferred.promise;
};

process.on('beforeExit', function(code) {
	if (connectionInstance) {
		debugDbConn("Garcefuly closing connection");
		
		connectionInstance.close(function(err, res) {
			
			connectionInstance = null;
			
			debugDbConn("Closed ", (err || res));
		});
	}
});