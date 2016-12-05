'use strict';
var request = require('superagent');
var http = require('http')


 request
   .get('http://localhost:3000/users/jsonp')
   .set('Accept', 'application/json')
   .end(function(err, res){
     if (res.ok) {
       console.log('yay got ' + JSON.stringify(res.body));
     } else {
       console.log('Oh no! error ' + res.text);
     }
   });