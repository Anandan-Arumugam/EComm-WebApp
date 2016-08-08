var http    = require("http");
var express = require("express");
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

app.post('/check', function(req,res){
	var json = JSON.parse('[{"name":"Anandan"},{"name":"Anand"}]');
	console.log(json[0]["name"])
	res.send(json[0]["name"])
})

app.listen(3003);