var Request = require('request')
var isLambda = require('is-lambda')
var secrets = require('./secrets.json')

exports.handler = function(event, context) {
  console.log('Running on lambda:', isLambda ? 'YES' : 'NO')
  console.log('getting temperature...')


  var getTemperature = function(callback) {
    var getTempUrl = 'https://homemanager.tv/main/makeRawCall?serial_nr=' + secrets.northq_gateway +
   '&command=json/ms_sensor_get?node_id=' + secrets.northq_sensor_node + '&wake=0'
   var options = {
    url : getTempUrl,
    headers: {
      Cookie : secrets.northq_cookie
    }
   }
   console.log(getTempUrl)
    Request.get(options, function(err, response, body) {
      console.log(body)
      if (err) return callback(err)
      body = JSON.parse(body)
      var temperature = body.value;
      var adjustedTemperature = temperature + secrets.temperature_calibration
      console.log('Raw temperature:', temperature, ' adjusted:', adjustedTemperature)
      callback(null, adjustedTemperature)
    })
  }

  var postTemperature = function(temperature, callback) {
    var options = {
      url : 'https://metrics-api.librato.com/v1/metrics',
      form: {
        source: isLambda ? 'aws-lamda' : 'debug',
        gauges: [
          {
            name: 'office_temp',
            value: temperature,
            source: 'sensor0'
          }
        ]

      },
      auth: {
        user: secrets.librato_user,
        pass: secrets.librato_key
      }
    }

    console.log(JSON.stringify(options))
    Request.post(options, function(err, response, body) {
      console.log(body)
      callback(err)
    })
  }

  var handleErrorAndPostResult = function(err, temperature) {
    if (err) return context.fail(err)
    postTemperature(temperature, function(err) {
      if (err) return context.fail(err)
      context.succeed(temperature)
    })
  }

  console.log('Process version:', process.version)
  getTemperature(handleErrorAndPostResult)

}