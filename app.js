'use strict';

const koa          = require('koa');
const gzip         = require('koa-gzip');//gzip压缩
// const staticCache = require('koa-static-cache');//在响应中添加对静态文件缓存的header
// const json = require('koa-json');//返回json格式的响应

// const staticServer = require('koa-static');
const bodyParser   = require('koa-bodyparser');//解析请求参数
const path         = require('path');
const app          = koa();

const loginMidWare               = require('./middlewares/loginMidWare');
const exceptionHandleMidWare     = require('./middlewares/exceptionHandleMidWare');


const loginRouter  = require('./routes/loginRouter');
const authRouter   = require('./routes/authRouter');
const roleRouter  = require('./routes/roleRouter');
const userRouter  = require('./routes/userRouter');


app.use(bodyParser());
app.use(gzip());
// app.use(jsonp());

//处理静态资源文件夹
// app.use(staticServer(path.join(__dirname, 'public')));

//++++++++++++++++++++中间件+++++++++++++++++++++++++

//异常处理中间件
app.use(exceptionHandleMidWare)

//判断是否登录
app.use(loginMidWare);

//++++++++++++++++++++中间件+++++++++++++++++++++++++


//++++++登录、登出类+++++++
for(const i in loginRouter) {
  app.use(loginRouter[i]);
}
//++++++登录、登出类+++++++

//++++++权限类+++++++
for(const i in authRouter) {
  app.use(authRouter[i]);
}
//++++++权限类+++++++

//++++++角色类+++++++
for(const i in roleRouter) {
  app.use(roleRouter[i]);
}
//++++++角色类+++++++

//++++++用户类+++++++
for(const i in userRouter) {
  app.use(userRouter[i]);
}
//++++++用户类+++++++


app.listen(process.env.PORT || 3111);
console.log('listening on port 3111');

module.exports = app;




