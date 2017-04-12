'use strict'

// FIXME use only one debug - all others - logging
var debugIpnStages = require('debug')('ept:paypal:ipn:stages');
var debugIpnData = require('debug')('ept:paypal:ipn:data');
var debugIpnDb = require('debug')('ept:paypal:ipn:db');

var util = require('util');
var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');

var request = require('request');

var Q = require('kew');

var config = require('./lib/config');
var log = require('./lib/logger').loggers.get('paypal');

var Order = require('./lib/order');
var orderProcessor = require('./lib/order-processor');

var router = express.Router();
module.exports = router;

//var urlencodedParser = bodyParser.urlencoded({
//	extended : false
//});

var textParser = bodyParser.text({ type: "*/*"});
//var rawParser = bodyParser.raw();

//router.use(urlencodedParser);

// var logger = require('morgan');
// router.use(logger());

// https://developer.paypal.com/docs/classic/paypal-payments-standard/integration-guide/formbasics/ !!!
router.post('/ipn', textParser, function(req, res) {
	// https://developer.paypal.com/webapps/developer/docs/classic/ipn/integration-guide/IPNIntro/#id08CKFJ00JYK
	debugIpnStages("INCOMING IPN <-PayPal Post (2)"); 
	// 2.6
	res.status(200).end();

	debugIpnStages("OUTGOUNG IPN -> PayPal 'HTTP 200' (3)");

	var params = querystring.parse(req.body);

	debugIpnData("PayPal -> receiver_email %s, npayer_email %s, payment_status %s, notify_version %s", params.receiver_email, params.payer_email,
			params.payment_status, params.notify_version);
	debugIpnData("PayPal -> %j", params)

	// https://developer.paypal.com/webapps/developer/docs/classic/ipn/integration-guide/IPNIntro/
	// This message must contain the same fields, in the same order, as the original IPN from PayPal, all preceded by cmd=_notify-validate
	//args.data = "cmd=_notify-validate&" + querystring.stringify(params);
	var outParams = 'cmd=_notify-validate&' + req.body;
	
	var postToPayPal = {
		url : process.env.PAYPAL_BASEURL + "/cgi-bin/webscr",
		headers: {
			'content-type': (req.get('content-type') || 'application/x-www-form-urlencoded')
		},
		//form : outParams
		body: outParams
	};

	debugIpnData("POSTing to paypal %j", postToPayPal);

	request.post(postToPayPal, function(err, ppResponse, ppBody) {
		if (err)
			throw err; // FIXME

		debugIpnStages("INCOMING IPN <-PayPal Post (5): %s", ppBody);

		// Content-Type: text/html; charset=UTF-8
		if (ppResponse.statusCode == 200) {

			// VERIFIED | INVALID
			if ("VERIFIED" === ppBody) {
				log.info("Begin processing request");
				
				var promises = [];
				promises.push(Q.fcall(checkPaymentSysParams, params));

				Q.all(promises).then(function(content) {
					var order = createPassTicketOrder(params);
					return orderProcessor.process(order);
				})
				.fin(function(content) {
					
					log.info("End processing request");
					
				}).end();
				
			} else if ("INVALID" == ppBody) {
				log.warn("PayPal request verification failed! Fraud request!");
			} else {
				log.error("PayPal Verify failed unexpected: response body %s", ppBody);
			}
		} else {
			log.error("PayPal Verify failed response: %s %s", ppResponse.statusCode, ppResponse.statusMessage)
		}
	});

	debugIpnStages("OUTGOUNG IPM -> PayPal Post (4)");
});

// test paypal
router.post('/cgi-bin/webscr', textParser, function(req, res) {
	var params = req.body;
	debugIpnStages("PayPal-Sim: %s", params)

	var resMsg = params.indexOf('cmd=_notify-validate') === 0 ? "VERIFIED" : "INVALID";
	
	res.set('Content-Type', 'text/html; charset=UTF-8');
	res.status(200).send(resMsg);
});

var checkPaymentSysParams = function(ppData) {
	debugIpnData("checkPaymentSysParams... (txn_type=%s)", ppData.txn_type);

	// http://www.howtocreate.co.uk/xor.html
	if (ppData.test_ipn ? config.isProdSystem() : config.isTestSystem()) {
		throw new Error("PayPal unappropriate system test/prod"); // FIXME is it
		// work?
	}

	debugIpnData("checkMerchant...");
	// business
	// TODO promise from config.
	// FIXME use config
	if (process.env.PAYPAL_MERCHANT_EMAIL != ppData.receiver_email) {
		throw new Error(util.format("Not my merchant email: %s. Expected: %s", ppData.receiver_email, process.env.PAYPAL_MERCHANT_EMAIL));
	}

	debugIpnData("checkPayment status...");

	var expected = {
		"payment_status" : "Completed",
		"payment_type" : "instant",
	}

	// TODO move to my util!
	Object.keys(expected).forEach(function(key) {
		if (expected.hasOwnProperty(key)) {
			var recv = ppData[key];
			if (!recv || recv != expected[key]) {
				throw new Error("Unexpected value for '" + key + "' > '" + expected[key] + "' vs '" + recv + "'");
			}
		}
	});

	debugIpnData("...OK");
}

// TODO check others:
// txn_type = express_checkout
// https://developer.paypal.com/webapps/developer/docs/classic/ipn/integration-guide/IPNIntro/

// custom: {
// vn: <VisitorName>
// }

var createPassTicketOrder = function(ppData) {
	var provider = 'paypal';
	var orderId =  ppData.txn_id;
	var visitorEmail = ppData.payer_email;
	var passEventId =  ppData.item_number; //ppData.transaction_subject;
	var numberOfTickets = ppData.quantity;
	var totalPrice = {
		value : parseFloat(ppData.mc_gross),
		currency : ppData.mc_currency
	}; // http://paypaldev.org/topic/31-payment-gross/
	var visitorName;
	var lang;

	var custom;
	try {
		debugIpnData("Custom data %s", ppData.custom);
		custom = JSON.parse(ppData.custom || "{}");
		//custom = JSON.parse('{"lang":"fr"}');
		debugIpnData("Custom data lang: %s", custom.lang);
	} catch (err) {
		debugIpnData("Invalid or missing paypal custom", err);
		custom = {}
	}

	visitorName = custom.vn || ppData.first_name + ' ' + ppData.last_name;
	lang = custom.lang || config.getDefaultLocale();

	return new Order.PassTicketOrder(orderId, provider, passEventId, visitorName, visitorEmail, numberOfTickets, totalPrice, lang, ppData);
}
