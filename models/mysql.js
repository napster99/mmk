var mysql = require('mysql');
var co = require('co');


var mysqlSettings = {
    port: 3306,
    host: '192.168.1.234',
    user: 'root',
    password: '123456',
    database: 'db_monkey'
}

if (process.env.APP_ENV == 'prerelease') {
    mysqlSettings = {
        port: 3306,
        host: 'rm-bp15at02275pq6sb4.mysql.rds.aliyuncs.com',
        user: 'superadmin',
        password: 'ka6aPciQ64qu',
        database: 'db_monkey'
    }
}


if (process.env.APP_ENV == 'master') { //线上
    mysqlSettings = {
        port: 3306,
        host: 'rm-bp1j90y022i6mc58m.mysql.rds.aliyuncs.com',
        user: 'node_user_monkey',
        password: 'nEudJXrrrcJniaOJ6l',
        database: 'db_monkey'
    }
}

var mysqlInstance = null;

function handleDisconnect() {
    var clientObj = mysql.createConnection(mysqlSettings);
    clientObj.connect(function(err) {
        if (err) {
            console.log('error when connecting to db:', err);
            setTimeout(function() {
                mysqlInstance = new Mysql();
            }, 2000);
        }
    });

    clientObj.on('error', function(err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            mysqlInstance = new Mysql();
        } else {
            throw err;
        }
    });

    return clientObj;
}


function Mysql() {

    var clientObj = handleDisconnect();

    //登录验证
    this.checkUserLogin = function(mobile) {
        return new Promise(function(resolve, reject) {
            var sql = 'select * from user where phone = "' + mobile + '"';
            console.log(sql);
            clientObj.query(sql, function(err, rows, fields) {
                if (!err) {
                    resolve(rows);
                }else{
                    console.log('err',err);
                }
            });
        });
    }

    //获取所有菜单列表
    this.getAuthMenuAll = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select * from menu';
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //获取权限－菜单
    this.getMenuArrs = function(roleId) {
        return new Promise((resolve, reject) => {
            var sql = 'select * from menu';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取权限－菜单 （部分）
    this.getMenuListByRoleId = function(roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'select DISTINCT(menuid) from role_menu where roleid = ' + roleid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取权限－操作
    this.getOperationArrs = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select * from operation';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取权限－操作 （部分）
    this.getOperationListByRoleId = function(roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'select role_operation.operateid , operation.route from role_operation left join operation on operation.id=role_operation.operateid where role_operation.roleid = ' + roleid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //通过uid获取role_id
    this.getRoleIdByUid = function(uid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'select roleid from role_user where userid=' + uid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows[0] && rows[0]['roleid']);
                }
            });
        });
    }

    //设置登录时间
    this.setLoginTime = function(uid) {
        var nowCtime = SQLdate_now();
        return new Promise((resolve, reject) => {
            var sql = 'update user set last_login="' + nowCtime + '" where id=' + uid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve();
                }
            });
        });
    }

    //获取rotes
    this.getRoutesByOperateId = function(operateIdArr) {
        return new Promise((resolve, reject) => {
            var sql = 'select route from operation where id in (' + operateIdArr.toString() + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //获取rotes 系统管理员
    this.getRoutesAll = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select route from operation';
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //获取地区列表
    this.getAuthArea = function(uid) {
        return new Promise(function(resolve, reject) {
            var sql = 'select region.id, region.cname from role_user left join  region on role_user.cid = region.id where role_user.userid=' + uid;
            clientObj.query(sql, function(err, rows, fields) {
                if (err) {
                    reject(err);
                } else {
                    console.log('getAuthArea', rows)
                    resolve(rows);
                }
            });
        });
    }

    //角色列表
    this.getRoleList = function(pageNow, cid, roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'select role.id , role.name, role.`desc` from role_cid left join role on role.id = role_cid.roleid where role_cid.cid=' + cid + ' and role_cid.roleid != 1 ';
            if (roleid == 1) {
                //系统管理员
                sql = 'select role.id , role.name, role.`desc` from role_cid left join role on role.id = role_cid.roleid where role_cid.cid=' + cid;
            }
            var pageSize = 20;
            var start = (pageNow - 1) * pageSize;
            var pageSql = sql + ' limit  ' + start + ' , ' + pageSize;

            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    var total_page = Math.ceil(rows.length / pageSize);
                    clientObj.query(pageSql, (err, rows, fields) => {
                        if (err) {
                            reject(err);
                        } else {
                            var obj = {
                                'rows': rows,
                                'total_page': total_page
                            }
                            resolve(obj);
                        }
                    });
                } else {
                    reject(err);
                }
            });
        });
    }

    //权限表 operation
    this.getPrivList = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select id, parent_id as pId, name from operation';
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //添加用户
    this.addUser = function(name, phone, role_id, cid) {
        var self = this;
        return co(function*() {
            //1、获取该手机号 是否已经存在userid
            var result = yield self.checkUserLogin(phone);
            if (result.length > 0) {
                var curUserId = result[0]['id'];

                //2、判断该平台账号是否已存在
                var result2 = yield self.checkUserExits(cid, curUserId);
                if (result2.length > 0) {
                    //已经存在
                    return 'exits';
                } else {
                    //不存在
                    //role_user 插入一条
                    yield self.addRoleUser(curUserId, cid, role_id);
                    return;
                }
            } else {
                //不存在
                //user 插入一条
                var insertUserId = yield self.insertUser(name, phone);
                //role_user 插入一条
                yield self.addRoleUser(insertUserId, cid, role_id);
                return;
            }
        });
    }

    //新增用户到user表
    this.insertUser = function(name, phone) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO user (name, phone) VALUES ("' + name + '","' + phone + '")';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows['insertId']);
                }
            });
        });
    }

    //判断该平台账号是否已存在
    this.checkUserExits = function(cid, userid) {
        return new Promise((resolve, reject) => {
            var sql = 'select * from role_user where cid=' + cid + ' and userid=' + userid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //添加角色
    this.addRole = function(name, desc, cid, operations) {
        if (typeof operations === 'string') {
            operations = eval('(' + operations + ')');
        }
        var self = this;
        return co(function*() {
            //1、插入角色
            var insertRoleId = yield self.insertRole(name, desc);
            if (insertRoleId) {
                //2、插入role_menu表
                var menuIdArr = operations['menu'];
                for (var i = 0; i < menuIdArr.length; i++) {
                    yield self.insertRoleMenu(insertRoleId, menuIdArr[i], cid);
                }
                //3、插入role_operation表
                var operationIdArr = operations['priv'];
                for (var i = 0; i < operationIdArr.length; i++) {
                    yield self.insertRoleOperation(insertRoleId, operationIdArr[i], cid);
                }

                //4、插入role_cid表
                yield self.insertRoleCid(insertRoleId, cid);
            }
        });
    }

    //插入role_cid
    this.insertRoleCid = function(roleid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role_cid (roleid, cid) VALUES (' + roleid + ',' + cid + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //插入role_menu 表
    this.insertRoleMenu = function(roleid, menuid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role_menu (roleid, menuid, cid) VALUES (' + roleid + ',' + menuid + ',' + cid + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows['insertId']);
                }
            });
        });
    }

    //插入role_operation表
    this.insertRoleOperation = function(roleid, operateid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role_operation (roleid, operateid, cid) VALUES (' + roleid + ',' + operateid + ',' + cid + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows['insertId']);
                }
            });
        });
    }

    //插入角色
    this.insertRole = function(name, desc) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role (name, `desc`) VALUES ("' + name + '","' + desc + '")';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows['insertId']);
                }
            });
        });
    }

    //修改用户
    this.modiUser = function(name, phone, role_id, user_id, cid) {
        var self = this;
        return co(function*() {
            //1、修改user表
            yield self.updateUser(name, phone, user_id);
            //2、获取老的role_id
            var oldRoleId = yield self.getRoleIdByUid(user_id, cid);
            if (oldRoleId != role_id) {
                //对role_id做了修改
                //3、删除 role_user 原来的数据
                yield self.delRoleUser(user_id, cid);
                //4、新增role_user 数据
                yield self.addRoleUser(user_id, cid, role_id);
            }
        });
    }

    //删除role_user
    this.delRoleUser = function(userid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role_user where userid=' + userid;
            if (cid) {
                sql = 'delete from role_user where userid=' + userid + ' and cid=' + cid;
            }
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //修改user表
    this.updateUser = function(name, phone, userid) {
        return new Promise((resolve, reject) => {
            var sql = 'update user set name="' + name + '", phone=' + phone + ' where id=' + userid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve();
                }
            });
        });
    }

    //修改角色
    this.modiRole = function(name, desc, cid, operations, role_id) {
        if (typeof operations === 'string') {
            operations = eval('(' + operations + ')');
        }
        var self = this;
        return co(function*() {
            //1、修改 角色 类  name desc
            yield self.updateRole(role_id, name, desc);

            //2、删除role_menu  role_operation 表相关联数据
            yield self.delRoleMenu(role_id, cid);
            yield self.delRoleOperation(role_id, cid);

            //3、修改role_menu 表
            var menuIdArr = operations['menu'];
            for (var i = 0; i < menuIdArr.length; i++) {
                yield self.insertRoleMenu(role_id, menuIdArr[i], cid);
            }
            //4、修改role_operation表
            var operationIdArr = operations['priv'];
            for (var i = 0; i < operationIdArr.length; i++) {
                yield self.insertRoleOperation(role_id, operationIdArr[i], cid);
            }

        });
    }

    //删除该角色下的所有数据
    this.delRoleMenu = function(roleid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role_menu where roleid=' + roleid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //删除该角色下的所有数据
    this.delRoleOperation = function(roleid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role_operation where roleid=' + roleid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //更新角色
    this.updateRole = function(roleId, name, desc) {
        return new Promise((resolve, reject) => {
            var sql = 'update role set name="' + name + '", `desc` = "' + desc + '" where id=' + roleId;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取角色信息
    this.getRoleInfo = function(roleId) {
        return new Promise((resolve, reject) => {
            var sql = 'select * from role where id=' + roleId;
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //删除角色
    this.delRole = function(roleId, cid) {
        var self = this;
        return co(function*() {
            //1、删除角色类 中的数据
            yield self.delRoleById(roleId);
            //2、删除角色相关的role_menu
            yield self.delRoleMenu(roleId, cid);
            //3、删除角色相关的role_operation
            yield self.delRoleOperation(roleId, cid);
            //4、删除角色相关的role_cid
            yield self.delRoleCidByRoleidCid(roleId, cid);
        });
    }

    this.delRoleById = function(roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role where id=' + roleid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //删除用户
    this.delUser = function(user_id) {
        var self = this;
        return co(function*() {
            //1、删除user 表数据
            yield self.delUserByUserid(user_id);

            //2、删除 role_user 表数据
            yield self.delRoleUser(user_id);
        });
    }

    //删除 user by userid
    this.delUserByUserid = function(userid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from user where id=' + userid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //禁止用户
    this.disUser = function(uid, status) {
        status = status == 1 ? 'BANNED' : 'ACTIVE';
        var sql = 'update user set status="' + status + '" where id=' + uid;
        clientObj.query(sql, (err, rows, fields) => {})
    }

    //通过cid获取角色
    this.getRoleByCid = function(cid, roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'select role.id, role.name from role_cid left join role on role.id=role_cid.roleid where role_cid.cid=' + cid + ' and role.id != 1';
            if (roleid == 1) {
                sql = 'select role.id, role.name from role_cid left join role on role.id=role_cid.roleid where role_cid.cid=' + cid;
            }
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                } else {
                    reject();
                }
            });
        });
    }

    //通过角色获取所在的cid
    this.getCidByRoleId = function(roleId, callback) {
        var sql = 'select DISTINCT(cid) from role where id=' + roleId;
        clientObj.query(sql, (err, rows, fields) => {
            callback(rows);
        });
    }

    //用户列表 某个平台下的用户
    this.getUserList = function(cid, nickname, roleId) {
        return new Promise((resolve, reject) => {
            var sql = 'select * , user.name as username, role.name as rolename from role_user left join user on user.id=role_user.userid left join role on role_user.roleid = role.id where role_user.cid=' + cid + ' and role.id != 1 ';
            if (roleId == 1) {
                sql = 'select * , user.name as username, role.name as rolename from role_user left join user on user.id=role_user.userid left join role on role_user.roleid = role.id where role_user.cid=' + cid;
            }

            if (nickname) {
                sql += ' and user.name="' + nickname + '"';
            }
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取用户信息
    this.getUserInfo = function(user_id, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'select role_user.roleid as role, user.name, user.phone from role_user left join user on user.id=role_user.userid where role_user.userid=' + user_id + ' and role_user.cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //新增菜单
    this.addMenu = function(name, sref, icon_class, parent_id) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO menu (name, sref, icon_class, parent_id) VALUES ("' + name + '", "' + sref + '", "' + icon_class + '", ' + parent_id + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

    }

    //修改菜单
    this.modMenu = function(id, name, sref, icon_class, parent_id) {
        var sql = 'update menu set name="' + name + '", sref="' + sref + '", icon_class="' + icon_class + '" , parent_id=' + parent_id + ' where id=' + id;
        clientObj.query(sql, (err, rows, fields) => {});
    }

    //删除菜单
    this.delMenuById = function(id) {
        var self = this;
        return co(function*() {
            //1、删除 菜单表 menu
            yield self.delMenu(id);

            // 2、删除菜单相关的role_menu
            yield self.delRoleMenuByMenuid(id);

        });
    }

    //删除菜单 menu
    this.delMenu = function(id) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from menu where id=' + id;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //删除role_menu by menuid
    this.delRoleMenuByMenuid = function(menuid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role_menu where menuid=' + menuid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取菜单信息
    this.getMenuInfoById = function(id) {
        return new Promise((resolve, reject) => {
            var sql = 'select * from menu where id=' + id;
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(rows);
                }
            });
        });
    }

    //菜单列表
    this.getMenuList = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select * from menu';
            clientObj.query(sql, (err, rows, fields) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }


    //同步操作表
    this.operateUpdate = function(data) {
        var self = this;

        co(function*() {
            for (var i = 0; i < data.length; i++) {
                var curObj = data[i];
                for (var j in curObj) {

                    var curListArr = curObj[j];
                    var result = yield self.getRowByName(j);
                    if (result.length > 0) {
                        //父存在
                        var pid = result[0]['id'];

                        yield self.updateName(pid, { 'name': j });
                        for (var z = 0; z < curListArr.length; z++) {
                            curListArr[z]['pid'] = pid;
                            var curRoute = curListArr[z]['route'];
                            var result2 = yield self.getRowByRoute(curRoute);
                            if (result2.length > 0) {
                                //子存在
                                var id = result2[0]['id'];
                                yield self.updateName(id, curListArr[z]);
                            } else {
                                //子新增
                                yield self.insertOperation(curListArr[z]);
                            }
                        }
                    } else {
                        //父新增
                        var result3 = yield self.insertOperation({
                            'name': j,
                            'route': '',
                            'pid': 0
                        });
                        var pid = result3['insertId'];
                        for (var z = 0; z < curListArr.length; z++) {
                            curListArr[z]['pid'] = pid;
                            var curRoute = curListArr[z]['route'];
                            var result2 = yield self.getRowByRoute(curRoute);
                            if (result2.length > 0) {
                                //子存在
                                var id = result2[0]['id'];
                                yield self.updateName(id, curListArr[z]);
                            } else {
                                //子新增
                                yield self.insertOperation(curListArr[z]);
                            }
                        }
                    }
                }
            }
        });

    }

    //操作－根据name查询
    this.getRowByName = function(name) {
        return new Promise((resolve, reject) => {
            var sql = 'select id from operation where name="' + name + '"';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //操作－根据route查询
    this.getRowByRoute = function(route) {
        return new Promise((resolve, reject) => {
            var sql = 'select id from operation where route="' + route + '"';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //操作－更新
    this.updateName = function(id, data) {
        return new Promise((resolve, reject) => {
            var sql = 'update operation set name="' + (data['name'] || '') + '", route="' + (data['route'] || '') + '" , parent_id=' + (data['pid'] || 0) + ' where id=' + id;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //操作－新增
    this.insertOperation = function(data) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO operation (name, route, parent_id) VALUES ("' + data['name'] + '", "' + data['route'] + '", ' + data['pid'] + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //同步role_user表 新增地区 同步地区
    this.updateRoleUser = function() {
        var self = this;
        return co(function*() {
            var result = yield self.getAllCids();
            var cidsArr = [];
            for (var i of result) {
                cidsArr.push(i['id']);
            }
            var adminArrs = yield self.getAdmins();
            if (adminArrs.length > 0) {
                //存在系统管理员
                for (var j = 0; j < adminArrs.length; j++) {
                    var curUserId = adminArrs[j]['userid'];
                    for (var z = 0; z < cidsArr.length; z++) {
                        var result3 = yield self.getIDByCondition(curUserId, cidsArr[z]);
                        if (result3.length === 0) {
                            //不存在，则添加
                            yield self.addRoleUser(curUserId, cidsArr[z], 1);
                        }
                    }
                }
            }
        });
    }

    //同步role_cid表 新增地区
    this.updateRoleCid = function() {
        var self = this;
        return co(function*() {
            //1、获取所有地区
            var result = yield self.getAllCids();
            var cidsArr = [];
            for (var i of result) {
                cidsArr.push(i['id']);
            }
            //2、删除role_cid 系统管理员
            yield self.delRoleCidByRoleid(1);
            //3、新增所有地区role_cid 系统管理员
            for (var i = 0; i < cidsArr.length; i++) {
                yield self.insertRoleCid(1, cidsArr[i]);
            }
        });
    }

    this.delRoleCidByRoleid = function(roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role_cid where roleid=' + roleid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    this.delRoleCidByRoleidCid = function(roleid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'delete from role_cid where roleid=' + roleid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取所有地区
    this.getAllCids = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select * from region';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //新增地区
    this.addRegion = function(cname) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO region (cname) VALUES ("' + cname + '")';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows['insertId']);
                }
            });
        });
    }

    //修改地区
    this.modRegion = function(cname, id) {
        return new Promise((resolve, reject) => {
            var sql = 'update region set cname="' + cname + '" where id=' + id;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取系统管理员
    this.getAdmins = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select DISTINCT(userid) from role_user where roleid=1';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //系统管理员获取是否存在 返回id
    this.getIDByCondition = function(userid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'select id from role_user where roleid=1 and userid=' + userid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //新增role_user
    this.addRoleUser = function(userid, cid, roleid) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role_user (userid, roleid, cid) VALUES (' + userid + ', ' + roleid + ', ' + cid + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //同步role_menu表 新增地区   新增菜单
    this.updateRoleMenu = function() {
        var self = this;
        return co(function*() {
            //  1-获取地区ID  2-获取菜单ID
            var result = yield self.getAllCids();
            var cidsArr = [];
            for (var i of result) {
                cidsArr.push(i['id']);
            }

            var result2 = yield self.getAllMenuids();
            var menuIdArr = [];
            for (var i of result2) {
                menuIdArr.push(i['id']);
            }

            for (var i = 0; i < cidsArr.length; i++) {
                var curCid = cidsArr[i];
                for (var j = 0; j < menuIdArr.length; j++) {
                    var curMenuId = menuIdArr[j];
                    var result4 = yield self.getIDRoleMenu(curMenuId, curCid);
                    if (result4.length === 0) {
                        //不存在  新增一条
                        yield self.addRoleMenuForAdmin(curMenuId, curCid);
                    }
                }
            }
        });
    }

    //获取所有菜单id
    this.getAllMenuids = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select * from menu';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //获取所有菜单id
    this.getAllOperationids = function() {
        return new Promise((resolve, reject) => {
            var sql = 'select * from operation';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //通过role_menu 是否存在
    this.getIDRoleMenu = function(menuid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'select id from role_menu where roleid=1 and menuid=' + menuid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }


    //通过role_operation 是否存在
    this.getIDRoleOperation = function(operateid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'select id from role_operation where roleid=1 and operateid=' + operateid + ' and cid=' + cid;
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }


    //系统管理员 role_operation 添加
    this.addRoleOperationForAdmin = function(operateid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role_operation (roleid, operateid, cid) VALUES (1, ' + operateid + ', ' + cid + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }


    //系统管理员 role_menu 添加
    this.addRoleMenuForAdmin = function(menuid, cid) {
        return new Promise((resolve, reject) => {
            var sql = 'INSERT INTO role_menu (roleid, menuid, cid) VALUES (1, ' + menuid + ', ' + cid + ')';
            clientObj.query(sql, (err, rows, fields) => {
                if (!err) {
                    resolve(rows);
                }
            });
        });
    }

    //同步role_operation表 新增地区   新增操作项
    this.updateRoleOperation = function() {
        var self = this;
        return co(function*() {
            //  1-获取地区ID  2-获取操作ID
            var result = yield self.getAllCids();
            var cidsArr = [];
            for (var i of result) {
                cidsArr.push(i['id']);
            }

            var result2 = yield self.getAllOperationids();
            var operationIdArr = [];
            for (var i of result2) {
                operationIdArr.push(i['id']);
            }

            for (var i = 0; i < cidsArr.length; i++) {
                var curCid = cidsArr[i];
                for (var j = 0; j < operationIdArr.length; j++) {
                    var curOperateId = operationIdArr[j];
                    var result4 = yield self.getIDRoleOperation(curOperateId, curCid);
                    if (result4.length === 0) {
                        //不存在  新增一条
                        yield self.addRoleOperationForAdmin(curOperateId, curCid);
                    }
                }
            }
        });
    }

}


function SQLdate_now() {
    /* MySQL format */
    var d = new Date();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = d.getHours();
    var minute = d.getMinutes();
    var second = d.getSeconds();
    var output = d.getFullYear() + '-' +
        (('' + month).length < 2 ? '0' : '') + month + '-' +
        (('' + day).length < 2 ? '0' : '') + day + ' ' +
        (('' + hour).length < 2 ? '0' : '') + hour + ':' +
        (('' + minute).length < 2 ? '0' : '') + minute + ':' +
        (('' + second).length < 2 ? '0' : '') + second;
    return (output);
};



mysqlInstance = new Mysql();

module.exports.mysqlInstance = mysqlInstance;
