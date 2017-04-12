'use strict'

var assert = require('assert');
var VError = require('verror');
var debusrv = require('debug')('ept::service');

var Q = require('kew');
// var fjs = require("functional.js");

var config = require('./config');
var dao = require('./dao');
var model = require('./order');

module.exports = {
	getPassTicketInfoById : function(passTicketId, useLang) {
		assert(passTicketId);
		
		var lang = useLang || config.getDefaultLocale();

		var deferred = Q.defer();

		dao.getPassTicketById(passTicketId).then(function(passTicket) {

			return Q.all(passTicket, dao.getPassEventById(passTicket.passEventId));

		}).then(function(cmd) {
			var passTicket = cmd[0];
			var passEvent = cmd[1];

			var passEventInfo = new model.PassEventInfo(passEvent, lang);
			var passTicketInfo = new model.PassTicketInfo(passTicket, passEventInfo);

			deferred.resolve(passTicketInfo);

		}).fail(function(err) {

			deferred.reject(new VError(err, "could not load passTicketInfo id=%s", passTicketId));

		}).end();

		return deferred.promise;
	},

	devaluePassTicketById : function(passTicketId, username, numberOfTickets) {
		assert(passTicketId);
		
		// make verification whether pass is still valid not expired
		
		return dao.devaluePassTicketById(passTicketId, username, numberOfTickets);
	}
}