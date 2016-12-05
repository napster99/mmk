'use strict';

let router = require('koa-route');
let request = require('request');
//这个允许我们解析原生请求对象来获取请求内容
// let parse      = require('co-body');
// let _          = require('underscore');

let mysqlInstance = require('../models/mysql').mysqlInstance;
let redisInstance = require('../models/redis').redisInstance;

// 获取菜单
let getAuthMenu = router.get('/main/auth/info', function* checkAuth() {
    let uid = this.request._uid;
    let cid = this.request.query.cid;

    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    let lastObj = {
        'menu': {},
        'priv': []
    }
    let curRoleId = yield mysqlInstance.getRoleIdByUid(uid, cid);
    //菜单
    let resultMenuAll = yield mysqlInstance.getAuthMenuAll(),
        allMap = {};
    for (let el of resultMenuAll) {
        allMap[el['id']] = { 'name': el['name'], 'id': el['id'], 'pId': el['parent_id'], 'icon': el['icon_class'], 'ui_sref': el['sref'] }
    }

    let result = yield mysqlInstance.getMenuListByRoleId(curRoleId),
        curMenuidsArr = [],
        curMenuMap = {};

    for (let i = 0; i < result.length; i++) {
        //第一层
        let curPid = allMap[result[i]['menuid']]['pId'];
        if (curPid === 0) {
            let curId = allMap[result[i]['menuid']]['id'];
            lastObj['menu'][curId] = {
                'name': allMap[result[i]['menuid']]['name'],
                'id': curId,
                'data': []
            }
        } else {
            curMenuidsArr.push(result[i]['menuid']);
        }
    }

    //第二层
    var secondMenuidsArr = [];

    for (let i = 0; i < curMenuidsArr.length; i++) {
        var curPid = allMap[curMenuidsArr[i]]['pId'];
        if (lastObj['menu'][curPid] && (lastObj['menu'][curPid]['data'] instanceof Array)) {
            lastObj['menu'][curPid]['data'].push(allMap[curMenuidsArr[i]]);
        } else {
            secondMenuidsArr.push(curMenuidsArr[i])
        }
    }

    //第三层
    for (let i = 0; i < secondMenuidsArr.length; i++) {
        var curPid = allMap[secondMenuidsArr[i]]['pId'];
        var ppid = allMap[curPid]['pId'];
        var parentDataArr = lastObj['menu'][ppid] && lastObj['menu'][ppid]['data'] || [];

        for (let j = 0; j < parentDataArr.length; j++) {
            if (curPid == parentDataArr[j]['id']) {
                if (!parentDataArr[j]['child']) {
                    parentDataArr[j]['child'] = [];
                }
                parentDataArr[j]['child'].push(allMap[secondMenuidsArr[i]])
            }
        }
    }


    //权限
    let result4 = yield mysqlInstance.getOperationListByRoleId(curRoleId),
        curOperationHasArr = [];
    for (let i = 0; i < result4.length; i++) {
        curOperationHasArr.push(result4[i]['route']);
    }
    lastObj['priv'] = curOperationHasArr;


    this.body = startChunk + JSON.stringify({ 'code': 0, 'data': lastObj }) + endChunk;
});

// 菜单列表
let menuList = router.get('/main/menu/list', function* menuList() {
    let uid = this.request._uid;
    let callback = this.request.query.callback;

    // let roleId = yield mysqlInstance.getRoleIdByUid(uid);

    let startChunk = callback + '(';
    let endChunk = ');';
    let result = yield mysqlInstance.getMenuList();
    this.body = startChunk + JSON.stringify({ 'code': 0, 'list': result }) + endChunk;
});

// 菜单添加
let menuAdd = router.get('/main/menu/add', function* menuAdd() {
    let id = this.request.query.id; //修改

    let name = this.request.query.name;
    let sref = this.request.query.sref;
    let icon_class = this.request.query.icon_class;
    let parent_id = this.request.query.parent_id;

    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    if (id) {
        // 修改
        mysqlInstance.modMenu(id, name, sref, icon_class, parent_id);
        this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '修改成功' }) + endChunk;
    } else {

        // 新增
        yield mysqlInstance.addMenu(name, sref, icon_class, parent_id);

        //同步管理员
        yield mysqlInstance.addRegion(cname);

        //role_user 表
        yield mysqlInstance.updateRoleUser();

        //role_menu 表
        yield mysqlInstance.updateRoleMenu();

        //role_operation 表
        yield mysqlInstance.updateRoleOperation();

        //role_cid 表
        yield mysqlInstance.updateRoleCid();


        
        this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '添加成功' }) + endChunk;
    }

});

// 获取菜单信息
let menuInfo = router.get('/main/menu/info', function* menuInfo() {
    let id = this.request.query.id;
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    if (!id) {
        this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '参数不全' }) + endChunk;
        return;
    }

    var result = yield mysqlInstance.getMenuInfoById(id);
    this.body = startChunk + JSON.stringify({ 'code': 0, 'data': result }) + endChunk;
});

// 菜单删除
let menuDel = router.get('/main/menu/delete', function* menuDel() {
    let id = this.request.query.id;
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    if (!id) {
        this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '参数不全' }) + endChunk;
        return;
    }

    yield mysqlInstance.delMenuById(id);

    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '删除成功' }) + endChunk;
});


// 操作同步
let operateUpdate = router.get('/main/operate/update', function* operateUpdate() {
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    request.get('http://api.monkey.dev.shanggou.la/proxy/operation?debug', (err, httpResponse, body) => {
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        if (!err && body['code'] == 0) {
            mysqlInstance.operateUpdate(body['data']['list']);
        }

    });

    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '同步成功' }) + endChunk;
});

//渠道列表
let getRegionList = router.get('/main/region/list', function* getRegionList() {
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    let result = yield mysqlInstance.getAllCids();

    this.body = startChunk + JSON.stringify({ 'code': 0, 'list': result }) + endChunk;
});

//新增渠道
let addRegion = router.get('/main/region/add', function* addRegion() {
    let cname = this.request.query.cname;
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    if (!cname) {
        this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '参数不全' }) + endChunk;
        return;
    }

    let cid = yield mysqlInstance.addRegion(cname);

    //role_user 表
    yield mysqlInstance.updateRoleUser();

    //role_menu 表
    yield mysqlInstance.updateRoleMenu();

    //role_operation 表
    yield mysqlInstance.updateRoleOperation();

    //role_cid 表
    yield mysqlInstance.updateRoleCid();

    yield redisInstance.addRegion(cid);

    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '添加成功' }) + endChunk;

});

//修改渠道
let modRegion = router.get('/main/region/mod', function* modRegion() {
    let id = this.request.query.id;
    let cname = this.request.query.cname;
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    if (!cname || !id) {
        this.body = startChunk + JSON.stringify({ 'code': 1, 'message': '参数不全' }) + endChunk;
        return;
    }

    yield mysqlInstance.modRegion(cname, id);

    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '添加成功' }) + endChunk;
});


//同步系统管理员
let adminUpdate = router.get('/main/admin/update', function* adminUpdate() {
    let callback = this.request.query.callback;
    let startChunk = callback + '(';
    let endChunk = ');';

    //role_user 表
    yield mysqlInstance.updateRoleUser();

    //role_menu 表
    yield mysqlInstance.updateRoleMenu();

    //role_operation 表
    yield mysqlInstance.updateRoleOperation();

    //role_cid 表
    yield mysqlInstance.updateRoleCid();

    this.body = startChunk + JSON.stringify({ 'code': 0, 'message': '同步成功' }) + endChunk;

});

module.exports = {
    getAuthMenu: getAuthMenu,
    menuAdd: menuAdd,
    menuInfo: menuInfo,
    menuDel: menuDel,
    menuList: menuList,
    operateUpdate: operateUpdate,
    adminUpdate: adminUpdate,
    getRegionList: getRegionList,
    addRegion: addRegion,
    modRegion: modRegion
};
