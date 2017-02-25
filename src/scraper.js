
// required modules
var request = require('request');
var cheerio = require('cheerio');



// this Scraper module inherits from EventEmitter
var EventEmitter = require('events').EventEmitter;
function Scraper() {
	EventEmitter.call(this);
}
require('util').inherits(Scraper, EventEmitter);
module.exports = Scraper;



// webtms url
var base_url = 'https://duapp2.drexel.edu';
var home_url = 'https://duapp2.drexel.edu/webtms_du/app';



// start scraping webtms
Scraper.prototype.run = function() {
	var self = this;
	var terms = [];
	var reqs = 0;
	get_terms();
	
	

	// get term data
	function get_terms() {
		reqs += 1;
		request(home_url, function(error, request, body) {
			reqs -= 1;
			
			// get list of terms from html
			$ = cheerio.load(body);
			var entries = $('table.termPanel').find('.term');
			
			// populate list of terms
			entries.each(function(i, e) {
				if (i < 4) {
					var link = e.children[2];
					var term = {
						'name' : link.children[0].data,
						'subjects' : []
					};
					get_schools(term, base_url + link.attribs.href);
					terms.push(term);
				}
			});
		});
	}



	// get school data
	function get_schools(term, url) {
		reqs += 1;
		request(url, function(error, request, body) {
			reqs -= 1;
			
			// get list of schools from html
			$ = cheerio.load(body);
			var entries = $('div#sideLeft').find('a');
			
			// get list of schools
			entries.each(function(i, e) {
				get_subjects(term, base_url + e.attribs.href);
			});
		});
	}

	// get subject data
	function get_subjects(term, url) {
		var subjects = [];
		reqs += 1;
		request(url, function(error, request, body) {
			reqs -= 1;
			
			// get list of subjects from html
			$ = cheerio.load(body);
			var entries = $('table.collegePanel').find('.even,.odd');
			
			// for each subject, add to
			entries.each(function(i, e) {
				var link = e.children[2];
				subject = {
					'name' : link.children[0].data,
					'code' : '',
					'courses' : []
				};
				get_courses(subject, base_url + link.attribs.href);
				term.subjects.push(subject);
			});
		});
	}



	// get course data
	function get_courses(subject, url) {
		reqs += 1;
		request(url, function(error, request, body) {
			reqs -= 1;
			
			if (body) {
				// get list of courses from html
				$ = cheerio.load(body);
				var entries = $('tr.even,tr.odd').filter(function(i, e) {
					return e.children.length > 8;
				});
				
				entries.first(function(e) {
					subject.code = e.children[1].children[0].data;
				});
				
				var prev = null;
				
				// get list of terms
				entries.each(function(i, e) {
					if (prev && prev.course_num == e.children[3].children[0].data) {
						prev.sections.push(make_section(e));
					} else {
						var course = {
							'course_num' : e.children[3].children[0].data,
							'sections' : []
						};
						course.sections.push(make_section(e));
						subject.courses.push(course);
						prev = course;
					}
				});
			}
			
			if (reqs === 0) {
				self.emit('tms_data', {'terms' : terms});
			}
		});
	}
	
	function make_section(elem) {
		try {
			return {
				'instr_type' : elem.children[5].children[0].data,
				'instr_method' : elem.children[9].children[0].data,
				'section_num' : elem.children[11].children[0].data,
				'crn' : elem.children[13].children[0].children[0].children[0].data
			};
		} catch (e) {
			console.log(e);
			return {};
		}
	}
	
};
