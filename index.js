var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var debugBoot = require('debug')('ept:boot')
debugBoot("starting ...")

var config = require('./lib/config');

var exphbs = require('express-handlebars');
var hbs = exphbs.create({
	defaultLayout : 'single',
	extname : '.hbs',
});
require('./lib/hbs-enhance')(hbs.handlebars);

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

app.use(express.static(__dirname + '/app'));
app.use(express.static(__dirname + '/bower_components'));
// router.use(express.static(__dirname + '/public'));

config.load().then(function(config) {
	debugBoot("config loaded");

	app.locals.config = config;
	
	config.hbs = hbs; // a hack! FIXME
	
	app.set('port', config.server.port);

	var paypal = require('./paypal');
	app.use('/paypal', paypal);

	var viewroute = require('./viewroute'); // TODO rename to passticketroute
	app.use('/ticket', viewroute);

	app.listen(app.get('port'), function() {
		debugBoot("...[system-type: '%s'] is running at localhost %d", config.systemType, app.get('port'));
	});

}).fail(function(err) {

	debugBoot("Start failed", err);

}).end();
