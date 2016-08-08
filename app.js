var http    = require("http");
var express = require("express");
var redis   = require("redis");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var client  = redis.createClient();
var app = express(); 	
var RedisStore = require('connect-redis')(session);

//app.use(expressSession({ store: new RedisStore }));
app.use(cookieParser());
app.use(session({ 
  cookieName:'EDISSSession',
  secret: 'EDISS', 
  store: new RedisStore({
  	host:'localhost',
  	port:6379,
  	prefix:'sess',
  	client:client,
  	ttl :  260
	}),
  saveUninitialized: false,
  resave: false
}));

app.use(bodyParser());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: false}));
/*
var mysql      = require('mysql');
var pool = mysql.createPool({
 	connectionLimit : 1000, //important
    host     : 'localhost',
    user     : 'EComm',
    password : 'EComm',
    database : 'EComm',
    port     : '3306',
    debug    :  false
});
*/
 var mysql      = require('mysql');
 var poolRead = mysql.createPool({
  	connectionLimit : 500, //important
    host     : 'DataServer-LB-1356862133.us-east-1.elb.amazonaws.com',
    user     : 'EComm',
    password : 'EComm',
    database : 'EComm',
    port     : '3306',
    debug    :  false
});

var poolWrite = mysql.createPool({
  	connectionLimit : 1000, //important
    host     : 'ec2-52-23-201-213.compute-1.amazonaws.com',
    user     : 'EComm',
    password : 'EComm',
    database : 'EComm',
    port     : '3306',
    debug    :  false
});



//Store all HTML files in view folder.
//app.use(express.static(__dirname + '/Script'));
//Store all JS and CSS in Scripts folder.

app.get('/',function(req,res){
  res.sendFile('Ecomm.html', { root: __dirname });
  //It will find and locate index.html from View or Scripts
});

app.post('/login',function(req,res){
	//console.log(req.session);
	Authenticate(req.body.username,req.body.password,function(err,fname,user){
		if(!err) {
				req.session.regenerate(function(){
				req.session.name=user.username;
				req.session.role=user.role;
			    res.send("Welcome " + fname);
				});
      		}
		else{
				res.send("That username and password combination was not correct"); 		
			}
	});
});

function Authenticate(username,password,fn){
	poolRead.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          res.json({"code" : 100, "status" : "Error in connection database"});
          return;
        }
        connection.query('SELECT * from users where username = ' + 
		connection.escape(username) +' and password =' + connection.escape(password), 
		function(err, rows, fields) {
				connection.release();
				////console.log(query.sql);
				//////console.log(rows[0]);
				if(!rows.length) {
	 				////console.log("No user found");
	 				return fn(new Error('cannot find user'));
	 			}
	 			else{
	 				////console.log('user found'+rows[0]);
	 				return fn(null,rows[0].fname,rows[0]);
	 			}
		    });
    });
}


app.post('/registerUser',function(req,res){
	RegisterUser(req.body,function(err,data){
		if(!err){
			res.send("Your account has been registered");
		}
		else{
			res.send(err.message);
		}
	});
})

function RegisterUser(user,fn){
	poolWrite.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          res.json({"code" : 100, "status" : "Error in connection database"});
          return;
        }
	   connection.query("insert into users values ("+connection.escape(user.fname)+","+connection.escape(user.lname)+","+connection.escape(user.username)+","
						+connection.escape(user.password)+","+connection.escape(user.address)+","+connection.escape(user.city)+","+connection.escape(user.state)+","
						+connection.escape(user.zip)+",DEFAULT,"+connection.escape(user.email)+");",function(err,results){
							connection.release();
						if(err){
							//console.log(user.username)
							return fn(new Error('There was a problem with your registration'));
						}
						else{
							return fn(null,true);
						}
						});
	
					});
}

app.post('/updateInfo',function(req,res){
	if(req.session.name){
		updateUser(req.session.name,req.body,req,function(err,data){
			if(!err){
				res.send("Your information has been updated");
			}
			else{
				res.send(err.message);
			}
		});
	}
	else{
			res.send("You must be logged in to perform this action");
		}
});

function updateUser(name,user,req,fn){
	poolWrite.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          res.json({"code" : 100, "status" : "Error in connection database"});
          return;
        }
        connection.query("update users set fname= ifnull("+connection.escape(user.fname)+",fname" 
        										  +"), lname= ifnull("+connection.escape(user.lname)+",lname"
        										  +"), address= ifnull("+connection.escape(user.address)+",address"	
        										  +"), city= ifnull("+connection.escape(user.city)+",city"
        										  +"), state= ifnull("+connection.escape(user.state)+",state"
        										  +"), zip= ifnull("+connection.escape(user.zip)+",zip"
        										  +"), email= ifnull("+connection.escape(user.email)+",email"
        										  +"), username= ifnull("+connection.escape(user.username)+",username"
        										  +"), password= ifnull("+connection.escape(user.password)+",password"
        										  +") where username="+connection.escape(name),
        			function(err,results){
							////console.log(query1.sql);
							connection.release();
						if(err){
							/*console.log("login ="+ name);
							console.log("username requested="+user.username);
							console.log(connection.escape(user.username))
							*/return fn(new Error("There was a problem with this action"));
							////console.log("update cannot be done");
						}
						else{
							////console.log("User updated");
							return fn(null,true);
						}
					});
	 			});
}

app.post('/addProducts',function(req,res){
	if(req.session.name){
		AddProducts(req.session,req.body,function(err,data){
			if(!err){
				res.send("The product has been added to the system");
			}
			else{
				res.send(err.message);
			}
		})
   	}
   	else{
   		res.send("You must be logged in to perform this action")
   	}
})

function AddProducts(session,product,fn){
	poolWrite.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
			if(session.role) {
				connection.query("insert into products values ("+connection.escape(product.asin)
						+","+connection.escape(product.name)+","+connection.escape(product.productDescription)
						+","+connection.escape(product.categories)+");",function(err,results){
							////console.log(query1.sql);
							connection.release();
						if(err){
							////console.log("Product cannot be added - duplicate entry");
							return fn(new Error("There was a problem with this action"));
						}
						else{
							////console.log("Products added");
							return fn(null,true);
						}
					});
	 			}
	 			else{
	 				////console.log("Not admin");
	 				connection.release();
	 				return fn(new Error('Only admin can perform this action'));
	 			}
	});
}

app.post('/modifyProduct',function(req,res){
	if(req.session.name){
		updateProduct(req.session,req.body,function(err,data){
			if(!err){
				res.send("The product information has been updated");
			}
			else{
				res.send(err.message);
			}
		})
   	}
   	else{
   		res.send("You must be logged in to perform this action")
   	}
})

function updateProduct(session,product,fn){
	poolWrite.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }

		if(session.role) {
				connection.query("update products set name="+connection.escape(product.name)
					+",productDescription="+connection.escape(product.productDescription)
					+" where asin="+connection.escape(product.asin), function (err,results){
					connection.release();
					if(err){
							//console.log("Product cannot be updated - duplicate entry");
							return fn(new Error("There was a problem with this action"));
						}
						else{
						 	//console.log("Products updated");
							return fn(null,true);
						}
					});
			}
			else{
	 				////console.log("Not admin");
	 				connection.release();
	 				return fn(new Error('Only admin can perform this action'));
	 			}
		});
}

app.post('/viewUsers',function(req,res){
	if(req.session.name){
		viewUsers(req.session,req.body,function(err,data){
			if(!err){
				res.send(data);
			}
			else{
				res.send(err.message);
			}
		})
   	}
   	else{
   		res.send("You must be logged in to perform this action")
   	}

});

function viewUsers(session,user,fn){
	poolRead.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
        var fname=(connection.escape(user.fname)==="NULL")?'%%':'%'+user.fname+'%';
        var lname=(connection.escape(user.lname)==="NULL")?'%%':'%'+user.lname+'%';
        if(session.role) {
			connection.query("select fname,lname from users where fname like ? and lname like ?",[fname,lname], 
					function(err,results,fields){
						connection.release();
						////console.log(query1.sql);
						if(err){
							////console.log("Cannot list users");
							return;
						}
						else{
							////console.log("User list :",results);
							return fn(null,results);
						}
					})
			}
			else{
				////console.log("Not admin");
				connection.release();
				return fn(new Error("Only admin can perform this action"));
			}
		});
}



app.post('/viewProducts',function(req,res){
		viewProducts(req.body,function(err,data){
			if(!err){
				if(data.length > 0){
				    //res.send(results);
				    var finalResults = "product_list:[{name:"
				    for(var i=0;i<data.length;i++){
				      	if(i){
				        	finalResults += ',name:';
				      	}
				     finalResults+=data[i]["name"];
				     finalResults += '}'
				    }
				    finalResults += ']'
				}
					res.send(finalResults);
			}
			else{
				res.send(err.message);
			}
		})

});

function viewProducts(product,fn){
	poolRead.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
        var key = connection.escape(product.keyword);
        var keyword = "\""+product.keyword+"\"";
        var asin = connection.escape(product.asin);
        var categories=(connection.escape(product.categories)==="NULL")?'%%':connection.escape(product.categories);
		////console.log(categories);
        //var keyword=(connection.escape(product.keyword)==="NULL")?'%%':product.keyword;
         if(asin!="NULL"){
                connection.query("select name from products where asin ="+asin,function(err,results,fields){
                        connection.release();
                                                //console.log(query1.sql)
                                                if(err){
                                                        ////console.log("Cannot list products");
                                                        return;
                                                }
                                                else{
                                                        if(results.length){
                                                        //console.log("Product list :",results);
                                                                return fn(null,results);
                                                        }
                                                        else{
                                                                return fn(new Error("There were no products in the system that met that criteria"));
                                                        }

                                                }
                })
        }
        else if(key!="NULL" && categories =='%%'){
        connection.query("select name from products where match(name,productDescription) against('"+keyword+"') limit 1000",
                                        function(err,results,fields){
                                                connection.release();
                                                //console.log(query1.sql)
                                                if(err){
                                                        ////console.log("Cannot list products");
                                                        return;
                                                }
                                                else{
                                                        if(results.length){
                                                        //console.log("Product list :",results);
                                                                return fn(null,results);
                                                        }
                                                        else{
                                                                return fn(new Error("There were no products in the system that met that criteria"));
                                                        }

                                                }
                                        })
                }
        else if(key !="NULL" && categories !='%%'){
                connection.query("select name from products where categories="+categories+" and match(name,productDescription) against("+keyword+") limit 1000",
                        function(err,results,fields){
                                        connection.release();
                                                //console.log(query1.sql)
                                                if(err){
                                                        ////console.log("Cannot list products");
                                                        return;
                                                }
                                                else{
                                                        if(results.length){
                                                        //console.log("Product list :",results);
                                                                return fn(null,results);
                                                        }
                                                        else{
                                                                return fn(new Error("There were no products in the system that met that criteria"));
                                                        }

                                                }
                                                 })
        }
        else if(key =="NULL" && categories !='%%'){
                connection.query("select name from products where categories like "+categories+" limit 1000",
                        function(err,results,fields){
                                        connection.release();
                                                //console.log(query1.sql)
                                                if(err){
                                                        ////console.log("Cannot list products");
                                                        return;
                                                }
                                                else{
                                                        if(results.length){
                                                        //console.log("Product list :",results);
                                                                return fn(null,results);
                                                        }
                                                        else{
                                                                return fn(new Error("There were no products in the system that met that criteria"));
                                                        }

                                                }
                        })
        }
        else{
                connection.query("select name from products limit 1000",
                                        function(err,results,fields){
                                                connection.release();
                        if(err){
                                                        ////console.log("Cannot list products");
                                                        return;
                                                }
                                                else{
                                                        if(results.length){
                                                                ////console.log("Product list :",results);
                                                                return fn(null,results);
                                                        }
                                                        else{
                                                                return fn(new Error("There were no products in the system that met that criteria"));
                                                        }

                                                }
                }


		)};

    });
}

app.post('/buyProducts',function(req,res){
	if(req.session.name){
		updateProductsPurchased(req.session,req.body,function(err,data){
			if(!err){
				updateRecommendation(req.body,function(err,data){
					if(!err){
						res.send("The product information has been updated");
					}
					else{
					res.send(err.message);
					}
			})
			}
			else{
				res.send(err.message);
			}
		})
   	}
   	else{
   		res.send("There was a problem with this action")
   	}
})

function updateProductsPurchased(session,products,fn){
	poolWrite.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
        	var temp = products.asin.replace("[","");
			var list = temp.replace("]","").split(",");
			var values="";
			var total=0;
			for(var i=0;i<list.length;i++){
				if(total){
					values += ',';
				}
				values += `('${list[i]}','${session.name}')`;
				total++;
			}	
			connection.query('insert into productsPurchased (asin,username) values '+values, 
				function (err,results){
					connection.release();
					if(err){
							console.log(query.sql)
							console.log(err.message)
							//console.log("Product cannot be updated - duplicate entry");
							return fn(new Error("There was a problem with this action"));
						}

					else{
						return fn(null,true);
					}
			
		});
	});
}

function updateRecommendation(products,fn){
	poolWrite.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
        	var temp = products.asin.replace("[","");
			var list = temp.replace("]","").split(",").slice().sort();
			var results = [];
			for (var i = 0; i < list.length; i++) {
			    if (i+1 < list.length && list[i + 1] == list[i]) {
			        continue;
			    }
			    results.push(list[i]);
			}
			if(results.length>1)
			{
						var total =0;
						var values = "";
						for(var i=0;i<results.length;i++){
							for(var j=0;j<results.length;j++){
								if(i==j){
									continue;
								}
								if(total){
									values +=',';
								}
						    values +=`('${results[i]}','${results[j]}')`;
						    total++;
						}
					}
					connection.query('Insert into recommendation (bought,alsoBought) values '+values,function(err,results){
						connection.release();
						if(	err){
							console.log(query.sql)
							console.log(err.message)
							return fn(new Error("There was a problem with this action"));
						}
						else{
							return fn(null,true);
						}
					})
			}
			else{
				connection.release();
				return fn(null,true);
			}	
			
		});
}

app.post('/productsPurchased',function(req,res){
	if(req.session.role){
		viewBoughtProducts(req.body.username,function(err,data){
			if(!err){
				if(data.length > 0){
				    //res.send(results);
				    var finalResults = "product_list:{"
				    for(var i=0;i<data.length;i++){
				      	if(i){
				        	finalResults += ',';
				      	}
				     finalResults+=data[i]["name"];
				    }
				}
				    finalResults += '}'
				res.send(finalResults);
			}
			else{
				res.send(err.message);
			}
		})
   	}
   	else{
   		res.send("There was a problem with this action")
   	}

})

function viewBoughtProducts (user,fn){
	poolRead.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
        	connection.query("select p.name,count(*) as quantity from productsPurchased pp, products p where pp.username='"+user+"' and pp.asin=p.asin group by pp.asin", function (err,results){
					connection.release();
					if(err){
							/*console.log(query.sql);
							*///console.log("Product cannot be updated - duplicate entry");
							console.log(err.message)
							return fn(new Error("There was a problem with this action"));
						}
						else{
							//console.log(results)
							return fn(null,results);
						}
					});
			
				
			
		});
}

app.post('/getRecommendations',function(req,res){
	getRecommendations(req.body.asin,function(err,data){
		if(!err){
				if(data.length > 0){
				    //res.send(results);
				    var finalResults = ""
				    for(var i=0;i<data.length;i++){
				      	if(i){
				        	finalResults += ',';
				      	}
				     finalResults+=data[i]["name"];
				    }
				}
					res.send(finalResults);
			}
			else{
				res.send(err.message);
			}
	})
})

function getRecommendations(asin,fn){
	poolRead.getConnection(function(err,connection) {
    if (err) {
          connection.release();
          return;
        }
        connection.query("select name from products p inner join (select alsoBought from recommendation where bought ='"+asin+"' group by alsoBought order by count(*) desc limit 5) as r on p.asin=r.alsoBought;",
        	function(err,results){
        		connection.release();
        		if(err){
        			console.log(err.message);
        			return fn(new Error("There was a problem with this action"));
        		}
        		else{
        			return fn(null,results);
        		}
        	})
})
}


app.post('/logout',function(req,res){
	if(req.session.name){
		req.session.destroy();
		res.send("You have been logged out");
		}
	else{
		res.send("You are not currently logged in");
	}
});




app.listen(3001);




