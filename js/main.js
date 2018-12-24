// DEFINE VARIABLES
// Define size of map group
// Full world map is 2:1 ratio
// Using 12:5 because we will crop top and bottom of map
var dealers = [];// distributor info json array.
var json_data = [];//total json datas
w = 3000;
h = 1250;
// variables for catching min and max zoom factors
var minZoom;
var maxZoom;

// DEFINE FUNCTIONS/OBJECTS
// Define map projection
var projection = d3
  .geoEquirectangular()
  .center([0, 15]) // set centre to further North as we are cropping more off bottom of map
  .scale([w / (2 * Math.PI)]) // scale to fit group width
  .translate([w / 2, h / 2]) // ensure centred in group
  ;

// Define map path
var path = d3
  .geoPath()
  .projection(projection);

// Create function to apply zoom to countriesGroup
function zoomed() {
  t = d3
    .event
    .transform;
  countriesGroup
    .attr("transform", "translate(" + [t.x, t.y] + ")scale(" + t.k + ")");
}

// Define map zoom behaviour
var zoom = d3
  .zoom()
  .on("zoom", zoomed);

function getTextBox(selection) {
  selection
    .each(function (d) {
      d.bbox = this
        .getBBox();
    });
}

// Function that calculates zoom/pan limits and sets zoom to default value 
function initiateZoom() {
  // Define a "minzoom" whereby the "Countries" is as small possible without leaving white space at top/bottom or sides
  minZoom = Math.max($("#map-holder").width() / w, $("#map-holder").height() / h);
  // set max zoom to a suitable factor of this value
  maxZoom = 20 * minZoom;
  // set extent of zoom to chosen values
  // set translate extent so that panning can't cause map to move out of viewport
  zoom
    .scaleExtent([minZoom, maxZoom])
    .translateExtent([[0, 0], [w, h]]);
  // define X and Y offset for centre of map to be shown in centre of holder
  midX = ($("#map-holder").width() - minZoom * w) / 2;
  midY = ($("#map-holder").height() - minZoom * h) / 2;
  // change zoom transform to min zoom and centre offsets
  svg.call(zoom.transform, d3.zoomIdentity.translate(midX, midY).scale(minZoom));
}

// zoom to show a bounding box, with optional additional padding as percentage of box size
function boxZoom(box, centroid, paddingPerc) {
  minXY = box[0];
  maxXY = box[1];
  // find size of map area defined
  zoomWidth = Math.abs(minXY[0] - maxXY[0]);
  zoomHeight = Math.abs(minXY[1] - maxXY[1]);
  // find midpoint of map area defined
  zoomMidX = centroid[0];
  zoomMidY = centroid[1];
  // increase map area to include padding
  zoomWidth = zoomWidth * (1 + paddingPerc / 100);
  zoomHeight = zoomHeight * (1 + paddingPerc / 100);
  // find scale required for area to fill svg
  maxXscale = $("svg").width() / zoomWidth;
  maxYscale = $("svg").height() / zoomHeight;
  zoomScale = Math.min(maxXscale, maxYscale);
  // handle some edge cases
  // limit to max zoom (handles tiny countries)
  zoomScale = Math.min(zoomScale, maxZoom);
  // limit to min zoom (handles large countries and countries that span the date line)
  zoomScale = Math.max(zoomScale, minZoom);
  // Find screen pixel equivalent once scaled
  offsetX = zoomScale * zoomMidX;
  offsetY = zoomScale * zoomMidY;
  // Find offset to centre, making sure no gap at left or top of holder
  dleft = Math.min(0, $("svg").width() / 2 - offsetX);
  dtop = Math.min(0, $("svg").height() / 2 - offsetY);
  // Make sure no gap at bottom or right of holder
  dleft = Math.max($("svg").width() - w * zoomScale, dleft);
  dtop = Math.max($("svg").height() - h * zoomScale, dtop);
  // set zoom
  svg
    .transition()
    .duration(500)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(dleft, dtop).scale(zoomScale)
    );
}

// on window resize
$(window).resize(function () {
  // Resize SVG
  svg
    .attr("width", $("#map-holder").width())
    .attr("height", $("#map-holder").height());
  initiateZoom();
});

// create an SVG
var svg = d3
  .select("#map-holder")
  .append("svg")
  // set to the same size as the "map-holder" div
  .attr("width", $("#map-holder").width())
  .attr("height", $("#map-holder").height())
  // add zoom functionality
  .call(zoom);


// get map data
d3.json(
  "./json/custom50.json",
  function (json) {
    json_data = json;
    //Bind data and create one path per GeoJSON feature
    countriesGroup = svg.append("g").attr("id", "map");
    // add a background rectangle
    countriesGroup
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", w)
      .attr("height", h);

    // draw a path for each feature/country
    countries = countriesGroup
      .selectAll("path")
      .data(json_data.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("id", function (d, i) {
        return "country" + d.properties.iso_a3;
      })
      .attr("class", "country")
      // add a mouseover action to show name label for feature/country
      .on("mouseover", function (d, i) {
        d3.select("#countryLabel" + d.properties.iso_a3).style("display", "block");
        // d3.selectAll(".country").classed("country-on", false);
        // d3.select(this).classed("country-on", true);
      })
      .on("mouseout", function (d, i) {
        d3.select("#countryLabel" + d.properties.iso_a3).style("display", "none");
      })
      // add an onclick action to zoom into clicked country
      .on("click", function (d, i) {
        show_info(d.properties.iso_n3)
        d3.selectAll(".country").classed("country-on", false);
        d3.select(this).classed("country-on", true);        
        boxZoom(path.bounds(d), path.centroid(d), 20);
      });
    // Add a label group to each feature/country. This will contain the country name and a background rectangle
    // Use CSS to have class "countryLabel" initially hidden
    countryLabels = countriesGroup
      .selectAll("g")
      .data(json_data.features)
      .enter()
      .append("g")
      .attr("class", "countryLabel")
      .attr("id", function (d) {
        return "countryLabel" + d.properties.iso_a3;
      })
      .attr("transform", function (d) {
        return (
          "translate(" + path.centroid(d)[0] + "," + path.centroid(d)[1] + ")"
        );
      })
      // add mouseover functionality to the label
      .on("mouseover", function (d, i) {
        d3.select(this).style("display", "block");
        d3.select(this).style("cursor", "pointer");
      })
      .on("mouseout", function (d, i) {
        d3.select(this).style("display", "none");
      })
      // add an onclick action to zoom into clicked country
      .on("click", function (d, i) {
        show_info(d.properties.iso_n3);
        d3.selectAll(".country").classed("country-on", false);
        d3.select("#country" + d.properties.iso_a3).classed("country-on", true);
        boxZoom(path.bounds(d), path.centroid(d), 20);
      });
    // add the text to the label group showing country name
    countryLabels
      .append("text")
      .attr("class", "countryName")
      .style("text-anchor", "middle")
      .attr("dx", 0)
      .attr("dy", 0)
      .text(function (d) {
        //console.log(d.properties.name)
        return d.properties.name;
      })
      .call(getTextBox);
    // add a background rectangle the same size as the text
    countryLabels
      .insert("rect", "text")
      .attr("class", "countryLabelBg")
      .attr("transform", function (d) {
        return "translate(" + (d.bbox.x - 2) + "," + d.bbox.y + ")";
      })
      .attr("width", function (d) {
        return d.bbox.width + 4;
      })
      .attr("height", function (d) {
        return d.bbox.height;
      });
    initiateZoom();
  }
);
//show information 
function show_info(country_id) {

  //show company informations per country
  var selected = dealers.filter(ag => ag.id == country_id);
  if (selected.length > 0) {// if there is any matched company         
    $("#company-name").text(selected[0].company_name);
    $("#distor-name").text('Distributor for ' + selected[0].country);
    $("#country").text(selected[0].country);
    $("#contact-company").text("Contact");
    $("#call-company").text("Call");
    $("#visit-company").text("Visit");
  }
}
// animation for showing info-pane
var left_pos = 200, popup_pan = 22, expand_flag = true;
$('#close-button').on('click', function () {
  if (expand_flag) {
    $('#distor-info-container').css({ "left": 0 }).animate({ "left": -left_pos + popup_pan }, 250, function () {
      $('#arrow-direction').removeClass("fa-chevron-left");
      $('#arrow-direction').addClass("fa-chevron-right");
      expand_flag = false;
    });
  } else {
    $('#distor-info-container').css({ "left": -left_pos + popup_pan }).animate({ "left": 0 }, 250, function () {
      $('#arrow-direction').removeClass("fa-chevron-right");
      $('#arrow-direction').addClass("fa-chevron-left");
      expand_flag = true;
    });
  }
})
//setting for select
$(document).ready(function () {
  jQuery.ajax({
    dataType: "json",
    url: "json/dealer.json",
    async: false,
    success: function (data) { dealers = data }
  });
  
  var data = $.map(dealers, function (obj) {
    obj.id = obj.id; // replace id with your identifier
    obj.text = obj.text || obj.country;
    return obj;
  });
  $('.distor-selector').select2({
    theme: "classic",
    placeholder: "Select destination",
    allowClear: true,
    data: data
  });
  $('.distor-selector').on('select2:select', function (e) {
    var data = e.params.data;
    d3.selectAll(".country").classed("country-on", false);
    d3.selectAll(".country").filter(d => d.properties.iso_n3 == data.id).classed("country-on", true);
    var j_node = json_data.features.filter(jd => jd.properties.iso_n3 == data.id)[0];    
    boxZoom(path.bounds(j_node), path.centroid(j_node), 20);
    show_info(j_node.properties.iso_n3);
  });
});