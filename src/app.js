
//---------//
// MODULES //
//---------//

var fs = require('fs');
var express = require('express');



//-----------//
// CONSTANTS //
//-----------//

// how old can TMS data be before new data should be generated
// value should be in milliseconds
var max_age = 24 * 60 * 60 * 1000;

// local file names
var log_file = __dirname + '/data.log';
var data_file = __dirname + '/data.json';
var backup_data_file = __dirname + '/data.json.bak';







//-----------//
// VARIABLES //
//-----------//

// TMS data
var tms_data = {};

// time last data set was generated
var last = 0;






//---------//
// METHODS //
//---------//

// pretty print json
function pprint(json) {
	return JSON.stringify(json, null, 3);
}

// returns true if the old TMS data is stale (new data should be generated)
function is_data_stale() {
	return last + max_age < Date.now();
}

// scrapes TMS for new data
function generate_data() {
	// run scraper to generate tms data
	var scraper = new (require(__dirname + '/scraper'))();
	scraper.run();
	console.log('Generating new data');
	
	// when scraper emits data
	scraper.on('tms_data', function(new_data) {
		tms_data = new_data;
		save_data();
	});
}

// save tms data to local file
function save_data() {
	
	// rename old data file to backup file
	fs.rename(data_file, backup_data_file, function(err) {
		if (err) {
			console.log(err);
			console.log('Failed to backup data');
		}
		
		// write new data to file
		fs.writeFile(data_file, pprint(tms_data), function(err) {
			if (err) {
				console.log(err);
				console.log('Failed to generate new data');
				
			} else {
				// write to the log file
				last = Date.now();
				fs.appendFile(log_file, '\n' + last, function(err) {
					if (err) {
						console.log(err);
						console.log('Failed to write to log file');
					}
				});
				
				console.log('New data has been generated');
			}
		});
	});
}

// download data from the local file
function load_data() {
	try {
		var log = String(fs.readFileSync(log_file)).split('\n');
		last = parseInt(log[log.length - 1]);
	} catch (e) {
		console.log(e);
		last = 0;
	}
	
	if (is_data_stale()) {
		generate_data();
		
	} else {
		try {
			// load data file
			tms_data = JSON.parse(fs.readFileSync(data_file));
			console.log('Data loaded from file');
			
		} catch (e) {
			console.log(e);
			
			try {
				// load backup data file
				tms_data = JSON.parse(fs.readFileSync(backup_data_file));
				console.log('Data loaded from backup');
				
			} catch (e) {
				console.log(e);
				
				// generate new data if loading failed
				generate_data();
			}
		}
	}
}







//--------//
// SERVER //
//--------//

// initialize server and load data
var app = express();
load_data();

// serve static pages
app.use(express.static(__dirname + '/public'));

// start the server
app.listen(port, function() {
	console.log('Running on port ' + port + '...');
});

// declare request routes
app.get('/data', function(req, res) {
	if (is_data_stale()) {
		generate_data();
	}
	res.end(JSON.stringify(tms_data));
});

// set the server port
var port = 8080;
if (process.argv.length > 2 && ! isNaN(process.argv[2])) {
	var val = parseInt(process.argv[2]);
	if (0 <= val && val <= 65535) {
		port = val;
	}
}
