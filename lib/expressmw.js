'use strict'

var debug = require('debug')('ept::express::mw');
var fjs = require("functional.js");
var basicAuth = require('basic-auth');

var authCallback;

var authFactory = function(authPersonOnly) {
	return function(req, res, next) {
		function unauthorized(res) {
			res.set('WWW-Authenticate', 'Basic realm="Ticket Validation"');
			res.status(401).end();
		}
		
		var tryUser = basicAuth(req);

		if (!tryUser) {
			return unauthorized(res);
		}

		if (!authCallback)
		{
			// fixme use DOA - config load document auth user
			if (process.env.AUTH_USERS) {
				var authUsers = JSON.parse(process.env.AUTH_USERS);

				var eqAuthFn = fjs.curry(function(authUser, aUser) {
					return aUser.name === authUser.name && aUser.pass === authUser.pass;
				});

				var firstFn = function(eqAuthFn) {
					return fjs.first(eqAuthFn, authUsers);
				};
				
				authCallback = fjs.compose(fjs.exists, firstFn, eqAuthFn);
			} else {
				debug('no env.AUTH_USERS defined: [{"name":<name>, "pass":<password>},..]')
				return unauthorized(res);
			}
		}

		// add roles
		if (authCallback(tryUser)) {
			req.auth = {
				user : tryUser.name
			};
			res.locals.authenticated = true;
			res.locals.username = tryUser.name; 
			debug("Authorized as %s", req.auth.user);
		}

		if (req.auth || !authPersonOnly) {
			next();
		} else {
			unauthorized(res);
		}
	};
}

module.exports = {
	authFactory: authFactory,
}

