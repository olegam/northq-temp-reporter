var Request = require('request')
var isLambda = require('is-lambda')
var secrets = require('./secrets.json')

exports.handler = function(event, context) {
  console.log('Running on lambda:', isLambda ? 'YES' : 'NO')
  console.log('getting temperature...')


  var getAPIToken = function(username, password, callback) {
    var options = {
      url : 'https://homemanager.tv/token/new.json',
      form: {
        username : username,
        password : password,
      }
    }
    Request.post(options, function(err, res, body) {
      if (err) return callback(err)
      var bodyObject = JSON.parse(body)
      if (!bodyObject.success) return callback(new Error('NorthQ error:' + body))
      callback(null, bodyObject)
    })
  }

  var getMeasurements = function(session, gateway, callback) {
    var parameters = session
    parameters.gateway = gateway
    console.log(parameters)
     var options = {
      url : 'https://homemanager.tv/main/getGatewayStatus',
       form : parameters
     }
    Request.post(options, function(err, response, body) {
      console.log(body)
      if (err) return callback(err)
      body = JSON.parse(body)
      var sensorNames = ['office_temp', 'unknown_1', 'unknown_2']
      var gauges = body.MultilevelSensors[0].sensors.map(function(sensor, index) {
        var m = {}
        m.value = sensor.value
        if (index == 0) {
          var adjustedTemperature = m.value + secrets.temperature_calibration
          console.log('Raw temperature:', m.value, ' adjusted:', adjustedTemperature)
          m.value = adjustedTemperature
        }
        m.name = sensorNames[index]
        m.source = 'sensor' + index
        return m
      })
      console.log(gauges)
      callback(null, gauges)
    })
  }

  var postMeasurements = function(gauges, callback) {
    var options = {
      url : 'https://metrics-api.librato.com/v1/metrics',
      form: {
        source: isLambda ? 'aws-lamda' : 'debug',
        gauges: gauges
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

  var handleErrorAndPostResult = function(err, gauges) {
    if (err) return context.fail(err)
    postMeasurements(gauges, function(err) {
      if (err) return context.fail(err)
      context.succeed(gauges)
    })
  }

  console.log('Process version:', process.version)
  getAPIToken(secrets.northq_username, secrets.northq_password, function (err, session) {
    if (err) return context.fail(err)
    getMeasurements(session, secrets.northq_gateway, handleErrorAndPostResult)
  })



}