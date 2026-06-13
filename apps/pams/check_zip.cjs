var JSZip = require('./node_modules/jszip');
var fs = require('fs');
async function main() {
  var data = fs.readFileSync('../../other docs/tmp/data_export (8).zip');
  var zip = await JSZip.loadAsync(data);
  var allKeys = Object.keys(zip.files);
  var files = allKeys.filter(function(n){ return zip.files[n].dir === false; }).sort();
  console.log('Total files:', files.length);
  console.log('Files:', files.join(', '));

  var fmeData = fs.readFileSync('../../other docs/Spain.zip');
  var fmeZip = await JSZip.loadAsync(fmeData);
  var fmeKeys = Object.keys(fmeZip.files);
  var fmeFiles = fmeKeys.filter(function(n){ return fmeZip.files[n].dir === false; }).sort();

  var missing = fmeFiles.filter(function(f){return files.indexOf(f)===-1});
  var extra = files.filter(function(f){return fmeFiles.indexOf(f)===-1});
  console.log('\nMissing vs FME (' + missing.length + '):', missing.join(', ') || 'none');
  console.log('Extra vs FME (' + extra.length + '):', extra.join(', ') || 'none');
}
main();
