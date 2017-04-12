var app = angular.module('PassApp', [ 'ngResource', 'ui.bootstrap', 'monospaced.qrcode' ]);

app.factory('PassTemplateFactory', [ '$resource', function($resource) {
	return $resource('/passtemplate');
} ])

app.factory('PassFactory', [ '$resource', function($resource) {
	return $resource('/pass/:id', null, {
		CreatePass : {
			method : "POST"
		}
	});
} ])

app.controller('PassTemplateCtrl', function($scope, PassTemplateFactory,
		PassFactory) {
	var newPassTemplate = {
		numberOfTickets : 1
	}; 
	
	// how to cache
	$scope.passTemplates = PassTemplateFactory.query();
	$scope.newPass = angular.copy(newPassTemplate);
	$scope.issuedPasses = []; // TODO: make own controller | shared data service | send event pass issued!
	
	$scope.orderPass = function() {
		newPassTemplate.templateId = $scope.newPass.templateId; // keep
		
		PassFactory.CreatePass($scope.newPass, function(issuedPass, getResponseHeaders) {
			$scope.newPass = angular.copy(newPassTemplate); // clear form
			
			$scope.issuedPasses.splice(0, 0, enchancePass(issuedPass));
		});		
	};	
});

app.controller('PassValidationCtrl', function($scope, $location, PassFactory) {
		var ticketId = "OREYA0206-1430418876256"; 
			
		PassFactory.get({id:ticketId}, function(pass, getResponseHeaders) {
			$scope.pass = enchancePass(pass);
		});
		
		// isPassValid()
});

var enchancePass = function(pass) { // TODO: use direct xdata! - methods are not observabel
	pass.getId = function() {
		return this.externalId ? this.externalId : this.id;
	}
	pass.getVisitorName = function() {
		return this.fields.name.value;
	};
	
	pass.getPerformance = function() {
		return this.headers.logo_text.value;
	};

	pass.getPerformanceDate = function() {
		var isoEventDate = this.headers.relevantDate.value;
		return new Date(Date.parse(isoEventDate)).toLocaleString() ;
	};
	
	
	pass.getSerialNumber = function() {
		return this.serialNumber;
	};
	
	pass.getDownloadUrl = function() {
		return this.publicUrl.path;
	};
	pass.getPlace = function() {
		return this.locations ? this.locations[0].relevantText : "";
	};
	
	pass.getNumberOfTickets = function() {
		return ~~this.fields.numberOfTickets.value; // convert float -> int
	};
	
	pass.getRestNumberOfTickets = function() {
		return ~~this.fields.numberOfTickets.value; // convert float -> int
	};
	pass.isValid = function() {
		return this.getRestNumberOfTickets() > 0; 
	}
	return pass;
};
