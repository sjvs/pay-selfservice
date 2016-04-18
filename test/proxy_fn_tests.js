process.env.SESSION_ENCRYPTION_KEY = 'naskjwefvwei72rjkwfmjwfi72rfkjwefmjwefiuwefjkbwfiu24fmjbwfk';

var assert = require('assert');
var portfinder = require('portfinder');
var request = require('request');
var winston = require('winston');

var http = require('http'),
  httpProxy = require('http-proxy');

/**
 * This test actually tests if request.js honour HTTP_PROXY, NO_PROXY var's as per the documentation.
 * The reason for doing this is;
 *  we need to route requests to "Auth0" via a proxy and we use `passport-auth0.js` (https://www.npmjs.com/package/passport-auth0)
 *  and this lib uses request.js internally. We don't have control to set options manually hence making use of the env variables.
 *
 *  NOTE: Note we also use node-rest-client library in selfservice and that does not honour these vars.
 *  (Although it's used only for internal communication)
 */

describe('request.js client', function () {

  var proxiedServer, proxyServer, nonProxiedServer,
    proxiedServerUrl, proxyUrl, nonProxiedServerUrl,
    nonProxiedServerPort;

  before(function () {
    // Disable logging.
    winston.level = 'none';

    // create proxied server
    portfinder.getPort(function (err, aPort) {

      proxiedServer = http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write('{"message":"server-response"}');
        res.end();
      }).listen(aPort);

      proxiedServerUrl = "http://localhost:" + aPort;
    });

    // create non proxied server
    portfinder.getPort(function (err, aPort) {

      nonProxiedServer = http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write('{"message":"non-proxied-server-response"}');
        res.end();
      }).listen(aPort);
      nonProxiedServerPort = aPort;
      nonProxiedServerUrl = "http://localhost:" + aPort;
    });

    // create proxy server
    portfinder.getPort(function (err, aPort) {

      proxyServer = httpProxy
        .createProxyServer({target: {host: 'localhost', port: proxiedServer.address().port}})
        .listen(aPort);
      proxyUrl = "http://localhost:" + aPort;

      proxyServer.on('proxyRes', function (proxyRes, req, res) {
        proxyRes.headers['X-Proxy-Header'] = 'touched by proxy';
      });
    });


  });

  beforeEach(function () {
    process.env.HTTP_PROXY = proxyUrl;
    process.env.NO_PROXY = 'localhost:' + nonProxiedServerPort;
  });

  afterEach(function () {
    delete process.env.HTTP_PROXY;
    delete process.env.NO_PROXY;
  });

  after(function () {
    proxyServer.close();
    proxiedServer.close();
    nonProxiedServer.close();
  });

  it('should proxy requests when HTTP_PROXY enabled', function (done) {
    var client = request.defaults({json: true});

    client(proxiedServerUrl, function (error, response, body) {
      assert.equal(response.headers['x-proxy-header'], 'touched by proxy');
      assert.equal(body.message, 'server-response');
      done();
    });

  });

  it('should not proxy requests for NO_PROXY hosts', function (done) {
    var client = request.defaults({json: true});

    client(nonProxiedServerUrl, function (error, response, body) {
      assert.notEqual(response.headers['x-proxy-header'], 'touched by proxy');
      assert.equal(body.message, 'non-proxied-server-response');
      done();
    });

  });

});
