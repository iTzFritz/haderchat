var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var mysql = require('mysql');

var dirPath = "/home/douglas/Dokumente/haderChat/local/";

var pool = mysql.createPool({
	connectionLimit : 100,
	host: 'localhost',
	user: 'root',
	password: 'demo',
	database: 'haderChat'
});

app.use(express.static('local'));
app.get('/', function(req, res) {
	res.sendFile(dirPath+"index.html");
});

io.on('connection', function(socket) {
	socket.on('login', function(daten) {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT username, id, code,email FROM users WHERE username = ? AND password = ?', [daten.user, generateHash(daten.pass)], function(err, res) {
				if(err) throw err;

				console.log(generateHash(daten.pass));

				if(res.length > 0)
				{
					if(res[0].code == -1)
					{
						console.log("Eingeloggt");
						connection.query('UPDATE users SET sid = ?, online = 1 WHERE username = ? AND password = ?', [socket.id, daten.user, generateHash(daten.pass)]);
						socket.emit('userIsLoggedIn', socket.id);
						showChat(socket, res[0].id, res[0].username);
					}

					else
					{
						socket.emit('throwError', "Die E-Mail wurde noch nicht verifiziert !");
						sendMail(res[0].email, res[0].code);
						socket.emit('displayCodeForm', res[0].username);
					}
				}

				else
				{
					socket.emit('throwError', "Username oder Passwort ist nicht korrekt !");
				}
			});

			connection.release();
		});
	});

	socket.on('register', function(daten) {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT id FROM users WHERE username = ? OR email = ?', [daten.user, daten.email], function(err, res) {
				if(err) throw err;

				if(res.length > 0)
				{
					socket.emit('throwError', "Username oder E-Mail wird bereits verwendet !");
				}

				else
				{
					console.log("Registriert");
					var code = Math.floor((Math.random() * 99999) + 1);
					connection.query('INSERT INTO users SET username = ?, password = ?, email = ?, code = ? ', [daten.user, generateHash(daten.pass) , daten.email, code]);
					sendMail(daten.email, code);
					socket.emit('displayCodeForm', daten.user);
				}
			});

			connection.release();
		});
	});

	socket.on('checkMailCode', function(code) {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT id, username FROM users WHERE code = ? AND username = ?', [code.code, code.user], function(err, res) {
				if(err) throw err;

				if(res.length > 0)
				{
					console.log("Code stimmt");
					connection.query('UPDATE users SET code = -1, sid = ?, online = 1 WHERE id = ?', [socket.id,res[0].id]);
					socket.emit('userIsLoggedIn', socket.id);
					showChat(socket, res[0].id, res[0].username);
				}

				else
				{
					socket.emit('throwError', "Der Code ist nicht korrekt !");
				}
			});

			connection.release();
		});
	});

	socket.on('stillLoggedIn', function(data) {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT id,username FROM users WHERE sid = ?', [data], function(err, res) {
				if(err) throw err;

				if(res.length > 0)
				{
					console.log("wieder Eingeloggt");
					connection.query('UPDATE users SET sid = ?, online = 1 WHERE sid = ?', [socket.id, data]);
					socket.emit('userIsLoggedIn', socket.id);
					showChat(socket, res[0].id, res[0].username);
				}
			});

			connection.release();
		});
	});

	socket.on('writeMessage', function(msg) {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT id FROM users WHERE sid = ?', [socket.id], function(err, res) {
				if(err) throw err;

				if(res.length > 0 && msg != "")
				{
					connection.query('INSERT INTO chat SET userid = ?, msg = ?', [res[0].id, msg]);
					connection.query('SELECT username FROM users WHERE id = ?', [res[0].id],function(err,result) {
						if(err) throw err;

						if(result.length > 0)
						{
							io.emit('updateChat', {cid: res[0].id,creator: result[0].username, msg: msg});
						}
					});
				}
			});

			connection.release();
		});
	});

	socket.on('disconnect', function() {
		pool.getConnection(function(err, connection) {
			connection.query('SELECT id FROM users WHERE sid = ?', [socket.id], function(err, res) {
				if(err) throw err;

				if(res.length > 0)
				{
					console.log("Disconnect");
					connection.query('UPDATE users SET online = 0 WHERE sid = ?', [socket.id]);
					io.emit('removeUser', res[0].id);
				}
			});

			connection.release();
		});
	});
});

function showChat(socket, id, user)
{
	pool.getConnection(function(err, connection) {
		connection.query('SELECT chat.userid, users.username, chat.msg FROM chat LEFT JOIN users ON users.id = chat.userid', function(err, res) {
			if(err) throw err;

			if(res.length > 0)
			{
				connection.query('SELECT id, username FROM users WHERE online = 1', function(err, result) {
					if(err) throw err;

					if(result.length > 0)
					{
						socket.emit('initChat', [res, result]);


						socket.broadcast.emit('updateUsers', {id: id, user: user});
					}
				});
			}
		});

		connection.release();
	});
}

function generateHash(data)
{
	var add = data.charAt(0) + data.charAt(data.length - 1 );
	return crypto.createHash('md5').update(data+add).digest("hex");
}

function sendMail(mail, code)
{
	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'noreply.haderchat@gmail.com',
			pass: 'AjKahsaBX6yNxPc'
		}
	});

	transporter.sendMail({from: 'noreply.haderchat@gmail.com', to: mail, subject: 'Your Code is: '+code, text: 'That was easy!'}, function(error, info){
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ' + info.response);
		}
	});
}


http.listen(8080, function() {
	console.log("Server listening on 8080");
});
