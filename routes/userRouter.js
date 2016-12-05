'use strict';

let router = require('koa-route');

let mysqlInstance = require('../models/mysql').mysqlInstance;

// 用户管理列表 http://localhost:3111/main/user/list?f=json&callback=angular.callbacks._b&sid=2365s33e&name=name11&user_id=358&cid=1
let getUserList = router.get('/main/user/list', function* getUserList() {
  // let page = this.request.query.page || 1;
  let cid = this.request.query.cid;
  let uid = this.request._uid;

  let callback = this.request.query.callback;

  let nickname = this.request.query.name; //搜索 用户名

  let startChunk = callback + '(';
  let endChunk = ');';

  if (!cid) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': 'cid不能为空!' }) + endChunk;
    return;
  }

  let roleId = yield mysqlInstance.getRoleIdByUid(uid, cid);

  let result = yield mysqlInstance.getUserList(cid, nickname, roleId);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'list': result }) + endChunk;
});

// 添加用户 http://localhost:3111/main/user/add?f=json&callback=angular.callbacks._b&sid=2365s33e&phone=13311111111&cid=1&role=69197454&name=name11&user_id=358
let addUser = router.get('/main/user/add', function* addUser() {
  console.log('/main/user/add')
  let user_id = this.request.query.user_id; //修改
  let cid = this.request.query.cid;
  let name = this.request.query.name;
  let phone = this.request.query.phone;
  let uid = this.request._uid;
  let role_id = this.request.query.role;
  let callback = this.request.query.callback;

  let startChunk = callback + '(';
  let endChunk = ');';

  if (!name || !phone || !role_id || !cid) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '参数不全' }) + endChunk;
    return;
  }
  //获取当前角色ID
  let curRoleId = yield mysqlInstance.getRoleIdByUid(uid, cid);
  console.log('curRoleId', curRoleId)
  if(curRoleId != 1 && role_id == 1) {
    this.body = startChunk + JSON.stringify({ 'code': 2, 'message': '无权限赋予系统管理员角色' }) + endChunk;
    return;
  }
  if (user_id) {
    yield mysqlInstance.modiUser(name, phone, role_id, user_id, cid);

    if(role_id == 1) {
      //role_user 表
      yield mysqlInstance.updateRoleUser();
      //role_menu 表
      yield mysqlInstance.updateRoleMenu();
      //role_operation 表
      yield mysqlInstance.updateRoleOperation();
      //role_cid 表
      yield mysqlInstance.updateRoleCid();
    }

    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '修改成功' }) + endChunk;
  } else {
    let result = yield mysqlInstance.addUser(name, phone, role_id, cid);

    if (result === 'exits') {
      this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '用户已存在' }) + endChunk;
    } else {
      //如果添加的角色是系统管理员 同步管理员接口
      if (role_id == 1) {
        //role_user 表
        yield mysqlInstance.updateRoleUser();
        //role_menu 表
        yield mysqlInstance.updateRoleMenu();
        //role_operation 表
        yield mysqlInstance.updateRoleOperation();
        //role_cid 表
        yield mysqlInstance.updateRoleCid();
      }
      this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '添加成功' }) + endChunk;
    }
  }

});

// 获取用户信息 http://localhost:3111/main/user/info?f=json&callback=angular.callbacks._b&sid=2365s33e&name=name11&user_id=358&cid=1
let getUserInfo = router.get('/main/user/info', function* getUserInfo() {
  let user_id = this.request.query.user_id;
  let cid = this.request.query.cid;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  if (!cid) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': 'cid不能为空!' }) + endChunk;
    return;
  }

  let result = yield mysqlInstance.getUserInfo(user_id, cid);
  this.body = startChunk + JSON.stringify({
    'code': 0,
    'user': {
      'name': result[0]['name'],
      'phone': result[0]['phone'],
      'role': result[0]['role']
    }
  }) + endChunk;

});

// 获取角色列表信息 http://localhost:3111/main/user/role_list?f=json&callback=angular.callbacks._b&sid=2365s33e&name=name11&user_id=358&cid=1
let getUserRoleList = router.get('/main/user/role_list', function* getUserRoleList() {
  let cid = this.request.query.cid;
  let callback = this.request.query.callback;
  let uid = this.request._uid;
  let startChunk = callback + '(';
  let endChunk = ');';

  if (!cid) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': 'cid不能为空!' }) + endChunk;
    return;
  }


  let roleId = yield mysqlInstance.getRoleIdByUid(uid, cid);

  //1、返回该平台下的全部角色
  let result = yield mysqlInstance.getRoleByCid(cid, roleId);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'list': result }) + endChunk;

});

// 删除用户
let delUser = router.get('/main/user/delete', function* delUser() {
  let user_id = this.request.query.user_id;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  if (!user_id) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '请上传用户user_id' }) + endChunk;
    return;
  }

  yield mysqlInstance.delUser(user_id);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '删除成功!' }) + endChunk;
});

// 禁止用户 TODO
let disUser = router.get('/main/user/banned', function* disUser() {
  let uid = this.request.query.user_id;
  let is_banned = this.request.query.is_banned || 0;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  let role_id = mysqlInstance.getRoleIdByUid(uid);
  if (role_id == 9999) {
    this.body = startChunk + JSON.stringify({ 'code': 5, 'message': '无法禁用系统管理账号' }) + endChunk;
    return;
  }

  mysqlInstance.disUser(uid, is_banned);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '操作成功!' }) + endChunk;
});


module.exports = {
  getUserList: getUserList,
  addUser: addUser,
  getUserInfo: getUserInfo,
  delUser: delUser,
  disUser: disUser,
  getUserRoleList: getUserRoleList
};
