'use strict';

let URLConfig = require('../config/urlConfig').URLConfig;
let redisInstance = require('../models/redis').redisInstance;
let mysqlInstance = require('../models/mysql').mysqlInstance;

let loginMidWare = function* loginMidWare(next) {
  let unicode = this.request.query.sid;
  let cid = this.request.query.cid;
  let sid = 'STR:MONKEY:SESSION:' + unicode;

  let path = this.request.path;

  let callback = this.request.query.callback;
  if (!callback) return;

  this.type = 'text/javascript';
  let startChunk = callback + '(';
  let endChunk = ');';

  if (URLConfig.noLogin.indexOf(path) > -1) {
    yield next;
  } else {
    if (!unicode) {
      this.body = startChunk + JSON.stringify({ 'code': 888, 'message': '未传sid' }) + endChunk;
      return;
    }
    var sessionInfo = yield redisInstance.getSessionInfo(sid);
    if (sessionInfo) {
      //解析uid，传递下去
      if (sessionInfo.split('@') instanceof Array) {
        this.request._uid = sessionInfo.split('@')[0];
      }

      let curRoleId = yield mysqlInstance.getRoleIdByUid(this.request._uid, cid);
      if (URLConfig.hasAdmin.indexOf(path) > -1 && curRoleId != 1) {
        this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '无操作权限' }) + endChunk;
        return;
      }

      yield next;
    } else {
      this.body = startChunk + JSON.stringify({ 'code': 3001, 'message': '未登录' }) + endChunk;
    }
  }

}


module.exports = loginMidWare;
