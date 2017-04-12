'use strict'

var debugDb = require('debug')('ept:dao:db');

var util = require("util");
var assert = require('assert');
var Q = require('kew');
var fjs = require("functional.js");
var VError = require('verror');
var mongo = require('./connection');
var Order = require('./order');

// TODO replace node style callbackes with kew promise

module.exports = {
	createPassTicket : function(passTicket) {
		assert(passTicket);
		var deferred = Q.defer();

		debugDb("inserting new passTicket %s", passTicket.id);

		var ticket = fjs.assign(passTicket, {
			_id : passTicket.id
		});
		delete ticket.id;

		mongo().then(function(db) {
			debugDb("pass prepared to insert %j", ticket);

			var ticketsCollection = db.collection("passTickets");
			ticketsCollection.insertOne(ticket, function(err, opResult) {
				if (!err) {

					var result = opResult.result;
					debugDb("inserted new passTicket result %j", result);
					deferred.resolve(passTicket);

				} else {
					debugDb("failed to insert new pass" + err);
					deferred.reject(err);
				}
			})
		}).end();

		return deferred.promise;
	},

	getPassTicketById : function(passTicketId) {
		assert(passTicketId);
		debugDb("loading passTicket id=%s", passTicketId);

		var deferred = Q.defer();

		mongo().then(function(db) {

			var query = {
				_id : passTicketId,
			};

			var ticketsCollection = db.collection("passTickets");
			ticketsCollection.findOne(query, {}, function(err, passTicket) {
				if (!err) {
					debugDb("loaded passTicket %j", passTicket);

					if (passTicket) {
						passTicket.id = passTicket._id;
						delete passTicket._id;
						//util.inherits(passTicket, Order.PassTicket)
						Object.setPrototypeOf(passTicket, Order.PassTicket.prototype);						

						deferred.resolve(passTicket);
					} else {
						deferred.reject(new Error("Could not find passTicket id=" + passTicketId));
					}
				} else {
					deferred.reject(err);
				}
			});

		}).end();

		return deferred.promise;
	},

	getPassEventById : function(passEnventId) {
		assert(passEnventId);

		debugDb("loading passEvent by id", passEnventId);
		var deferred = Q.defer();

		mongo().then(function(db) {

			var query = {
				_id : passEnventId,
			};

			var eventCollection = db.collection("passEvents");
			eventCollection.findOne(query, {}, function(err, passEvent) {
				if (!err) {
					debugDb("loaded passEvent %j", passEvent);

					if (passEvent) {

						passEvent.id = passEvent._id;
						delete passEvent._id;
						//util.inherits(passEvent, Order.PassEvent)
						Object.setPrototypeOf(passEvent, Order.PassEvent.prototype);

						deferred.resolve(passEvent);

					} else {
						deferred.reject(new VError("missing passevent id: %s", passEnventId));
					}

				} else {
					debugDb("loaded passEvent failed %j", passEvent);
					deferred.reject(new VError(err, "could not load passevent id: %s", passEnventId));
				}
			});
		}).end();

		return deferred.promise;
	},

	devaluePassTicketById : function(passTicketId, username, numberOfTickets) {
		assert(passTicketId);

		username = username || '<anonimus>';
		numberOfTickets = numberOfTickets || 1;
		debugDb("devalue pass with id %s by %s (NoOfTickets %s)", passTicketId, username, numberOfTickets);

		var deferred = Q.defer();

		var query = {
			_id : passTicketId,
		};

		var updateQuery = {
			'$push' : {
				devalues : {
					at : new Date(),
					numberOfTickets : numberOfTickets,
					user : username 
				}
			}
		};

		mongo().then(function(db) {

			var ticketsCollection = db.collection("passTickets");
			ticketsCollection.findOneAndUpdate(query, updateQuery, {}, function(err, updateResult) {
				if (!err) {
					debugDb("devalue update result %j", updateResult);
					deferred.resolve();
				} else {
					debugDb("devalue passTicket (%s) failed", passTicketId);
					deferred.reject(new VError(err, "could not update passTicket id: %s", passTicketId));
				}
			});

		}).end();

		return deferred.promise;
	},

	createPassTicketOrder : function(passTicketOrder, status) {
		assert(passTicketOrder);
		var currentStatus = status || 'PROCESSING';

		debugDb("inserting new order %s [%s]", passTicketOrder.id, currentStatus);

		var deferred = Q.defer();

		var order = fjs.assign(passTicketOrder, {
			_id : passTicketOrder.id,
			statusLog : [ {
				ts : new Date(),
				status : currentStatus
			} ],
		});
		delete order.id;

		mongo().then(function(db) {
			var ordersCollection = db.collection("passOrders");
			ordersCollection.insertOne(order, function(err, updateResult) {
				if (!err) {

					var result = updateResult.result;
					debugDb("inserted new passOrder result %j", result);
					deferred.resolve(passTicketOrder);

				} else {
					debugDb("failed to insert new pass" + err);
					deferred.reject(err);
				}
			});
		}).end();

		return deferred.promise;
	},

	getPassTicketOrder : function(passTicketOrderId, isReturnNullIfNotFound) {
		assert(passTicketOrderId);
		debugDb("reading passOrder id=%s", passTicketOrderId);
		var deferred = Q.defer();

		var isReturnNull = (typeof isReturnNullIfNotFound !== 'undefined') ? isReturnNullIfNotFound : false;
		debugDb("isReturnNull %s", isReturnNull);

		mongo().then(function(db) {
			var query = {
				_id : passTicketOrderId,
			};
			var ordersCollection = db.collection("passOrders");
			ordersCollection.findOne(query, {}, function(err, passTicketOrder) {

				if (!err) {
					debugDb("read passTicketOrder: %j", passTicketOrder);

					if (passTicketOrder) {
						passTicketOrder.id = passTicketOrder._id;
						delete passTicketOrder._id;
						
						passTicketOrder.__proto__ = Order.PassTicketOrder.prototype;
						deferred.resolve(passTicketOrder);

					} else if (isReturnNullIfNotFound) {
						deferred.resolve(passTicketOrder);
					} else {
						deferred.reject(new VError("could not passOrder id: %s", passTicketOrderId));
					}
				} else {
					deferred.reject(new VError(err, "could not passOrder id: %s", passTicketOrderId));
				}

			});
		}).end();

		return deferred.promise;
	},

	setPassTicketOrderStatus : function(passTicketOrderId, status) {
		assert(passTicketOrderId);
		assert(status);

		debugDb("set ticketPassOrder id=%s in status %s", passTicketOrderId, status);
		var deferred = Q.defer();

		mongo().then(function(db) {

			var query = {
				_id : passTicketOrderId,
			};

			/* mongodb 3.x
			var update = {
				$set : {
					status : status
				},
				$currentDate : {
					createdAt : true
				}
			}; */
			
			var newStatus = {
				ts : new Date(),
				status : status
			}

			var update = {
				"$push" : {
					"statusLog" : {
						"$each" : [ newStatus ],
						"$position" : 0,
					},
				}
			};

			var ordersCollection = db.collection("passOrders");
			ordersCollection.updateOne(query, update, function(err, dbres) {
				if (!err) {
					debugDb("passTicketOrder status result: %j", dbres);
					// TODO mukhinr: check dbres {"ok":1,"nModified":1,"n":1}
					deferred.resolve();
				} else {
					deferred.reject(new VError(err, "could update status of passTicketOrder: %s", passTicketOrderId));
				}
			});

		}).end();

		return deferred.promise;
	},
}
