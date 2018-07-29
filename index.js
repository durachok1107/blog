var express = require("express");
var bodyParser = require("body-parser");
const { Client } = require("pg");
var jwt = require('jsonwebtoken');

var secretKey = 'superSecretKeyBlog';

const pool = new Client({
  connectionString: "postgres://kcwgshhoqgtyjt:99825cb559a4044dc6a0081410f9c07440481c4900f6cc23bbd88f1d997daa2d@ec2-50-19-86-139.compute-1.amazonaws.com:5432/dm7e606155vv7",
  ssl: true,
});

pool.connect();

var rollback = function(client) {
  client.query('ROLLBACK', function() {
    client.end();
  });
};


//"create table blog_user (user_id serial, user_login text, user_email text, user_password text, user_key text, user_signtime timestamp);"
//"create table blog_post (post_id serial, user_id integer, post_name text, post_body text, post_tags text, post_createtime timestamp);"
//"create table blog_comment (comment_id serial, user_id integer, post_id integer, comment_body text, comment_createtime timestamp);"

/*pool.query("insert into blog_user (user_login, user_email, user_password, user_key, user_signtime) values ('test','','test','12345',CURRENT_TIMESTAMP);", (err, res) => {
  done();
  if (err) throw err;
  console.log(JSON.stringify(res));
  pool.end();
});*/

/*pool.query("select * from blog_user;", (err, res) => {
	if (err) return rollback(pool);
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  console.log('**'+JSON.stringify(res.rows));
});
*//*
axios.get('https://yesno.wtf/api')
        .then(function (response) {
          vm.answer = _.capitalize(response.data.answer)
        })
        .catch(function (error) {
          vm.answer = 'Ошибка! Не могу связаться с API. ' + error
        })
		
		axios.get(serverName+'/sign')
						.then(function (response) {
							alert('Ошибка! ' + response);
						})
						.catch(function (error) {
							alert('Ошибка! ' + error);
						})
		*/
var app = express();
var jsonParser = bodyParser.json();

app.use(function (req, res, next) { 
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Allow-Origin", "http://localhost:5000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.sendFile(__dirname + "/public/welcome.html"));
app.get("/sign", (req, res) => res.sendFile(__dirname + "/public/sign.html"));

app.post("/signup/", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
	pool.query("select count(*) from blog_user where user_login ='"+req.body.login+"' or (user_email!='' and user_email='"+req.body.email+"');", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows[0].count>0)
		{
			res.send('1');
		}
		else
		{
			pool.query("insert into blog_user (user_login, user_email, user_password, user_key, user_signtime) values ('"+req.body.login+"','"+req.body.email+"','"+req.body.password+"','',CURRENT_TIMESTAMP) ;", (error, result) => {
				if (error) return rollback(pool);
				res.send('0');
			});
		}
	});
});

app.get("/login", (req, res) => res.sendFile(__dirname + "/public/login.html"));

app.post("/getin/", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
	pool.query("select user_id from blog_user where (user_login ='"+req.body.login+"' or (user_email!='' and user_email='"+req.body.login+"')) and user_password='"+req.body.password+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			var user_id=result.rows[0].user_id;
			var token = jwt.sign({ USER_LOGIN: req.body.login, USER_PASSWORD: req.body.password, USER_ID:user_id }, secretKey);
			pool.query("update blog_user set user_key='"+token+"' where user_id ="+user_id+";", (error, result) => {
				if (error) return rollback(pool);
				res.send(token);
			});
		}
		else
		{
			res.send('1');
		}
	});
});

app.get("/exit/", jsonParser, function (req, res) {
	var token=req.header('Authorization');
	pool.query("update blog_user set user_key='' where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		res.send('0');
	});
});

app.get("/main", (req, res) => res.sendFile(__dirname + "/public/main.html"));

app.get("/giveme/", function (req, res) {
	var token=req.header('Authorization');
	pool.query("select user_id, user_login from blog_user where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			res.send(result.rows[0]);
		}
		else
		{
			res.send('1');
		}
	});
});

app.get("/getposts/", function (req, res) {
	pool.query("select p.post_id as postid, p.post_name as name, p.post_body as body, p.post_tags as tags, p.post_createtime as posttime, u.user_id as userid, u.user_login as userLogin from blog_post p, blog_user u where p.user_id=u.user_id order by p.post_createtime desc;", (error, result) => {
		if (error) return rollback(pool);
		res.send(result.rows);
	});
});

app.get("/post/:post_id", (req, res) => res.sendFile(__dirname + "/public/post.html"));

app.get("/getpost/:postid", function (req, res) {
	pool.query("select p.post_id as postid, p.post_name as name, p.post_body as body, p.post_tags as tags, p.post_createtime as posttime, u.user_id as userid, u.user_login as userlogin from blog_post p, blog_user u where p.user_id=u.user_id and p.post_id="+req.params.postid+";", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0){
			res.send(result.rows[0]);
		}
		else {
			res.send({});
		}
	});
});

app.get("/getcomments/:postid", function (req, res) {
	pool.query("select c.comment_id as commentid, u.user_login as userlogin, u.user_id as userid,  c.comment_createtime as commenttime, c.comment_body as body from blog_comment c, blog_user u where c.user_id=u.user_id and c.post_id="+req.params.postid+" order by c.comment_createtime;", (error, result) => {
		if (error) return rollback(pool);
		res.send(result.rows);
	});
});

app.post("/savecomment/", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
	var token=req.header('Authorization');
	pool.query("select user_id from blog_user where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			var user_id=result.rows[0].user_id;
			pool.query("insert into blog_comment (user_id, post_id, comment_body, comment_createtime) values ("+user_id+",'"+req.body.postid+"','"+req.body.body+"',CURRENT_TIMESTAMP);", (error, result) => {
				if (error) return rollback(pool);
				res.send('0');
			});
		}
		else
		{
			res.send('1');
		}
	});
});

app.delete("/delcomment/:commentid", jsonParser, function (req, res) {
	var token=req.header('Authorization');
	pool.query("select user_id from blog_user where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			var user_id=result.rows[0].user_id;
			pool.query("delete from blog_comment where comment_id="+req.params.commentid+" and post_id in (select post_id from blog_post where user_id="+user_id+");", (error, result) => {
				if (error) return rollback(pool);
				res.send('0');
			});
		}
		else
		{
			res.send('1');
		}
	});
});


app.get("/user/:user_id", (req, res) => res.sendFile(__dirname + "/public/user.html"));

app.get("/getuser/:userid", function (req, res) {
	pool.query("select user_login as login, user_email as email, user_signtime as signtime, user_id as id from blog_user where user_id="+req.params.userid+";", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0){
			res.send(result.rows[0]);
		}
		else {
			res.send({});
		}
	});
});

app.get("/getpostsuser/:userid", function (req, res) {
	pool.query("select p.post_id as postid, p.post_name as name, p.post_body as body, p.post_tags as tags, p.post_createtime as posttime, u.user_id as userid, u.user_login as userLogin from blog_post p, blog_user u where p.user_id=u.user_id and u.user_id="+req.params.userid+" order by p.post_createtime;", (error, result) => {
		if (error) return rollback(pool);
		res.send(result.rows);
	});
});

app.get("/createpost", (req, res) => res.sendFile(__dirname + "/public/createpost.html"));

app.post("/savepost/", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
	var token=req.header('Authorization');
	pool.query("select user_id from blog_user where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			var user_id=result.rows[0].user_id;
			pool.query("insert into blog_post (user_id, post_name, post_body, post_tags, post_createtime) values ("+user_id+",'"+req.body.name+"','"+req.body.body+"','"+req.body.tags+"',CURRENT_TIMESTAMP);", (error, result) => {
				if (error) return rollback(pool);
				res.send('0');
			});
		}
		else
		{
			res.send('1');
		}
	});
});

app.delete("/delpost/:postid", jsonParser, function (req, res) {
	var token=req.header('Authorization');
	pool.query("select user_id from blog_user where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			var user_id=result.rows[0].user_id;
			pool.query("delete from blog_comment where post_id="+req.params.postid+" and post_id in (select post_id from blog_post where user_id="+user_id+");", (error, result) => {
				if (error) return rollback(pool);
				pool.query("delete from blog_post where post_id="+req.params.postid+" and user_id="+user_id+";", (error, result) => {
					if (error) return rollback(pool);
					res.send('0');
				});
			});
		}
		else
		{
			res.send('1');
		}
	});
});

app.get("/updatepost/:postid", (req, res) => res.sendFile(__dirname + "/public/updatepost.html"));

app.post("/updatepost/", jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
	var token=req.header('Authorization');
	pool.query("select user_id from blog_user where user_key='"+token+"';", (error, result) => {
		if (error) return rollback(pool);
		if(result.rows.length>0)
		{
			var user_id=result.rows[0].user_id;
			pool.query("update blog_post set post_name='"+req.body.name+"', post_tags= '"+req.body.tags+"', post_body= '"+req.body.body+"' where post_id="+req.body.postid+" and post_id in (select post_id from blog_post where user_id="+user_id+");", (error, result) => {
				if (error) return rollback(pool);
				res.send('0');
			});
		}
		else
		{
			res.send('1');
		}
	});
});



/*
pool.query("delete from blog_user where user_id between 6 and 10;", (err, res) => {
	if (err) return rollback(pool);
  console.log('**'+JSON.stringify(res.rows));
})
*//*
pool.query("select * from blog_user;", (err, res) => {
	if (err) return rollback(pool);
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
})*/

app.listen(5000, () => console.log(`Listening on 5000`));