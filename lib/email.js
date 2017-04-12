'use strict'
// http://www.nodemailer.com
var debugSmtp = require('debug')('ept:email:smtp');
var debugData = require('debug')('ept:email:data');

var util = require('util');

var path = require('path');
var Q = require('kew');

var nodemailer = require('nodemailer');
var nmehbs = require('nodemailer-express-handlebars');

var smtpTransport = require('nodemailer-smtp-transport');

var config = require('./config');
var hbshelper = require("./hbs-helper");

var transport = nodemailer.createTransport(smtpTransport({
	host : config.email.service.host,
	port : config.email.service.port,
	auth : {
		user: config.email.service.auth_user,
		pass: config.email.service.auth_pass
	},

	ignoreTLS : true,
	secure : false,
	debug : true,
}));

// TODO plugins: nodemailer-html-to-text, nodemailer-express-handlebars
var nmehbsOpt = {
	viewEngine : config.hbs,
	viewPath : path.resolve(__dirname, '../views'),
	extName : ".hbs",
};
transport.use('compile', nmehbs(nmehbsOpt));

module.exports = {
	sendConfirmationEmail : function(passTicketOrder) {
		debugData("Sending confirmation email %j", passTicketOrder);

		var passTicketInfo = passTicketOrder.passTicketInfo;
		var passTicketId = passTicketInfo.id;
		var eventInfo = passTicketInfo.eventInfo; 
		var lang = passTicketOrder.lang;
		//var emailTemplate = eventInfo.id;
		var emailTemplate = "emailticket-" + lang;
		
		//var emailTo = util.format('"%s" <%s>', passTicketOrder.visitorName, passTicketOrder.visitorEmail);
		var emailTo = passTicketOrder.visitorEmail;

		debugData("template: %s -> email: %s", emailTemplate, emailTo);
		
		var defer = Q.defer();

		var mailContext = hbshelper.createPassTicketInfoRenderContext(passTicketOrder.passTicketInfo, lang, true)

		// view engine options:
		// https://github.com/ericf/express-handlebars#renderviewviewpath-optionscallback-callback
		mailContext.layout = false;

		// TODO make config!
		var mailData = {
			from : config.email.from,
			to: emailTo,
			bcc : config.email.bcc,
			subject : util.format(config.email.subject, passTicketId) + (config.isTestSystem() ? " (Test!)" : ""),

			template : emailTemplate,
			context : mailContext,

			attachments : [ {
				filename : 'logoartdialogverein.png',
				path : path.resolve(__dirname, '../views/img/logoartdialogverein.png'),
				cid : 'logoartdialogverein' 
			},
			 {
				filename : 'logofestivalartdialog.png',
				path : path.resolve(__dirname, '../views/img/logofestivalartdialog.png'),
				cid : 'logofestivalartdialog' 
			},
			 {
				filename : 'mapmark.png',
				path : path.resolve(__dirname, '../views/img/mapmark.png'),
				cid : 'mapmark' 
			},
			{
				filename: 'qrcode.png',
				content: hbshelper.generatePassTicketValidationUrlQrImg(passTicketId),
				cid : 'qrcode'
			},
			]
		};

		transport.sendMail(mailData, function(err, info) {
			if (!err) {
				debugSmtp("Mail Send OK: %j", info);

				defer.resolve();
			} else {
				debugSmtp("Mail Send FAILED:", err);

				defer.reject(err);
			}
		});

		return defer.promise;
	}
}

// ----- local functions
