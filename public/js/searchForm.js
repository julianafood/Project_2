// handleSearchSubmit is called whenever we submit a new set
// of search criteria. Save the search data to the searches
// table in our database and then display the new data.

$("#search-disaster").click(function (event) {
  // $("#search-disaster").on("click", function (event) {
  event.preventDefault();
  let country = $("#country").val().trim();
  let type = $("#disasterType").val().trim();
  let yearStart = parseInt($("#startingYear").val()) || 0;
  let yearEnd = parseInt($("#endingYear").val()) || 0;

  $("#country").val('');
  $("#disasterType").prop('selectedIndex', 0);
  $("#startingYear").prop('selectedIndex', 0);
  $("#endingYear").prop('selectedIndex', 0);

// clear the more info area
$("#more-info-title").html("Additional Information");
$("#more-info-desc").html("");
  // Force yearEnd to be > yearStart
  if (yearStart > yearEnd) {
    [yearStart, yearEnd] = [yearEnd, yearStart];
  }

  let dateStart = null;
  let dateEnd = null;

  // build filterEvent and searchCriteria objects
  let filterEvent = {}      // used to filter data from disasters table
  let searchCriteria = {}   // used to insert data into the searches table

  if (country != '') {                                  // handle country case
    filterEvent['country'] = country;
    searchCriteria['country'] = country;
  };
  if (type != 'Choose...') {                            // handle type case
    filterEvent['type'] = type;
    searchCriteria['type'] = type;
  }

  // Build section of filterEvent object (for getting range of years from disasters table) ========
  if (yearStart != 0) {                        // handle yearStart case
    dateStart = yearStart.toString() + "-01-01T00:00:00+00:00";
    // if no yearEnd chosen, make it Dec 31 of the same year
    if (yearEnd === 0) {
      dateEnd = yearStart.toString() + "-12-31T23:59:59+00:00";
    }
  }

  if (yearEnd != 0) {                        // handle yearEnd case
    dateEnd = yearEnd.toString() + "-12-31T23:59:59+00:00";
    // if no yearStart chosen, make it Jan 1 of the same year
    if (yearStart === 0) {
      dateStart = yearEnd.toString() + "-01-01T00:00:00+00:00";
    }
  }

  if (dateStart != null && dateEnd != null) {
    filterEvent['date'] = { $between: [dateStart, dateEnd] }
  }
  // ====================== End of year filterEvent object section ========================================

  // insert years into the searchCriteria object =======================================
  let begin = 0;
  let end = 0;
  if (yearStart != 0) {
    begin = yearStart;
    if (yearEnd === 0) {
      end = begin;
    } else {
      end = yearEnd;
    }
  }

  if (yearEnd != 0) {
    end = yearEnd;
    if (yearStart === 0) {
      begin = end;
    }
  }

  // in order to handle a range of years being tracked in the searches table, each key
  // must have a unique name ('year2013', 'year2014', etc) otherwise only the last year
  // in a range will be recorded.
  if (begin != 0 && end != 0) {
    for (let i = begin; i <= end; i++) {
      searchCriteria[`year${i}`] = i;
    }
  }

  // Send the GET request to get the search data to searches table.
  $.ajax({
    headers: {
      "Content-Type": "application/json"
    },
    type: "GET",
    url: "/api/searches"
  })
    .then(function (dbSearches) {
      let existsId = null;

      for (var key in searchCriteria) {
        let topic = key;
        // in order to be able to have multiple years in the object, the year keys are named
        //  'year2013', 'year2014', etc.  If the key has the word 'year' in it, then the topic
        // needs to just be set to 'year' in the seaches table.
        if (key.includes('year')) topic = 'year';

        let name = searchCriteria[key].toString().trim();
        existsId = recordExistsId(name, dbSearches);  // if record exists, returns the id
        let urlStr = `/api/searches/${existsId}`;
        let newSearchObj = {
          topic: topic,
          name: name,
          count: 1
        };
        // This AJAX call will increment the counter if the record already exists (if it has an id)
        // otherwise, a new record is added to the searches table
        $.ajax({
          headers: {
            "Content-Type": "application/json"
          },
          type: "POST",
          url: urlStr,
          data: JSON.stringify(newSearchObj)
        })
          .then(function (data) {
          })
      } 

      var search = JSON.stringify(filterEvent);
      // get the data from the disasters table
      $.ajax({
        type: "GET",
        url: `/disasters/${search}`
      }).then(function (data) {
        console.log(data);
        if (data.titlebar === 'undefineds') {
          data.titlebar = "Current Results";
        }
        $("#disp-events-title").html(data.titlebar)
        var events = data.events;
        var htmlstr = "";
        for (let i = 0; i < events.length; i++) {
          htmlstr = htmlstr + `<h3 class="py-2 listed-event"
           data-id='${events[i].id}'
           data-desc='${events[i].description}'
           data-title='${events[i].title}'
           >${events[i].title}</h3>`
        }
        $("#event-list-links").html(htmlstr);
      })
        .then(function () {
          $.ajax({
            headers: {
              "Content-Type": "application/json"
            },
            type: "GET",
            url: "/api/charts"
          })
            .then(function (data) {
              if (chart1) { chart1.destroy(); }
              if (chart2) { chart2.destroy(); }
              chart1 = createChart(data.cLabels, data.cData, 'country-chart');
              chart2 = createChart(data.dLabels, data.dData, 'disaster-chart');
            })
        })
    })
});


/**
 * Returns the id of the record if it exists
 * @param {*} name : word to search for (country name, disaster type or year)
 * @param {*} data : array from searches table in database
 */
function recordExistsId(name, data) {
  let existId = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i].name === name) {
      existId = data[i].id;
      return existId;
    }
  }};
