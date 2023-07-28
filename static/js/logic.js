//GeoJSON url variable for weekly data
const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

// Prevent overload for color gradients
let gradientColors = ["#9AFF9A", "#5AFF5A", "#28C428", "#FF7878", "#FF3232", "#FF0000"];
let colorDomain;
let chromaScale;

//loading data and depth for the map
async function init() {
    let earthquakeData = await d3.json(url);
    

    // set Color Values
    let allDepths = getDepths(earthquakeData.features);
    console.log("Total Earthquakes", allDepths.length);
    colorDomain = chroma.limits(allDepths, 'l', gradientColors.length - 1);  // logarithmic
    chromaScale = chroma.scale(gradientColors).domain(colorDomain);

    // create Part 1 Main features
    let earthquakeFeatures = createEarthquakeFeatures(earthquakeData.features);
    
    
    createMap(earthquakeFeatures);
}
/**
 * Creating depths for the earthquake map
   @param {any} features geoJSON features
   @returns Array of numbers
*/
function getDepths(features) {
    return features.map(element => {
        let value = element.geometry.coordinates[2];
        return value > 0 ? value: 0.01;
    });
}

/**
 * Coloring depths
 * @param {number}depth
 * @returns
 */
function colorDepth(depth) {
    return chromaScale(depth).hex();
}
/**
 * Radial Magnitude
 * @param {number} magnitude
 */
function radialMagnitude(magnitude) {
    if (magnitude < 0.5) {
        return 2;
    } else {
        return magnitude * 4;
    }
}

/**
 * Adds a popup to a layer (each earthquake) containing the location, depth, magnitude, and date-time
 */
function _addPopup(feature, layer) {
    const dateFormat = new Intl.DateTimeFormat("en-us", {dateStyle: "medium", timeStyle: "short", timeZone: "UTC"})
    layer.bindPopup(`${feature.properties.place}<hr>
                    Magnitude: ${feature.properties.mag}<hr>
                    ${dateFormat.format(new Date(feature.properties.time))} UTC`)
}

/**
 * Converts the geoJSON point to a circleMarker layer.
 */
function _pointToLayer(feature, latLong) {
    return L.circleMarker(latLong, {
        color: colorDepth(feature.geometry.coordinates[2]),
        fillColor: colorDepth(feature.geometry.coordinates[2]),
        fillOpacity: 0.8,
        stroke: false,
        radius: radialMagnitude(feature.properties.mag),
    })
}

/** Creates the earthquake markers layer for the map */
function createEarthquakeFeatures(earthquakeData) {
    let earthquakes = L.geoJSON(earthquakeData,
        {onEachFeature: _addPopup,
         pointToLayer: _pointToLayer,
        });
    return earthquakes
}

/**Legend for the depth of earthquakes map */

function createLegend() {
    let legend = L.control({position: "bottomright"});

    legend.onAdd = () => {
        let div = L.DomUtil.create("div", "legend");

        // create list of html <li> elements with scale values
        let htmlLI = []
        colorDomain.forEach((value, index) => {
            // smallest value is slightly greater than 0, so we will display it as 0.01 +
            let formattedValue = index == 0 ? "0.01 +" : value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
            htmlLI.push("<li>" + formattedValue + "</li>");
        });

        // create the HTML for the legend
        div.innerHTML = `<h3 class="legend_title">Depth (km)</h3>
                        <div class="data_container">
                            <div class="gradient" style="background: linear-gradient(${gradientColors.join(", ")})"></div>
                            <div class="gradient_values">
                                <ul>
                                    ${htmlLI.join('')}
                                </ul>
                            </div>
                        </div>`;
        return div;
    }
    return legend;
}

/** Creates the map and adds the base & overlay layers and the legend */
function createMap(earthquakes) {
    // For tile map options see: https://leaflet-extras.github.io/leaflet-providers/preview/
    let esriGray = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    });

    let street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })

    let USGS_USImagery = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
    });

    

    let baseMaps = {
        Base: esriGray,
        Streets: street,
        Satellite: USGS_USImagery,        
    };

    let overlayMaps = {
        Earthquakes: earthquakes
    };

    // create the map
    let earthquakeMap = L.map("map", {
        center: [37.0902, -95.7129],
        zoom: 4,
        layers: [esriGray, earthquakes]
    });

    // Boundary lines to make clear where the edge of the map with data is
    L.polyline([[-85,180],[85,180]], {color: "#ddd"}).addTo(earthquakeMap);
    L.polyline([[-85,-180],[85,-180]], {color: "#ddd"}).addTo(earthquakeMap);

    // add the layers
    L.control.layers(
        baseMaps,
        overlayMaps,
        {collapsed: false})
        .addTo(earthquakeMap);
    
    // add the legend
    let legend = createLegend();
    legend.addTo(earthquakeMap);
}

// run the init function to start map creation
init();