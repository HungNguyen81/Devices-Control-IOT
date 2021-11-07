const express = require('express');
const session = require('express-session');
const app = express();

app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'somesecret',
  cookie: { maxAge: 60000 }
}));

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/publics'));

//#region Landing page
app.get('/', function (req, res) {
  res.render('pages/landing-page');
});
//#endregion

//#region login
app.get('/login', (req, res) => {
  res.render('page/login-page');
});

// check form login
app.post('/login', (req, res) => {
  // set session
  req.session.User = req.body.username;

  // redirect to dashboard page if login successfully
  //...
  res.redirect('/dashboard');

  // else return error message
  //...
  res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
})
//#endregion

//#region dashboard
// check trạng thái login trước khi render
app.get('/dashboard', (req, res) => {
  // get session

  // if session available, render page, otherwise not
  res.render('page/dashboard-page');
});
//#endregion

app.listen(8080);
console.log('Server is listening on port 8080');