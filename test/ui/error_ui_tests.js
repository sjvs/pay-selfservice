var path = require('path')
var renderTemplate = require(path.join(__dirname, '/../test_helpers/html_assertions.js')).render

describe('The error view', function () {
  it('should render an error message', function () {
    var msg = 'shut up and take my money!'
    var body = renderTemplate('error', {'message': msg})
    body.should.containSelector('#errorMsg').withText(msg)
  })
})
