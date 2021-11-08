const express = require('express');
const session = require('express-session');
const cors = require('cors');
const app = express();
const SESSION_TIME = 30 * 24 * 3600 * 1000; // 30 ngày

app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'iot secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: SESSION_TIME } //{ secure: true }
}))
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/publics'));


//index page
app.get('/', function (req, res) {
  if (req.session.User)
    res.render('pages/landing-page', { isLoggin: true, name: req.session.Name });
  else
    res.render('pages/landing-page', { isLoggin: false, name: null });
});


//login
app.get('/login', (req, res) => {
  // check session
  if (req.session.User) {
    res.redirect('/');
  } else {
    res.render('pages/login-page');
  }
});


app.post('/login', (req, res) => {  
  var email = req.body.email;
  var password = req.body.password;

  if (email == "hung" && password == "123") { //TODO: đoạn này thay bằng truy vấn csdl
    // set session
    req.session.User = req.body.email;
    req.session.Name = 'Hung Nguyen Ngoc';    //TODO: đoạn này vào csdl tìm kiếm name của object có email của client

    res.status(200).end();

  } else {
    res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }
})


//logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
})


//dashboard
app.get('/dashboard', (req, res) => {
  // check session
  if (req.session.User) {
    let topics = null; //TODO: truy cập DB lấy ra trường topics: [ ... ]

    //dữ liệu giả sử
    topics = [{
      name: 'scs/home1',
      displayName: 'Biệt thự Đà Lạt',
      devices: [
        {name: "Đèn phòng khách"},
        {name: "Đèn phòng ngủ"},
        {name: "Đèn phòng ăn"}
      ]
    }]
    
    res.render('pages/dashboard-page', { name: req.session.Name, topics: topics });
  } else {
    res.redirect('/login');
  }
});


app.get('/devices', (req, res) => {
  // check session
  if (req.session.User) {
    res.render('pages/topic-page', { name: req.session.Name });
  } else {
    res.redirect('/login');
  }
})


//sign up
app.post('signup', (req, res) => {
  //TODO: thêm dữ liệu vào csdl, chỉ dùng cho admin
})


app.listen(8080);
console.log('Server is listening on port 8080');