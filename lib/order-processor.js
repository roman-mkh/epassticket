'use strict'

// input provider-name, provider order-id, provider data
// 1. check if the order with id already exist
// 2.a order exist in state DONE - throw exception 'ALREADY_DONE'
// 2.b order exist in state PROCESSING - check date/time
// if more then 5 min mark as ERROR - process as 2c
// 2.c order exist in state ERROR - check retry count (relay on provider retry),
// try process again -> state PROCESSING

var debug = require('debug')('ept:paypal:orderproc');
var assert = require('assert');
var Q = require('kew');
var VError = require('verror');

var log = require('./logger').loggers.get('orderproc');
var dao = require('./dao');
var Order = require('./order');
var email = require('./email');

var process = function(passTicketOrder) {
	assert(passTicketOrder);
	var deferred = Q.defer();

	// debugDb("inserting new passTicket %s", passTicket.id);
	dao.getPassTicketOrder(passTicketOrder.id, true).then(function(existingPassTicketOrder) {
		
		if (existingPassTicketOrder) {
			debug("order %s exists, status %s", existingPassTicketOrder.id, existingPassTicketOrder.getLastStatus());

			if ("ERROR" === existingPassTicketOrder.getLastStatus()) {
				
				return dao.setPassTicketOrderStatus(passTicketOrder.id, "PROCESSING").then(function(passTicketOrder) {
					return existingPassTicketOrder;
				});
				
			} else {
				var verr = new VError("Order id: %s [%s] already exists", existingPassTicketOrder.id, existingPassTicketOrder.getLastStatus());
				verr.code = "ALREADY_PROCESSED";
				throw verr; 
			}
		} else {
			return passTicketOrder;
		}
		
	}).then(function(passTicketOrder) {
		debug("is going to create new order %s and find PassEvent %s", passTicketOrder.id, passTicketOrder.passEventId);

		var qPassTicketOrder = "NEW" === passTicketOrder.getLastStatus() ? dao.createPassTicketOrder(passTicketOrder) : Q.resolve(passTicketOrder); 
		
		return Q.all([qPassTicketOrder , dao.getPassEventById(passTicketOrder.passEventId) ])

	}).then(function(data) {
		var passTicketOrder = data[0];
		passTicketOrder.passEvent = data[1];

		return Q.all(passTicketOrder, dao.createPassTicket(new Order.PassTicket(passTicketOrder)));
	}).then(function(data) {

		var order = data[0];
		var passTicket = data[1];
		order.passTicketInfo = new Order.PassTicketInfo(passTicket, new Order.PassEventInfo(order.passEvent, order.lang));

		return Q.all(order, email.sendConfirmationEmail(order));

	}).then(function(data) {
		var order = data[0];		
		
		dao.setPassTicketOrderStatus(order.id, "DONE");
		debug("Processing for passTicketOrder: %s done -> eTicket %s", order.id, order.passTicketInfo.id);
		deferred.resolve(order);

	}).fail(function(err) {
		debug("Failed process passTicketOrder: %s, %s", passTicketOrder.id, err.stack);

		deferred.reject(new VError(err, "New Order id: %s cannot be processed", passTicketOrder.id));
		
		var notRecoveryCodes = ["ALREADY_PROCESSED"];
		
		if (!err.code || notRecoveryCodes.indexOf(err.code) < 0)
		{
			dao.setPassTicketOrderStatus(passTicketOrder.id, "ERROR");
		}
		else {
			debug("Oreder status not changes due to non recoverable error code %s", err.code); 
		}
		
	}).end();
	/*
	 * MongoError: E11000 key error index }).fail(function(err) {
	 * 
	 * }).then(function(content) {
	 * 
	 * }).end();
	 */

	return deferred.promise;
}

module.exports = {
	process : process,
}
