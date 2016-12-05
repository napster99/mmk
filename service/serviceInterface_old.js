require('netbuffer');

var net = require('net');
var crc32 = require('./crc32');
var async = require('async');

var HOST = '192.168.1.39';
var PORT = 9600;
if (process.env.APP_ENV == 'master') { //线上
  HOST = '10.24.35.4'
} else if (process.env.APP_ENV == 'prerelease') { //预发布
  HOST = '114.55.33.209'
}


var askId = 100; //askId

function Server() {

  var client = this.getClientInstance(),
    self = this || Server;
  async.waterfall([
    this.connectServer.bind(this)
  ], function(err, result) {
    console.log('服务器连接成功，发送登录协议...');
    this.loginServer();
  }.bind(this));


  // 为客户端添加“data”事件处理函数 data是服务器发回的数据
  client.on('data', function(buffer) {
    var packet = buffer.toNetReader();

    var len = packet.readInt16();
    var flag = packet.readInt16();
    var serviceId = packet.readInt32();
    var time = packet.readInt32();
    var uniqid = packet.readInt32();
    var askId = packet.readInt32();
    var code = packet.readInt16();
    var routers = packet.readInt16();
    var backJson = packet.readString(len - 22);

    // console.log('容器返回:', flag & 4, backJson, 'code>' + code);
    var eventBack = false;
    if ((flag & 4) > 0) {
      eventBack = true;
    }

    Server.prototype.handleData.call(self, askId, backJson, eventBack, code);
  });


  client.on('error', function(error) {
    console.log('error:', error);
  });

  // 为客户端添加“close”事件处理函数
  client.on('close', function() {
    console.log('Connection closed');
  });

}


//client 单列模式
Server.prototype.getClientInstance = function() {
  if (this.client) {
    return this.cilent;
  } else {
    return this.client = new net.Socket();
  }
}

//连接服务
Server.prototype.connectServer = function(callback) {
  this.client.connect(PORT, HOST, function() {
    callback(null);
  });
}

//登录服务
Server.prototype.loginServer = function() {
  var json = { token: 'abc', server: 'node_proxy', signature: 'abcd' }
  this.sendDataToServer('Container.Common.Login', json);
}

//注册服务
Server.prototype.registerServer = function(callback) {
  var json = {
    accepts: [],
    remotes: [{
      service: 'Container.Common.Login'
    }, {
      service: 'Container.Service.Register'
    }, {
      service: 'InnerSvr.Auth.Check'
    }, {
      service: 'NotifySvr.Sms.Send' //短信服务
    }],
    publishs: [],
    subscribes: []
  }
  this.sendDataToServer('Container.Service.Register', json);
}

//向服务发送数据
Server.prototype.sendDataToServer = function(type, data, socketId) {
  var backData = this.pieceData(type, data);
  var content = backData['netBuffer'];
  var askId = backData['askId'];
  
  this.client.write(content);
}

//处理数据
Server.prototype.handleData = function(askId, data, eventBack, code) {
  if (askId == 101) { //登录协议
    console.log('登录协议 成功返回')
    this.registerServer();
  } else if (askId == 102) { //注册服务协议
    console.log('服务注册成功！');
    console.log('容器服务已经连接成功,可以正常中转协议...');
  }
}

//拼装数据
Server.prototype.pieceData = function(type, data) {
  var flag = 0;
  var code = 0;
  var routersArr = [];
  var json = JSON.stringify(data);

  var offset = 0;
  //包长
  var len = this.getStringLen(json) + 22 + 8 * routersArr.length;
  var netBuffer = new Buffer(len + 2);
  var time = parseInt(new Date().getTime() / 1000);

  netBuffer.writeInt16BE(len, offset);
  offset += 2
    //协议标记
  netBuffer.writeInt16BE(flag, offset);
  offset += 2
    //服务ID
  netBuffer.writeInt32BE(crc32(type), offset);
  offset += 4
    //调用时间
  netBuffer.writeUInt32BE(time, offset);
  offset += 4
    //uniqid
  netBuffer.writeInt32BE(this.getUniqid(), offset);
  offset += 4
    //askId
  netBuffer.writeInt32BE(++askId, offset);
  offset += 4
    //code
  netBuffer.writeInt16BE(code, offset);
  offset += 2
    //routers
  netBuffer.writeInt16BE(routersArr.length, offset);
  offset += 2
    //routersList
  // console.log('json', json)
    //data
  netBuffer.write(json, offset);

  return {
    netBuffer: netBuffer,
    askId: askId,
    time: time
  };
}

//获取唯一值
Server.prototype.getUniqid = function() {
  var chars = "0123456789";
  var string_length = 8;
  var randomstring = '';
  for (var x = 0; x < string_length; x++) {
    var letterOrNumber = Math.floor(Math.random() * 2);
    if (letterOrNumber == 0) {
      var newNum = Math.floor(Math.random() * 9);
      randomstring += newNum;
    } else {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }
  }
  return randomstring;
}

//计算数据长度
Server.prototype.getStringLen = function(str) {
  if (!str) return 0;
  return str.replace(/[^\u0000-\u00ff]/g, 'aaa').length;

}

var serviceInstance = new Server();

module.exports.serviceInstance = serviceInstance;
