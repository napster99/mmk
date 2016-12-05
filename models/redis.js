var redis = require('redis');

var defaultProps = {
    port: 6379,
    host: '192.168.1.234',
    opts: {}
}

var redisSettings = {}

if (process.env.APP_ENV == 'prerelease') {
    redisSettings = {
        'Session': {
            host: 'edd7699ef7b847ed.m.cnhza.kvstore.aliyuncs.com',
            port: 6379,
            auth: 'edd7699ef7b847ed:Zx135246',
            opts: {}
        },
        'Storage': {
            host: 'edd7699ef7b847ed.m.cnhza.kvstore.aliyuncs.com',
            port: 6379,
            auth: 'edd7699ef7b847ed:Zx135246',
            opts: {}
        }
    }
}


if (process.env.APP_ENV == 'master') { //线上
    redisSettings = {
        'Session': {
            host: '10.25.170.19',
            port: 6382,
            opts: {}
        },
        'Storage': {
            host: '10.25.170.19',
            port: 6380,
            opts: {}
        }
    }
}


function Redis(options) {

    var redisConnect = false;
    if (process.env.APP_ENV == 'local' || !process.env.APP_ENV) {
        this.options = Object.assign(defaultProps, options);

        var client = this.initRedis();
        client.on('connect', function() {
            redisConnect = true;
        });
    } else {
        var clientObj = this.initRedis();
        for (var i in clientObj) {
            clientObj[i].on('connect', function() {
                redisConnect = true;
            });
            if (process.env.APP_ENV == 'prerelease') {
                clientObj[i].auth(redisSettings[i]['auth'], function(err, res) {});
            }
        }
        this.clientObj = clientObj;
    }

    var sessionClient = null;
    var storageClient = null;

    if (process.env.APP_ENV == 'local' || !process.env.APP_ENV) {
        sessionClient = client;
        storageClient = client;
    } else {
        sessionClient = this.clientObj['Session'];
        storageClient = this.clientObj['Storage'];
    }


    this.getUnicode = function() {
        var chars = "0123456789abcdefghijklmnopqrstuvwxyz";
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

    //设置session
    this.setSessionToRedis = function(uid, mobile) {
        return new Promise((resolve, reject) => {
            var thisUnicode = this.getUnicode();
            var theKey = 'STR:MONKEY:SESSION:' + thisUnicode,
                theValue = uid + '@' + mobile + '@' + parseInt((+new Date()) / 1000);
            sessionClient.set(theKey, theValue);
            console.log(theKey, theValue)
            sessionClient.expire(theKey, 60 * 60 * 24 * 10); //10天有效期

            resolve(thisUnicode);
        })
    }

    //获取session
    this.getSessionInfo = function(sid) {
        return new Promise(function(resolve, reject) {
            if (!sid) {
                reject();
            }
            sessionClient.get(sid, function(err, data) {
                if (err) {
                    reject();
                } else {
                    resolve(data);
                }
            });
        });
    }

    //删除session
    this.clearSessionInfo = function(sid) {
        sessionClient.del('STR:MONKEY:SESSION:' + sid, function(err, data) {
            console.log(err, data)
        });
    }

    //添加渠道信息
    this.addRegion = function(cid) {
        return new Promise((resolve, reject) => {
            storageClient.sadd('SET:APP:CID', cid, function(err, res) {
                if (!err) {
                    resolve();
                }
            });
        })
    }

}

Redis.prototype.initRedis = function() {
    return this.createClient();
}



Redis.prototype.createClient = function() {
    if (process.env.APP_ENV == 'local' || !process.env.APP_ENV) {
        return this.client = redis.createClient(
            this.options['port'], this.options['host'], this.options['opts']);
    } else {
        var redisObj = {};
        for (var i in redisSettings) {
            redisObj[i] = redis.createClient(
                redisSettings[i]['port'], redisSettings[i]['host'], redisSettings[i]['opts']);
        }

        return redisObj;
    }
}

var redisInstance = new Redis();

module.exports.redisInstance = redisInstance;
