var config = require('./config')();
var parse = require("co-body");
var render = require("./lib/render.js");
var dbWrap = require("./lib/dbWrap.js");
var translateAmount = require("./lib/amountTranslator.js");
var formatRupiahs = require("./lib/formatRupiahs.js");
var hospitalConfigs = dbWrap.getCollection(config.mongoUrl, "hospitalConfig");
var kwitansis = dbWrap.getCollection(config.mongoUrl, "kwitansi");

// handlers
module.exports.create = function *(hospital) {
	var vm = yield hospitalConfigs.findOne({name: hospital});
	vm.kwitansiDate = new Date().toISOString().slice(0,10);

	this.body = yield render("create.html", vm);
};

module.exports.print = function *(hospital) {
	var postedData = yield parse(this);
	postedData.kwitansiDate = new Date();
	postedData.kwitansiNo = yield nextKwitansiNo(hospital);

	// Save to database
	yield kwitansis.insert(postedData);

	// Create viewmodel
	var vm = postedData;
	vm.hospitalName = hospital;
	vm.imagePath = hospital + ".jpg"
	vm.amountText = translateAmount(vm.amount);
	vm.amount = formatRupiahs(vm.amount);
	vm.kwitansiDate = dateToYYMMDD(vm.kwitansiDate);

	this.body = yield render("print.html", vm);
};

module.exports.exportToExcel = function *(hospital) {
	var kwitansiList = yield kwitansis.find({hospitalName : hospital});

	var vm = {
		hospitalName : hospital,
		kwitansis : kwitansiList
	};

	this.set("content-type", "application/vnd.ms-excel");
	this.set("content-disposition", "attachment;filename=kwitansi_" + hospital + ".xls");

	this.body = yield render("export.html", vm);
};

function *nextKwitansiNo(name) {
	var highestKwitansi = yield kwitansis.findOne(
			{ hospitalName: name },
			{ sort : {kwitansiNo : -1 }});

	if(highestKwitansi === null)
		return 1;

	return parseInt(highestKwitansi.kwitansiNo) + 1;
};

function parseDate(input) {
	var parts = input.split('-');
	return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
};

function dateToYYMMDD(date) {
	    var d = date.getDate();
	    var m = date.getMonth() + 1;
	    var y = date.getFullYear();
	    return '' + y + '-' + (m<=9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
	}