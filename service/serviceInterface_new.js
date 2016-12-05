require('netbuffer');

var net = require('net');
var crc32 = require('./crc32');
var async = require('async');
var getmac = require('getmac');


var HOST = '192.168.1.39';
var PORT = 9900;
if (process.env.APP_ENV == 'master') { //线上
  HOST = '10.24.35.4'
} else if (process.env.APP_ENV == 'prerelease') { //预发布
  HOST = '114.55.33.209'
}

var macAddress = '';
var curPid = process.pid;

var askId = 100; //askId

function Server() {
  var client = this.getClientInstance(),
    self = this || Server;
  async.waterfall([
    this.connectServer.bind(this)
  ], function(err, result) {
    console.log('服务器连接成功，发送登录协议...');

    this.getmac(function() {
      self.registerServer()
    })

  }.bind(this));


  // 为客户端添加“data”事件处理函数 data是服务器发回的数据
  client.on('data', function(buffer) {
    console.log('data back buffer')
    var packet = buffer.toNetReader();
    var packlen = packet.readInt32() + 6;
    var headerLen = packet.readInt16() + 4;
    var flag = packet.readInt16();
    var serviceId = packet.readInt32();
    var time = packet.readInt32();
    var uniqid = packet.readInt32();
    var askId = packet.readInt32();
    var code = packet.readInt16();
    var dstMode = packet.readInt8();
    var routers = packet.readInt8();
    var backJson = packet.readString(packlen - 28);

    // console.log('容器返回:', flag & 4, backJson, 'code>' + code);
    var eventBack = false;
    if ((flag & 4) > 0) {
      eventBack = true;
    }

    console.log(backJson)

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


Server.prototype.getmac = function(callback) {
  getmac.getMac(function(err, mc) {
    if (err) throw err
    macAddress = mc;
    callback()
  })
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

// mac + pid 64 -> tag
// {"name":"LinkerGo","tag":-2478739383025389756,"accepts":[{"service":"Logic.Data.Download","broadcast":true,"force":false}]}


//注册服务
Server.prototype.registerServer = function(callback) {
  console.log(curPid, macAddress)
  var json = {
    name: 'node_proxy',
    tag: Number('-2478739383025389757'),
    accepts: [{
      service: 'Container.Service.Register'
    }, {
      service: 'InnerSvr.Auth.Check'
    }, {
      service: 'NotifySvr.Sms.Send'
    }]
  }
  this.sendDataToServer('Container.Service.Register', json);
}

//向服务发送数据
Server.prototype.sendDataToServer = function(type, data) {
  var backData = this.pieceData(type, data);
  var content = backData['buffer'];
  console.log(content)
  this.client.write(content);
}

//处理数据
Server.prototype.handleData = function(askId, data, eventBack, code) {
  if (askId == 101) { //登录协议
    console.log('注册服务协议 成功返回')
    console.log('容器服务已经连接成功,可以正常中转协议...');
  }
}


// type ContainerPacketHeader struct {
//   PacketLen   uint32   //定义包体长度,后续的包长度,不包括自身
//   HeaderLen   uint16   //定义包头长度后续到BODY的边界长度，不包括自身
//   Flag        uint16   //协议标记
//   Service     uint32   //服务id
//   Time        uint32   //调用时间(s)
//   Uniqid      uint32   //单机下调用时间下的唯一值
//   Askid       uint32   //请求编号，反端响应原路返回
//   Code        uint16   //协议结果0表示成功，其它失败,一般用于返回
//   Routers     byte     //路由总数，用于标记路由的线路
//   DstMode     byte     //目标查找模式 0--默认 1--HASH查找 2--指定目标
//   Routerslist []uint64 //路由列表，一个路由组由IP + 端口组成, 每组路由占8字节
//   DstParam    uint64   //目标参数,根据dstmode 来决定是否发送
// }


//拼装数据
Server.prototype.pieceData = function(type, data) {


  var flag = 0;
  var code = 0;
  var routersArr = [];
  var dstMode = 0;
  var json = JSON.stringify(data);

  var offset = 0;
  //包长
  var len = this.getStringLen(json) + 28 + 8 * routersArr.length + 8 * dstMode;
  var headerLen = 28 + 8 * routersArr.length + 8 * dstMode;
  var buffer = new Buffer(len + 2);
  var time = parseInt(new Date().getTime() / 1000);

  // PacketLen
  buffer.writeUInt32BE(len - 4, offset);
  // HeaderLen
  offset += 4

  buffer.writeInt16BE(headerLen - 6, offset);
  offset += 2
    //协议标记
  buffer.writeInt16BE(flag, offset);

  offset += 2
    //服务ID
  buffer.writeInt32BE(crc32(type), offset);
  offset += 4
    //调用时间
  buffer.writeUInt32BE(time, offset);

  offset += 4
    //uniqid
  buffer.writeInt32BE(this.getUniqid(), offset);
  offset += 4
    //askId
  buffer.writeInt32BE(++askId, offset);

  offset += 4
    //code
  buffer.writeInt16BE(code, offset);

  offset += 2
    //routers
  buffer.writeInt8(routersArr.length, offset);

  offset += 1
    //DstMode
  buffer.writeInt8(dstMode, offset);

  offset += 1
    //routersList
  buffer.write(json, offset);

  return {
    buffer: buffer,
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
