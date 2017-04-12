'use strict'

var assert = require('assert');
var Q = require('kew');
var fjs = require("functional.js");

var PassEvent = function() {

}

var PassEventInfo = function(passEvent, lang) {
	assert(passEvent);
	assert(lang);

	fjs.assign(passEvent, this);

	
	var lc = passEvent.lc[lang];
	if (!lc) {
		lc = passEvent.lc[Object.keys(passEvent.lc)[0]];
	}
	assert(lc);
		
	fjs.assign(lc, this);
	delete this.lc;
}

var PassTicketInfo = function(passticket, eventInfo) {
	assert(passticket);
	assert(eventInfo);

	fjs.assign(passticket, this);
	this.eventInfo = eventInfo;
}

PassTicketInfo.prototype.getIsExpired = function() {
	return this.eventInfo.endAt < new Date();
}

PassTicketInfo.prototype.getNumberOfUsedTickets = function() {
	return this.devalues ? this.devalues.length : 0;
}

PassTicketInfo.prototype.getRestNumberOfTickets = function() {
	return this.numberOfTickets - this.getNumberOfUsedTickets(); 
}

PassTicketInfo.prototype.isValid = function() {
	return this.getRestNumberOfTickets() > 0 && !this.getIsExpired();
}


var PassTicket = function(passTicketOrder) {
	this.id = generateOrderId(passTicketOrder.passEventId);
	this.passEventId = passTicketOrder.passEventId;
	this.totalPrice = passTicketOrder.totalPrice;
	this.numberOfTickets = passTicketOrder.numberOfTickets;
	// this.ticketUsed: [],
	this.createdAt = new Date();
	this.ver = 1.04;
	this.paymentTx = passTicketOrder.id;
}

var PassTicketOrder = function(txId, provider, passEventId, visitorName, visitorEmail, numberOfTickets, totalPrice, lang, providerData) {
	assert(txId);
	assert(provider);
	assert(passEventId);
	assert(visitorName);
	assert(visitorEmail);
	assert(numberOfTickets);
	assert(totalPrice && totalPrice.currency && typeof totalPrice.value == 'number');
	assert(lang);
	assert(providerData);

	this.id = provider + '-' + txId;
	this.txId = txId;
	this.provider = provider;
	this.passEventId = passEventId;
	this.visitorName = visitorName;
	this.visitorEmail = visitorEmail;
	this.numberOfTickets = numberOfTickets;
	this.totalPrice = totalPrice;
	this.lang = lang;
	this.providerData = providerData;	
}

PassTicketOrder.prototype.getLastStatus = function() {
	return this.statusLog ? this.statusLog[0].status : 'NEW';  
}

var generateOrderId = function(eventId) {
	return eventId + '-' + String(new Date().valueOf());
}

module.exports = {
	PassEvent : PassEvent,
	PassEventInfo : PassEventInfo,
	PassTicket: PassTicket,
	PassTicketInfo : PassTicketInfo,
	PassTicketOrder : PassTicketOrder,
}
