'use strict';

const router = require('koa-route');
//这个允许我们解析原生请求对象来获取请求内容
// const parse = require('co-body');
// const _ = require('underscore');

const redisInstance = require('../models/redis').redisInstance;
const mysqlInstance = require('../models/mysql').mysqlInstance;
const serviceInstance = require('../service/serviceInterface').serviceInstance;

global.userInfo = {};
global.sendMsgCount = 1;

function getRandomCode(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

//发送验证码   http://192.168.1.42:3000/main/auth/send_code?mobile=13958111541&callback=JSON
let sendQRRouter = router.get('/main/auth/send_code', function* sendQR() {
  console.log('sendQRRouter init')
  let mobile = this.request.query.mobile;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';


  console.log('mobile2', mobile)

  let send_code = getRandomCode(1000, 9999);
  
  console.log('send_code1', send_code)


  //FOR ME
  // if (mobile == '13958111541' || mobile == '13735804961' || mobile == '15858287803') {
    // send_code = 1111;
  // }

  //检测是否存在账号
  let result = yield mysqlInstance.checkUserLogin(mobile);
  console.log('result', result)
  if (result.length == 0) {
    this.body = startChunk + JSON.stringify({ 'code': 4, 'message': '账号不存在' }) + endChunk;
    return;
  }

  userInfo[mobile] = {};
  userInfo[mobile]['verify'] = send_code;

  console.log('send_codex', send_code)
  console.log('mobilex', mobile)


  if (mobile) {
    if (sendMsgCount == 100) {
      sendMsgCount = 1;
    }
    serviceInstance.sendDataToServer('NotifySvr.Sms.Send', { 'mobile': mobile, 'tplid': 1, 'data': [send_code], 'retry': sendMsgCount++ });
    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '发送成功' }) + endChunk;
  } else {
    this.body = startChunk + JSON.stringify({ 'code': -1, 'message': '手机号不能为空' }) + endChunk;
  }

});


//登录 STR:MONKEY:SESSION:cgr01207
let loginRouter = router.get('/main/auth/login', function* login() {
  let mobile = this.request.query.mobile;
  let verify = this.request.query.verify;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  let body = {};

  if (!mobile) {
    this.body = startChunk + JSON.stringify({ 'code': -1, 'message': '手机号不能为空' }) + endChunk;
    return;
  }

  if (!verify) {
    this.body = startChunk + JSON.stringify({ 'code': -1, 'message': '验证码不能为空' }) + endChunk;
    return;
  }

  //检测是否存在账号
  let result = yield mysqlInstance.checkUserLogin(mobile);
  if (result.length == 0) {
    this.body = startChunk + JSON.stringify({ 'code': 4, 'message': '账号不存在' }) + endChunk;
    return;
  }

  if (userInfo[mobile]) {
    console.log(userInfo[mobile]['verify'], verify)
    if (userInfo[mobile]['verify'] == verify) {

      userInfo[mobile] = {
          uid: result[0]['id'],
          nickname: result[0]['name'],
          status: result[0]['status']
        }
        //登录成功
      let sid = yield redisInstance.setSessionToRedis(result[0]['id'], mobile);
      let result2 = yield mysqlInstance.getAuthArea(result[0]['id']); //uid
      //登录日志（时间）
      yield mysqlInstance.setLoginTime(result[0]['id']);
      
      body = {
        code: 0,
        data: {
          areas: result2,
          userInfo: userInfo[mobile],
          sid: sid
        }
      };

    } else {
      body = { 'code': 1, 'message': '验证码错误' };
    }
  } else {
    body = { 'code': 2, 'message': '登录失败' };
  }

  this.body = startChunk + JSON.stringify(body) + endChunk;

});


//登出
let logoutRouter = router.get('/main/auth/logout', function* logout() {
  let sid = this.request.query.sid;
  let sessionInfo = yield redisInstance.getSessionInfo(sid);
  let callback = this.request.query.callback;

  let startChunk = callback + '(';
  let endChunk = ');';

  if (sessionInfo) {
    let mobile = sessionInfo.split('@')[1];
    delete userInfo[mobile];
    //删除session
    redisInstance.clearSessionInfo(sid);
  }
  this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '登出成功' }) + endChunk;
});


module.exports = {
  loginRouter: loginRouter,
  logoutRouter: logoutRouter,
  sendQRRouter: sendQRRouter
};
