var fs = require('fs');
var JSZip = require('./node_modules/jszip');
async function main() {
  var data = fs.readFileSync('../../other docs/reportnet_export_40468.zip');
  var zip = await JSZip.loadAsync(data);
  var keys = Object.keys(zip.files).filter(function(k){ return zip.files[k].dir === false; });
  for (var k of keys) {
    var content = await zip.files[k].async('string');
    var parsed = JSON.parse(content);
    if (parsed.tables) {
      var empties = parsed.tables.filter(function(t){ return (t.records || []).length === 0; });
      console.log('Empty tables (' + empties.length + '):');
      empties.forEach(function(t) {
        var topKeys = Object.keys(t);
        console.log('  ' + t.tableName + ' -> keys: ' + JSON.stringify(topKeys));
      });
      // Also check a table WITH records to see its structure
      var withData = parsed.tables.find(function(t){ return t.records && t.records.length > 0; });
      if (withData) {
        console.log('\nSample table with data: ' + withData.tableName);
        console.log('  Top keys: ' + JSON.stringify(Object.keys(withData)));
        if (withData.records[0]) {
          console.log('  Record keys: ' + JSON.stringify(Object.keys(withData.records[0])));
          if (withData.records[0].fields) {
            console.log('  First 3 field names: ' + withData.records[0].fields.slice(0,3).map(function(f){return f.fieldName}).join(', '));
          }
        }
      }
    }
  }
}
main();
