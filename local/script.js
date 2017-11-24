var socket = io();
var regUser = "";

window.onload = function()
{
	socket.emit('stillLoggedIn', readCookie('loggedIn'));
};

function readCookie(name)
{
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function login()
{
	var username = document.getElementById('username').value;
	var password = document.getElementById('password').value;

	socket.emit('login', {user: username, pass: password});
}

function register(l)
{
	var form = document.getElementById('loginForm');
	var innerForm = document.getElementById('innerForm');
	var loginButton = document.getElementById("reg");

	if(l == true)
	{
		form.style.height = "300px";
		innerForm.style.height = "220px";

		innerForm.querySelector('a').innerHTML = "Du hast noch keinen Account ?";
		innerForm.querySelector('a').onclick = function() {
			register(false);
		};

		document.getElementById('email').style.display = "none";

		loginButton.innerHTML = "Login";
		loginButton.onclick = function() {
			login();
		};
	}

	else
	{
		form.style.height = "350px";
		innerForm.style.height = "280px";

		innerForm.querySelector('a').innerHTML = "Du hast schon einen Account ?";
		innerForm.querySelector('a').onclick = function() {
			register(true);
		};

		document.getElementById('email').style.display = "block";

		loginButton.innerHTML = "Registrieren";
		loginButton.onclick = function() {
			var username = document.getElementById('username').value;
			var password = document.getElementById('password').value;
			var email = document.getElementById('email').value;

			socket.emit('register', {user: username, pass: password, email: email});
		};
	}
}

function sendMessage()
{
	socket.emit('writeMessage', document.getElementById('nachricht').value);
	document.getElementById('nachricht').value = "";
}

function showNewMessage(c,m,id)
{
	var fenster = document.getElementById('chatMessages');

	var msgBlock = document.createElement('div');

	var creator = document.createElement('a');
	var spacer = document.createElement('div');
	var message = document.createElement('div');

	creator.innerHTML = c;
	creator.className = "creator";
	creator.setAttribute('name', id);

	spacer.innerHTML = "&nbsp;:&nbsp;";
	spacer.className = "spacer";

	message.innerHTML = m;
	message.className = "message";

	msgBlock.appendChild(creator);
	msgBlock.appendChild(spacer);
	msgBlock.appendChild(message);
	msgBlock.className = "msgBlock";

	fenster.appendChild(msgBlock);
}

function showOnlineUser(n,id)
{
	var fenster = document.getElementById('userListDown');

	var user = document.createElement('a');
	user.innerHTML = n + "<br />";
	user.className = "onlineUser";
	user.setAttribute('name', "u"+id);

	fenster.appendChild(user);
}

function sendMailCode()
{
	var code = document.getElementById('emailCode').value;

	socket.emit('checkMailCode', {code: code, user: regUser});
}

socket.on('userIsLoggedIn', function(sid) {
	document.cookie ="loggedIn="+sid;
	document.getElementById('loginForm').style.display = "none";
});

socket.on('initChat', function(data) {
	document.getElementById('popup').style.display = "none";
	document.getElementById('loginForm').style.display = "none";

	for(var i = 0; i < data[0].length; i++)
	{
		showNewMessage(data[0][i].username, data[0][i].msg, data[0][i].userid);
	}

	for(var i = 0; i < data[1].length; i++)
	{
		showOnlineUser(data[1][i].username, data[1][i].id);
	}
});

socket.on('updateChat', function(data) {
	showNewMessage(data.creator, data.msg, data.cid);
});

socket.on('updateUsers', function(data) {
	showOnlineUser(data.user,data.id);
});

socket.on('removeUser', function(data) {
	var user = document.getElementsByName("u"+data);
	while (user[0]) user[0].parentNode.removeChild(user[0]);
});

socket.on('throwError', function(data) {
	document.getElementById('errormsg').innerHTML = data;
	document.getElementById('error').style.display = "flex";

	setTimeout(function() {
		document.getElementById('error').style.display  = "none";
	}, 2000);
});

socket.on('displayCodeForm', function(data) {
	document.getElementById('popup').style.display  = "block";
	regUser = data;
});