'use strict'

var util = require('util')
var assert = require('assert');
var debugvr = require('debug')('ept::viewroute::http');
var debugview = require('debug')('ept::viewroute::view');

var express = require('express');
var bodyParser = require('body-parser');
// var querystring = require('querystring');

var qr = require('qr-image');

var config = require('./lib/config');
var service = require('./lib/service');
var hbshelper = require('./lib/hbs-helper');
var mw = require('./lib/expressmw');

var router = express.Router();
module.exports = router;

var mwAuth = mw.authFactory(true);

var mwLoadPassTicketInfo = function(req, res, next) {
	var passTicketIdParamName = "id";
	var passTicketId = req.params[passTicketIdParamName] || req.body[passTicketIdParamName];
	assert(passTicketId);

	service.getPassTicketInfoById(passTicketId).then(function(passTicketInfo) {
		req.passTicketInfo = passTicketInfo;
		next();

	}).fail(function(err) {
		debugvr("could not load passTicket", err.stack);

		// FIXME log it! actually log every http error

		res.status(500).send(err.message);
	}).end();
}

var mwDisplayPassTicketInfo = function(req, res, next) {
	assert(req.passTicketInfo);

	debugview("rendering view 'ticket' with %j", req.passTicketInfo);

	var locale = req.acceptsLanguages(config.getSupportedLocales()) || config.getDefaultLocale();
	
	var context = hbshelper.createPassTicketInfoRenderContext(req.passTicketInfo, locale)
	context.locals = res.locals;
	
	res.render('ticket', context);
	//res.render('DMSU0606', context);
}

// '/ticket(/:id|/\?id=:id)
router.get('/:id', [ mwLoadPassTicketInfo ], mwDisplayPassTicketInfo);

router.get('/:id/devalue', [ mwAuth, mwLoadPassTicketInfo ], mwDisplayPassTicketInfo);

router.post('/:id/devalue', [ mwAuth ], function(req, res) {
	var passTicketIdParamName = "id";
	var passTicketId = req.params[passTicketIdParamName] || req.body[passTicketIdParamName];
	assert(passTicketId);

	service.devaluePassTicketById(passTicketId, res.locals.username).then(function() {
		res.redirect(303, req.baseUrl + '/' + req.params.id + '/devalue');
	}).end();
});

router.get('/:id/qrcode', function(req, res) {
	debugvr("generating qr code for %s", req.params.id);

	var passTicketId = req.params.id;
	var img = hbshelper.generatePassTicketValidationUrlQrImg(passTicketId);

	res.writeHead(200, {
		'Content-Type' : 'image/png'
	});
	img.pipe(res);
});
