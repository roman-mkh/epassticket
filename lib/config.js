'use strict'

var Q = require('kew');

var config = module.exports;

var systemType = process.env.SYSTEM_TYPE || 'T';

config.systemType = systemType;

config.isTestSystem = function() {
	return !this.isProdSystem();
}

config.isProdSystem = function() {
	return systemType === 'P'
}

config.getSupportedLocales = function() {
	return ['de', 'fr'];
}

config.getDefaultLocale = function() {
	return config.getSupportedLocales()[0];
}

config.getSupportedLocale = function(locale) {
	var idx = config.getSupportedLocales().indexOf(locale);
	return idx >=0 ? config.getSupportedLocales()[idx] : config.getDefaultLocale();
}


module.exports.load = function() {
	var deferred = Q.defer();

	Q.delay(200).then(function() {

		// -- here we load config

		config.server = {
			port: process.env.PORT || 5000,
		};

		config.email = {
				from: process.env.EMAIL_FROM || "*@*.ch",
				bcc: process.env.EMAIL_BCC || "*@*.ch",
				subject: process.env.EMAIL_SUBJECT || "Festival ArtDialog Ticket: %s",
		};

		config.email.service = {
				host: process.env.EMAIL_HOST || "*.*.ch",
				port: process.env.EMAIL_PORT || 25,
				auth_user: "*@*.ch",
				auth_pass: "*",
		};

		// ---
		deferred.resolve(module.exports);

	}).fail(function(err) {
		deferred.reject(err); // FIXME VError
	}).end();

	return deferred.promise;
}
