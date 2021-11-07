const express = require('express');
const session = require('express-session');
const cors = require('cors');
const app = express();
const SESSION_TIME = 30*24*3600*1000; // 30 ngày

app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'iot secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: SESSION_TIME } //{ secure: true }
}))

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/publics'));

//#region index page
app.get('/', function (req, res) {
  if (req.session.User)
    res.render('pages/landing-page', { isLoggin: true, name: req.session.Name });
  else
    res.render('pages/landing-page', { isLoggin: false, name: null });
});
//#endregion

//#region login
app.get('/login', (req, res) => {
  res.render('pages/login-page');
});

// check form login
app.post('/login', (req, res) => {
  console.log("body", req.body);
  var email = req.body.email;
  var password = req.body.password;

  if (email == "hung" && password == "123") { //TODO: đoạn này thay bằng truy vấn csdl
    // set session
    req.session.User = req.body.email;
    req.session.Name = 'Hung Nguyen Ngoc';    //TODO: đoạn này vào csdl tìm kiếm name của object có email của client

    res.status(200).end();

  } else {
    // else return error message
    res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }
})
//#endregion

//#region logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
})
//#endregion

//#region dashboard
// check trạng thái login trước khi render
app.get('/dashboard', (req, res) => {
  // get session
  if (req.session.User) {
    // if session available, render page, otherwise not
    res.render('pages/dashboard-page', {name: req.session.Name});
  } else {
    // else redirect to login page
    res.redirect('/login');
  }
});
//#endregion

//#region signup
app.post('signup', (req, res)=>{
  //TODO: thêm dữ liệu vào csdl, chỉ dùng cho admin
})
//#endregion

app.listen(8080);
console.log('Server is listening on port 8080');