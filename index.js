var app = require('./app')

// emulate AWS lambda
var event = {}
var context = {}
context.succeed = function() {
  console.log('Lambda function succeeded')
}
context.fail = function(err) {
  console.log('Lambda function failed:', err)
}
app.handler(event, context)