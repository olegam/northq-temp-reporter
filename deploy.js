var exec = require('child_process').exec;
var cmd = 'zip -FSr deploy.zip app.js secrets.json node_modules/';

exec(cmd, function(error, stdout, stderr) {
  // command output is in stdout
  console.log(stderr)
  console.log(stdout)
});