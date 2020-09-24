// Jack Seagrist and Karthik Krishna 
// CEE 260D Project
// Requires the latlon_dict file of CIMIS station coordinates to be uploaded
// and named Table.

//----------------------- Add Geometry---------------------------------

// Outline of California
var outline = ee.FeatureCollection('TIGER/2016/States')
    .filter(ee.Filter.or(
        ee.Filter.eq('NAME', 'California'))); 
        
Map.addLayer(outline, {palette: ['blue']}, 'AOI')
// Show the CIMIS station locations
Map.addLayer(points, {color: 'red'}, 'CIMIS Locations')

//----------------------- Add SMAP-----------------------------------------------
var startDate = '2015-10-01'
var endDate = '2019-09-30'
// Add SMAP data
var collection = ee.ImageCollection('NASA_USDA/HSL/SMAP_soil_moisture')
                  .filter(ee.Filter.date(startDate, endDate))
                  .filter(ee.Filter.bounds(points))
                  .map(function(image){return image.clip(outline)})
print(collection)


// Add collection to Map
var vizParams = {bands: ['ssm'],
  min: 0,
  max: 25.39,
  palette: ['0300ff', '418504', 'efff07', 'efff07', 'ff0303'], 
}
Map.addLayer(collection, vizParams, 'collection')

//----------------------------Land Cover--------------------------
var dataset = ee.ImageCollection('USGS/NLCD')
                .map(function(image){return image.clip(outline)});
var landcover = dataset.select('landcover');
var landcoverVis = {
  min: 0.0,
  max: 95.0,
  palette: [
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '466b9f',
    'd1def8',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    'dec5c5',
    'd99282',
    'eb0000',
    'ab0000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    'b3ac9f',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '68ab5f',
    '1c5f2c',
    'b5c58f',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    'af963c',
    'ccb879',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    'dfdfc2',
    'd1d182',
    'a3cc51',
    '82ba9e',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    'dcd939',
    'ab6c28',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    '000000',
    'b8d9eb',
    '000000',
    '000000',
    '000000',
    '000000',
    '6c9fb8'
  ],
};
Map.addLayer(landcover, landcoverVis, 'Landcover');

//-----------------------------ET from NASA for ref----------------------
var dataset2 = ee.ImageCollection('MODIS/006/MOD16A2')
                  .filter(ee.Filter.date('2018-10-01', '2019-09-30'))
                  .map(function(image){return image.clip(outline)});
var evapotranspiration = dataset2.select('ET');
var evapotranspirationVis = {
  min: 0.0,
  max: 300.0,
  palette: [
    'ffffff', 'fcd163', '99b718', '66a000', '3e8601', '207401', '056201',
    '004c00', '011301'
  ],
};

Map.addLayer(evapotranspiration, evapotranspirationVis, 'Evapotranspiration');

//---------------------------- Analysis----------------------------------
//select a point to analyze and create chart  
var testPoint = points.filter(ee.Filter.eq('name', 'Owens Lake South'))
print(testPoint)
Map.centerObject(testPoint, 10)

var chart = ui.Chart.image.series({
    imageCollection: collection.select('ssm'),
    region: testPoint.geometry()
    }).setOptions({
      interpolateNulls: true,
      lineWidth: 1,
      pointSize: 3,
      title: 'SSM Owens Lake South WY16-19',
      vAxis: {title: 'SSM'},
      hAxis: {title: 'Date', format: 'YYYY-MMM', gridlines: {count: 20}}
    })
print(chart)

// ----------------------------------Adding rectangles around cimis stations--------------------
var pointCollection = ee.FeatureCollection(points);

// Define a function of buffering and bounding      
var bounding_box_func = function(feature) {
    var intermediate_buffer = feature.buffer(1250);  // buffer radius, half your box width in m
    var intermediate_box = intermediate_buffer.bounds(); // Draw a bounding box around the circle
       return(intermediate_box); // Return the bounding box
      };

// Apply function
var bounding_boxes = pointCollection.map(bounding_box_func);
    Map.centerObject(pointCollection); // Center map on sample points
    Map.addLayer(bounding_boxes, {color: '#FECA1E', fillColor: '#4c4cff'}, "Bounding boxes");

Map.centerObject(testPoint, 12)

print(bounding_boxes) 
// -----------------------------------Extract Land cover value-------------------
var yearly = dataset;

var fg_points = points;

// Empty Collection to fill
var ft = ee.FeatureCollection(ee.List([]))

var fill = function(img, ini) {
  // type cast
  var inift = ee.FeatureCollection(ini)

  // gets the values for the points in the current img
  var ft2 = img.reduceRegions(fg_points, ee.Reducer.first(),30)    
  // gets the date of the img
  var date = img.date().format()

  // writes the date in each feature
  var ft3 = ft2.map(function(f){return f.set("date", date)})

  // merges the FeatureCollections
  return inift.merge(ft3)
}

// Iterates over the ImageCollection
var newft = ee.FeatureCollection(yearly.iterate(fill, ft));

// Export
Export.table.toDrive(newft,
"export_Points",
"export_Points",
"export_Points"); 