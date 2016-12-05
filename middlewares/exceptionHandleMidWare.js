'use strict';


let count = 1;

//异常处理
function* exceptionHandleMidWare(next) {
  try{
    console.log('第',count,'个接口');
    count++;
    yield next;
  }catch(err){
    this.status = 500;
    this.body = err.message;
  }
}

module.exports = exceptionHandleMidWare;
