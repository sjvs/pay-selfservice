let logger = require('winston');
let _ = require('lodash');

let displayConverter = require('./display_converter');

const ERROR_MESSAGE = 'There is a problem with the payments platform';
const ERROR_VIEW = 'error';

function response(req, res, template, data) {
  let convertedData = displayConverter(req.user, data, template);
  render(req, res, template, convertedData);
}

function errorResponse (req, res, msg) {
  if (!msg) msg = ERROR_MESSAGE;
  let correlationId = req.correlationId;
  let data = { 'message': msg };
  logger.error(`[${correlationId}] An error has occurred. Rendering error view -`, {errorMessage: msg});
  render(req, res, ERROR_VIEW, data);
}

function render(req, res, template, data){
  if (_.get(req, 'headers.accept') === "application/json") {
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } else {
    res.render(template, data);
  }
}

function healthCheckResponse(accept, res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.json(data);
}

module.exports = {
  response: response,
  healthCheckResponse: healthCheckResponse,
  renderErrorView: errorResponse
};
