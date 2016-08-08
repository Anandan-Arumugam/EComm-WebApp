var express = require("express");
var bodyParser = require('body-parser');
var raccoon = require('raccoon');

raccoon.connect(6379, '127.0.0.1');
var app = express();

app.post('/recommend',function(req,res){
	raccoon.liked('Anandan', 'Arumugam');
	raccoon.liked('Anandan','Umarani');
	raccoon.liked('Anand', 'Aru');	
})
app.post('/recommendation',function(req,res){
	raccoon.recommendFor('Anandan', 10, function(results){
  	res.send(results)
});
})

app.listen(3004);