var AbstractServer = require("./abstract-server.js");

var WebSocket = require("ws");

/**
 * Implementation of AbstractServer that uses Web Sockets for its transport.
 */
function WsServer(address) {
  AbstractServer.call(this);

  var portString = /^(.*):\/\/([A-Za-z0-9\-\.]+):([0-9]+)?(.*)$/.exec(address)[3];
  var portNumber = Number(portString);
  this.outstandingSockets = {};
  this.underlyingServer = new WebSocket.Server({ port: portNumber });
  this.underlyingServer.on('connection', function (webSocket) {
    var key = this.nextKey++;
    var outboundChannel = function (json) {
      webSocket.send(json);
    }.bind(this);
    this.activeOutboundChannels[key] = outboundChannel;
    this.outstandingSockets[key] = webSocket;

    webSocket.on('message', function (data) {
      this.__inboundMessageHandler(data, outboundChannel);
    }.bind(this));

    webSocket.on('close', function () {
      delete this.activeOutboundChannels[key];
      delete this.outstandingSockets[key];
    }.bind(this));
  }.bind(this));
}

WsServer.prototype = Object.create(AbstractServer.prototype);
WsServer.prototype.constructor = WsServer;

WsServer.prototype.makeRequest = function (jso) {
  for (var key in this.outstandingSockets) {
    this.outstandingSockets[key].send(JSON.stringify(jso));
  }
}

WsServer.prototype.destroy = function (callback) {
  this.underlyingServer.close(callback);
}

module.exports = WsServer;
