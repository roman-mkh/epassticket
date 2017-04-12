var fjs = require("functional.js");

module.exports = { // FIXME ME pass a creation header
	PassCreationData : function(visitor, template, isoEventDate, numberOfTickets, systemType) {
		var expirationDate = new Date(Date.parse(isoEventDate));
		expirationDate.setHours(expirationDate.getHours() + 3);

		var templateExternalId = String(template.templateHeader.externalId ? template.templateHeader.externalId
				: template.templateHeader.id);
		var passExternalId = templateExternalId + '-'
				+ String(new Date().valueOf());

		this.headers = {
			"expirationDate" : {
				"value" : expirationDate.toISOString()
			},
			"barcodeAltText" : {
				"formatType" : "String",
				"fieldType" : "barcode",
				"value" : passExternalId
			},
			"barcode_value" : {
				"formatType" : "String",
				"fieldType" : "barcode",
				"value" : "http://festival.artdialog.ch/validateticket/"
						+ passExternalId
			}
		};

		this.fields = {
			"name" : {
				"value" : visitor.name
			},
			"numberOfTickets" : {
				"value" : numberOfTickets
			}
		};

		this.publicURL = {
			"type" : "multiple"
		};

		this.tags = [ templateExternalId, visitor.name, systemType ];
	},

	PassDavalueData : function(pass, useNumberOfTickets) {
		var curNumberOfUsedTickets = ~~pass.fields.numberOfTickets.value;
		// TODO addd validation curNumberOfUsedTickets - useNumberOfTickets >= 0
		this.fields = {
			"numberOfTickets" : {
				"value" : curNumberOfUsedTickets - useNumberOfTickets
			}
		};
	},
	
	PassDavalueTags : function(pass, authUserName, numberOfUsedTickets) {
		var devalueTags = fjs.select(function (tag) {
	    return tag.lastIndexOf(tagPrefix, 0) === 0;
		})(pass.tags);
		
		this.tags = [ makeDevalueTag(devalueTags.length + 1, authUserName, useNumberOfTickets) ]; 
	},

	PassWrapper : function(pass) {
		this.id = pass.externalId ? pass.externalId : pass.id;

		this.visitorName = pass.fields.name.value;
		this.title = pass.fields.title ? pass.fields.title.value : pass.headers.logo_text.value; // FIXME title depricated in template
		this.date = new Date(Date.parse(pass.fields.date.value + ' ' + pass.fields.time.value));  

		this.place = pass.locations ? pass.locations[0].relevantText : "";
		this.locations = pass.locations[0];

		this.numberOfUsedTickets = selectTags(pass).length;
		
		this.numberOfTickets = ~~pass.fields.numberOfTickets.value + this.numberOfUsedTickets; 

		this.restNumberOfTickets = this.numberOfTickets - this.numberOfUsedTickets;

		// this.logoImage = pass.headers.thumbnail_image.value;
		this.logoImage = pass.headers.logo_image.value;

		this.expirationDate = new Date(Date.parse(pass.headers.expirationDate.value));
		
		this.isValid = this.restNumberOfTickets > 0; // add not voided and not
																									// expired
	},
	
	wrapForDisplay : function(pass) {
		var passWrapper = new this.PassWrapper(pass)
		
		passWrapper.expirationDateFormatted = passWrapper.expirationDate.toLocaleString();
		passWrapper.performance = passWrapper.title;
		passWrapper.performanceDate = passWrapper.date.toLocaleString();
		
		return passWrapper; 
	}
}

//{
//  "id":1577048,
//  "createdAt":"2015-05-03 12:28:25.0",
//  "name":"devalue-<rnd>-mukhinr-<cnt>"
//}

var delavueTagPrefix = "devalue";

function makeDevalueTag(rnd, authUserName, numberOfUsedTickets) {
	return "devalue-" + rnd + '-' + authUserName + '-' + (numberOfUsedTickets || 1);
}

function selectTags(pass)  {
	function s(tag) {
    return tag.name.indexOf(delavueTagPrefix, 0) === 0;
	}
	return fjs.select(s, pass.tags);
}

function toSortedValueTable(tags) {
	var fn = function(tag) {
		var items = tag.name.split('-');
		var res;
		try {
			res = {name: items[items.length-2], numberOfUsedTickets: items[items.length-1], date: new Date(Date.parse(items.createdAt))};
		}
		catch(e)
		{
			res = { name: "???", numberOfUsedTickets: 1, date: new Date() };
			console.log("Invalid devalue tag: " + tag);
		}
		return res;
	}
	
	var sorter = function(elm1, elm2) {
		return elm1.date.getTime() - elm2.date.getTime() 
	}
	
	return fjs.map(fn, selectTags(pass)).sort(compareFunction);
}