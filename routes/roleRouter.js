'use strict';

let router = require('koa-route');

let mysqlInstance = require('../models/mysql').mysqlInstance;

// 角色管理列表 某个平台下的角色列表
let getRoleList = router.get('/main/role/list', function* getRoleList() {
  let page = this.request.query.page || 1;
  let cid = this.request.query.cid;
  let uid = this.request._uid;
  let callback = this.request.query.callback;

  let startChunk = callback + '(';
  let endChunk = ');';

  if(!cid) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': 'cid不能为空!' }) + endChunk;
    return;
  }

  let roleId = yield mysqlInstance.getRoleIdByUid(uid, cid);

  let result = yield mysqlInstance.getRoleList(page, cid, roleId);

  this.body = startChunk + JSON.stringify({ 'code': 0, 'list': result['rows'], 'total_page': result['total_page'] }) + endChunk;
});

// 获取权限树 2365s33e
let getPrivList = router.get('/main/role/priv_list', function* getPrivList() {
  let role_id = this.request.query.role_id;
  let cid = this.request.query.cid;
  let uid = this.request._uid;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  let lastResult = {
    'menu' : {},
    'priv' : {}
  };
  // 4k762358
  //菜单类
  let result = yield mysqlInstance.getMenuArrs(), menuObjAll = {};

  //操作类
  let result2 = yield mysqlInstance.getOperationArrs(), operationObjAll = {};

  for(let i =0; i<result.length; i++) {
    if(!menuObjAll[result[i]['id']]) {
      menuObjAll[result[i]['id']] = {
        'id'   : result[i]['id'],
        'name' : result[i]['name'],
        'pid'  : result[i]['parent_id'],
        'checked' : false
      }
    }
  }
  
  for(let i =0; i<result2.length; i++) {
    if(!operationObjAll[result2[i]['id']]) {
      operationObjAll[result2[i]['id']] = {
        'id'   : result2[i]['id'],
        'name' : result2[i]['name'],
        'pid'  : result2[i]['parent_id'],
        'checked' : false
      }
    }
  }

  if(role_id) {
    //菜单类
    let result3 = yield mysqlInstance.getMenuListByRoleId(role_id), curMenuHasArr = [], curMenuObj = {};
    for(let i=0; i<result3.length; i++) {
      curMenuHasArr.push(result3[i]['menuid']);
    }
    for(let i in menuObjAll) {
      curMenuObj[i] = menuObjAll[i];
      if(curMenuHasArr.indexOf(Number(i)) > -1) {
        curMenuObj[i]['checked'] = true;
      }
    }
    //操作类
    let result4 = yield mysqlInstance.getOperationListByRoleId(role_id), curOperationHasArr = [], curOperationObj = {};
    for(let i=0; i<result4.length; i++) {
      curOperationHasArr.push(result4[i]['operateid']);
    }
    for(let i in operationObjAll) {
      curOperationObj[i] = operationObjAll[i];
      if(curOperationHasArr.indexOf(Number(i)) > -1) {
        curOperationObj[i]['checked'] = true;
      }
    }
    
    lastResult['menu'] = curMenuObj;
    lastResult['priv'] = curOperationObj;
  }else{
    lastResult['menu'] = menuObjAll;
    lastResult['priv'] = operationObjAll;
  }
  
  this.body = startChunk + JSON.stringify({ 'code': 0, 'data': lastResult }) + endChunk;
});

// 获取地区列表
let getRegion = router.get('/main/role/region', function* getRegion() {
  let callback = this.request.query.callback;
  let uid = this.request._uid;

  let startChunk = callback + '(';
  let endChunk = ');';

  let result = yield mysqlInstance.getAuthArea(uid);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'data': result }) + endChunk;
});

// 添加角色
let addRole = router.get('/main/role/add', function* addRole() {
  let role_id = this.request.query.role_id; //修改
  let name = this.request.query.name;
  let cid = this.request.query.cid;
  let uid = this.request._uid;
  let desc = this.request.query.desc;
  let callback = this.request.query.callback;
  let operations = this.request.query.operations;

  // operations={menu:[77,78],priv:[510,511,512]}
  let curRoleId = yield mysqlInstance.getRoleIdByUid(uid, cid);

  let startChunk = callback + '(';
  let endChunk = ');';

  if (!name || !cid || !operations) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '参数不全' }) + endChunk;
    return;
  }

  if(role_id == 1 && curRoleId != 1) {
    this.body = startChunk + JSON.stringify({ 'code': 2, 'message': '无法修改系统管理员' }) + endChunk;
    return;
  }

  //系统管理员不让修改
  if (role_id) {
    yield mysqlInstance.modiRole(name, desc, cid, operations, role_id);
    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '修改成功' }) + endChunk;
  } else {
    yield mysqlInstance.addRole(name, desc, cid, operations);
    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '添加成功' }) + endChunk;
  }

});

// 获取角色信息
let getRoleInfo = router.get('/main/role/get', function* getRoleInfo() {
  let id = this.request.query.id;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  if (!id) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '请上传角色id' }) + endChunk;
    return;
  }

  let result = yield mysqlInstance.getRoleInfo(id);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'data': result[0] }) + endChunk;
});

// 删除角色
let delRole = router.get('/main/role/delete', function* delRole() {
  let id = this.request.query.id;
  let cid = this.request.query.cid;
  let callback = this.request.query.callback;
  let startChunk = callback + '(';
  let endChunk = ');';

  if (!id || !cid) {
    this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '请上传角色id或cid' }) + endChunk;
    return;
  }

  if (id == 1) {
    this.body = startChunk + JSON.stringify({ 'code': 2, 'message': '不能删除系统管理员角色' }) + endChunk;
    return;
  }

  yield mysqlInstance.delRole(id, cid);
  this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '删除成功!' }) + endChunk;
});


module.exports = {
  getRoleList: getRoleList,
  getPrivList: getPrivList,
  addRole: addRole,
  getRoleInfo: getRoleInfo,
  delRole: delRole,
  getRegion: getRegion
};
