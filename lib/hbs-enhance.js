'use strict'

var debug = require('debug')('ept::handlebars::enhance');
var debugtemplate = require('debug')('ept::handlebars::template');
var config = require('./config');

// http://techblog.dorogin.com/2012/02/handlebars-and-functions.html
module.exports = function(Handlebars) {
	Handlebars.JavaScriptCompiler.prototype.nameLookup = function(parent, name, type) {
		if (parent === "helpers") {
			if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name))
				return parent + "." + name;
			else
				return parent + "['" + name + "']";
		}

		if (/^[0-9]+$/.test(name)) {
			return parent + "[" + name + "]";

		} else if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name)) {

			var capitalizeFirstLetter = function(str) {
				return str.charAt(0).toUpperCase() + str.slice(1);
			}

			var fnName = 'get' + capitalizeFirstLetter(name); // FIXME make support 'is' too.

			// ( typeof parent.name === "function" ? parent.name() : parent.name)
			return "(typeof " + parent + "." + fnName + " === 'function' ? " + parent + "." + fnName + "() : " + parent + "." + name + ")";
		} else {
			return "(typeof " + parent + "['" + name + "'] === 'function' ? " + parent + "['" + name + "']() : " + parent + "." + name + ")";
		}
	};

	// http://formatjs.io/guides/runtime-environments/#polyfill-node
	if (global.Intl) {
		var localesMyAppSupports = config.getSupportedLocales();
		debug("we support locales: %s, default: %s", localesMyAppSupports, config.getDefaultLocale());

		var areIntlLocalesSupported = require('intl-locales-supported');

		if (!areIntlLocalesSupported(localesMyAppSupports)) {
			debug("`Intl` exists, but it doesn't have the data we need, so load the polyfill and replace the constructors with need with the polyfill's.");

			require('intl');
			Intl.NumberFormat = IntlPolyfill.NumberFormat;
			Intl.DateTimeFormat = IntlPolyfill.DateTimeFormat;
		} else {

			debug("Built-in `Intl` supports locale %s", localesMyAppSupports);
		}
	} else {
		debug("No `Intl`, so use and load the polyfill.");

		global.Intl = require('intl');
	}

	// http://formatjs.io/handlebars/ Handlebars helpers for internationalization.
	require('handlebars-intl').registerWith(Handlebars);

	Handlebars.registerHelper('breaklines', function(text) {
		text = Handlebars.Utils.escapeExpression(text);
		text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
		return new Handlebars.SafeString(text);
	});

	Handlebars.registerHelper('ifTestSystem', function(options) {
	  	if(config.isTestSystem()) {
    		return options.fn(this);
  		} else {
    	return options.inverse(this);
  	}
});

	Handlebars.registerHelper("print", function(obj) {
		debugtemplate("->" + JSON.stringify(obj));
	});

	/*
	 * Use this to turn on logging: (in your local extensions file)
	 */
	Handlebars.logger.log = function(level) {
		if (level >= Handlebars.logger.level) {
			console.log.apply(console, [].concat([ "Handlebars: " ], _.toArray(arguments)));
		}
	};
	// DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3,
	Handlebars.registerHelper('log', Handlebars.logger.log);
	// Std level is 3, when set to 0, handlebars will log all compilation results
	Handlebars.logger.level = 0;
}
