'use strict'

var util = require('util')
var assert = require('assert');

var fjs = require("functional.js");
var qr = require('qr-image');

var config = require('./config');

module.exports = {

	generatePassTicketUrl : function(passTicketId) {
		assert(passTicketId);

		return process.env.EPASSTICKET_BASEURL  + '/' + passTicketId;
	},
	
	generatePassTicketValidationUrl : function(passTicketId) {
		assert(passTicketId);

		return this.generatePassTicketUrl(passTicketId) + "/devalue";
	},

	generatePassTicketValidationUrlQrCodeImgSrc : function(passTicketId) {
		assert(passTicketId);

		return "data:image/png;base64," + qr.imageSync(this.generatePassTicketValidationUrl(passTicketId)).toString('base64');
	},

	// buffer
	generatePassTicketValidationUrlQrImg : function(passTicketId) {
		return qr.image(this.generatePassTicketValidationUrl(passTicketId));
	},
	
	createPassTicketInfoRenderContext : function(passTicketInfo, useLocale, embededQrCode) {
		assert(passTicketInfo);
		var locale = useLocale || config.getDefaultLocale();

		
		 // http://formatjs.io/handlebars/
		var intlData = {
			"locales" : locale,
			"formats" : {
				"number" : {
					"TicketCurrency" : {
						"style" : "currency",
						"currency" : passTicketInfo.totalPrice.currency,
					},
				}
			}
		};

		var context = {
			pass : passTicketInfo,
			
			passTicketUrl: this.generatePassTicketUrl(passTicketInfo.id),
			
			config: config,
		};

		// helpers: {
		// https://github.com/ericf/express-handlebars
		// },
		var options = {
			data : {
				intl : intlData,
			},

			helpers : {
				qrCodeUrl : function() {
					// return embededQrCode ?
					// module.exports.generatePassTicketValidationUrlQrCodeImgSrc(passTicketInfo.id)
					// : util.format("/ticket/%s/qrcode", passTicketInfo.id);
					// outlook express does not display them!
					return util.format("/ticket/%s/qrcode", passTicketInfo.id);
				}
			},

		};

		fjs.assign(options, context);
		return context;
	},	
}
