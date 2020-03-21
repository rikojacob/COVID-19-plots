/* COVID-19-plots.js | MIT License | github.com/holgerdell/COVID-19-plots */

/* We insist that the entire program's model state is stored in this dict. */
let state = {};

/* The data never changes after it is put in this dict by the main function. */
let data = {};

/* Style configuration */
const style = {
  plotCircleRadius: 4,
  plotLineStrokeWidth: 3,
};

/* Function to convert Date object to string */
const formatDate = d3.timeFormat("%Y-%m-%d");

/** Return all available datasets
  * @return {List} of Strings
  */
function getDatasets() {
  /* This is a hack - should inspect data dictionary instead */
  return ["jh_Confirmed", "jh_Deaths", "jh_Recovered"];
}


/** Given an object and the total number of objects, returns a color
  * @param {Number} obj is the current object (between 0 and numObjects-1)
  * @param {Number} numObjects is the total number of colors needed
  *
  * @return {String} an RGB string, such as #ef1d99
  */
function color(obj, numObjects) {
  let fraction = 0;
  if (numObjects > 1) fraction = obj / (numObjects - 1);

  /* Alternative color schemes:
  return d3.interpolateSpectral(fraction);
  return d3.interpolateViridis(fraction);
  return d3.interpolateWarm(fraction);
  return d3.interpolateCool(fraction);
  */

  fraction = 1.75 * (1-fraction);
  if (fraction <= 1) return d3.color(d3.interpolateWarm(fraction)).darker(0.2);
  else return d3.color(d3.interpolateCool(2-fraction)).darker(0.2);
}


/** This function parses the URL parameters and returns an argv dictionary.
  * Also sets default values for known parameters.
  *
  * @return {Dictionary} a dictionary of all arguments
  */
function parseUrlArgs() {
  let argv = {};
  let match;
  const pl = /\+/g;
  const search = /([^&=]+)=?([^&]*)/g;
  const decode = (s) => decodeURIComponent(s.replace(pl, " "));
  const query = window.location.search.substring(1);

  while ((match = search.exec(query)) !== null) {
    argv[decode(match[1])] = decode(match[2]);
  }

  if (argv.normalize) {
    argv.normalize = (argv.normalize == "true");
  } else {
    argv.normalize = true;
  }

  if (argv.logplot) {
    argv.logplot = (argv.logplot == "true");
  } else {
    argv.logplot = false;
  }

  if (argv.countries) {
    argv.countries = argv.countries.split(";");
  } else {
    argv.countries = [
      "China", "Italy", "Denmark", "Germany", "Sweden", "Greece", "France",
    ];
  }

  if (argv.legend) {
    argv.legend = (argv.legend == "true");
  } else {
    argv.legend = true;
  }

  if (! argv.dataset) {
    argv.dataset = "jh_Confirmed";
  }

  return argv;
}

/** This function is the inverse of parseUrlArgs.
  * @param {Dictionary} argv dictionary that is to be turned into URL arguments
  *
  * @return {String}
  */
function makeUrlQuerystring(argv) {
  let url = "";
  if (argv.normalize) {
    url += "normalize=true&";
  } else {
    url += "normalize=false&";
  }
  if (argv.legend) {
    url += "legend=true&";
  } else {
    url += "legend=false&";
  }
  if (argv.logplot) {
    url += "logplot=true&";
  } else {
    url += "logplot=false&";
  }
  url += "dataset=" + argv.dataset + "&";
  url += "countries=";
  for (let i in argv.countries) {
    if (argv.countries.hasOwnProperty(i)) {
      const c = state.countries[i];
      url += c;
      if (i < argv.countries.length - 1) {
        url += ";";
      }
    }
  }
  return url;
}


/** This function sets the URL that the browser displays
  * @param {String} querystring
  */
function setDisplayedUrlQuerystring(querystring) {
  const url = window.location.href;
  const urlParts = url.split("?");
  if (urlParts.length > 0) {
    const baseUrl = urlParts[0];
    // const oldQuerystring = urlParts[1];

    const updatedQueryString = querystring;

    const updatedUri = baseUrl + "?" + updatedQueryString;
    window.history.replaceState({}, document.title, updatedUri);
  }
}

/** Get a nice label for the y-axis
  * @param {Dictionary} state is the current state
  *
  * @return {String} human-readable description of the scale of the y-axis
  */
function ylabel(state) {
  let ylabel = "";
  if (state.dataset == "jh_Confirmed") {
    ylabel ="Confirmed Infections";
  } else if (state.dataset == "jh_Deaths") {
    ylabel ="Confirmed Deaths";
  } else if (state.dataset == "jh_Recovered") {
    ylabel ="Confirmed Recovered";
  }
  if (state.normalize) {
    ylabel += " (per 100,000 inhabitants)";
  }
  ylabel += " [dataset "+state.dataset+"]";
  if (state.logplot) {
    ylabel += " [log-plot]";
  }
  return ylabel;
}

/** Given a value and country, return normalized value (if desired)
  * @param {Number} value is a numerical value for the country
  * @param {Number} country is the name of the country
  *
  * @return {Number} value normalized to incidence per 1 million inhabitants
  */
function rescale(value, country) {
  if (state.normalize) {
    value = value * 100000.0
      / parseInt(data["Country information"][country]["Population"]);
  }
  return value;
}

function appendGraph( svg, countryData, state,i,x,y,c ) { // svg: to append to

    const line = d3.line()
          .x((d) => (x(d.date)))
      .y((d) => y(rescale(d.value, c)));

    svg.append("path")
      .datum(countryData)
      .style("fill", "none")
      .style("stroke", color(i, state.countries.length))
      .attr("stroke-width", style.plotLineStrokeWidth)
      .attr("d", line);
    svg.selectAll()
      .data(countryData)
      .enter()
      .append("circle")
      .style("fill", color(i, state.countries.length))
      .attr("r", style.plotCircleRadius)
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(rescale(d.value, c)))
      .on("mouseover", function(d, i) {
        d3.select(this).attr("r", 2*style.plotCircleRadius);
        tooltip.html(d.country
          + "<br />Value: " + d.value.toLocaleString()
          + "<br />Date: " + formatDate(d.date));
        return tooltip.style("visibility", "visible");
      })
      .on("mousemove", () => tooltip
        .style("top", (d3.event.pageY-10)+"px")
        .style("left", (d3.event.pageX+10)+"px"))
      .on("mouseout", function(d, i) {
        d3.select(this).transition().attr("r", style.plotCircleRadius);
        return tooltip.style("visibility", "hidden");
      });
}

/** This function is called when the model state has changed.
  * Its purpose is to update the view state.
 */
function onStateChange() {
  setDisplayedUrlQuerystring(makeUrlQuerystring(state));

  const tooltip = d3.select("#tooltip");
  tooltip.style("visibility", "hidden");

  if (!state.legend) {
    d3.select("#legend").style("display", "none");
  } else {
    d3.select("#legend").style("display", "grid");
  }
  const width = document.getElementById("main").offsetWidth;
  const height = document.getElementById("main").offsetHeight;
  const margin = ({top: 80, right: 20, bottom: 80, left: 50});
  const svg = d3.select("main > svg");
  svg.html(null); // delete all children

  /* Check if all countries in the state are present in the data */
  for (let i in state.countries) {
    if (state.countries.hasOwnProperty(i)) {
      const c = state.countries[i];
      if (!(c in data["Country information"])) {
        svg.append("text").attr("x", 100).attr("y", 200)
          .text("ERROR: Did not find country '"+c+"' in data.");
        return;
      }
    }
  }

  /* x is a function that maps Date objects to x-coordinates on-screen */
  const x = d3.scaleUtc()
    .domain(d3.extent(data["Time series"], (e) => e["Date"]))
    .range([margin.left, width - margin.right]);

  /* draw the x-axis */
  svg.append("g")
    .call(d3.axisBottom(x))
    .attr("transform", `translate(0,${height - margin.bottom})`);

  console.log("Using dataset", state.dataset);

  let ymax = -Infinity;
  let ymin = Infinity;
  for (let i=0; i < state.countries.length; i++) {
    const c = state.countries[i];
    const n = d3.max(data["Time series"],
      (e) => rescale(e[state.dataset][c], c));
    console.log("Max number for", c, "is", n);
    if (n > ymax) ymax = n;
    const m = d3.min(data["Time series"],
      (e) => {
        const m = rescale(e[state.dataset][c], c);
        if (m > 0) return m;
        else return null;
      });
    if (m < ymin) ymin = m;
  }
  console.log("Domain from", ymin, "to", ymax);

  /* y is a function that maps values to y-coordinates on-screen */
  const y = ((state.logplot) ? d3.scaleLog() : d3.scaleLinear())
    .domain([ymin, ymax]).nice()
    .range([height - margin.bottom, margin.top]);

  /* draw the y-axis */
  svg.append("g")
    .call(d3.axisLeft(y))
    .attr("transform", `translate(${margin.left},0)`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.select(".tick:last-of-type text").clone()
      .attr("x", 3)
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text(ylabel(state)));

  /* draw the plot for each country */
  for (let i=0; i < state.countries.length; i++) {
    const c = state.countries[i];

    /* Massage the data for this country */
    const countryData = [];
    for (let j=0; j < data["Time series"].length; j++) {
      const d = data["Time series"][j];
      if (d[state.dataset][c]>0) {
        countryData.push({
          date: d["Date"],
          value: d[state.dataset][c],
          country: c,
          countryIndex: i,
        });
      }
    }
      function xx(dateString) {
          return x(dateString) - 30;
      }    
    appendGraph(svg, countryData, state,i,x,y,c);
    appendGraph(svg, countryData, state,i,xx,y,c);
  }

  const legend = d3.select("#legend");
  legend.html(null); // delete all children
  for (let i=0; i < state.countries.length; i++) {
    const item = legend.append("svg");
    item.append("circle")
      .attr("cx", 25).attr("cy", 25).attr("r", 25)
      .style("fill", color(i, state.countries.length));
    item.append("text")
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "start")
      .attr("x", 60).attr("y", 25)
      .text(state.countries[i]);
    item
      .on("click", function(_, _) {
        state.countries = state.countries.filter(function(value, index, arr) {
          return value !== state.countries[i];
        });
        onStateChange();
      })
      .on("mouseover", function(_, _) {
        svg.selectAll("circle")
          .filter((d) => d.countryIndex === i)
          .transition().attr("r", 2*style.plotCircleRadius);
        svg.selectAll("path")
          .filter((d) => (d && d[0].countryIndex === i))
          .transition().attr("stroke-width", 2*style.plotLineStrokeWidth);
        tooltip.html("Population: "
          + data["Country information"][state.countries[i]]["Population"]
            .toLocaleString());
        return tooltip.style("visibility", "visible");
      })
      .on("mousemove", () => tooltip
        .style("top", (d3.event.pageY-10)+"px")
        .style("left", (d3.event.pageX+10)+"px"))
      .on("mouseout", function(_, _) {
        svg.selectAll("circle")
          .filter((d) => d.countryIndex === i)
          .transition().attr("r", style.plotCircleRadius);
        svg.selectAll("path")
          .filter((d) => (d && d[0].countryIndex === i))
          .transition().attr("stroke-width", style.plotLineStrokeWidth);
        return tooltip.style("visibility", "hidden");
      });
  }

  /* Draw currently inactive countries */
  Object.keys(data["Country information"]).forEach(function(key) {
    if (!(state.countries.includes(key))) {
      const item = legend.append("svg");
      item.append("circle")
        .attr("cx", 25).attr("cy", 25).attr("r", 25)
        .style("fill", "#ffffff");
      item.append("text")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "start")
        .attr("x", 60).attr("y", 25)
        .text(key);
      item.on("click", function(_, _) {
        state.countries.push(key);
        onStateChange();
      });
    }
  });
}


/** The main function is called when the page has loaded */
async function main() {
  state = parseUrlArgs();
  data = await d3.json("data/data.json");

  /* parse date information in data */
  const parseDate = d3.timeParse("%Y-%m-%d");
  for (let i = 0; i < data["Time series"].length; i++) {
    data["Time series"][i]["Date"] = parseDate(data["Time series"][i]["Date"]);
  }

  onStateChange();

  /* Hook up event listeners to change the model state */
  const switchlog = () => {
    state.logplot = ! state.logplot;
    onStateChange();
  };
  d3.select("#log").on("click", switchlog);

  const switchnormalize = () => {
    state.normalize = ! state.normalize;
    onStateChange();
  };
  d3.select("#normalize").on("click", switchnormalize);

  const switchdatasets = () => {
    const ds = getDatasets();
    const i = ds.indexOf(state.dataset);
    state.dataset = ds[(i + 1) % ds.length];
    onStateChange();
  };
  d3.select("#datasets").on("click", switchdatasets);

  document.addEventListener("keydown", (event) => {
    switch (event.key) {
    case "l": switchlog(); break;
    case "n": switchnormalize(); break;
    case "d": switchdatasets(); break;
    }
  });
}

window.onload = main;
