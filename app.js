const express = require('express');
const session = require('express-session');
const cors = require('cors');
const mqtt = require('mqtt');
const mongoose = require('mongoose')
const { User } = require('./Models/User');

const app = express();
const SESSION_TIME = 30 * 24 * 3600 * 1000; // 30 ngày
const server = require('http').Server(app);
const io = require('socket.io')(server);

var mqttOptions = {
  host: '1af8e2f5e0ae40308432e82daf1071e0.s1.eu.hivemq.cloud',
  port: 8883,
  protocol: 'mqtts',
  username: '',
  password: ''
}
var client;

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


app.post('/login', async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  
  const user = await User.findOne({email: email})
  
  if (user && password == user.password) { 
  //TODO: đoạn này thay bằng truy vấn csdl
  
    // set session
    req.session.User = user.email;
    req.session.Name = user.username;    //TODO: đoạn này vào csdl tìm kiếm name của object có email của client

    mqttOptions.username = "scs-home1";       //TODO: lấy tên đăng nhập và mk kết nối hiveMQ từ object đã lấy từ csdl
    mqttOptions.password = "SCS-home1";

    // connect to mqtt broker
    client = mqtt.connect(mqttOptions);
    setUpCallbacksMqtt(client);

    // setup socket.io
    io.on('connection', socket => {
      console.log('new connection with ID:', socket.id);
      socket.on('disconnect', () => { console.log('socket', socket.id, 'disconnected'); })

      try {
        //   client.subscribe('scs/home1');

        client.on('message', (topic, message) => {
          //Called each time a message is received
          // console.log('Received message:', topic, message.toString());

          let arr = message.toString().split(' ');
          let keywork = arr[0];
          let value = arr[1];

          socket.emit(`${topic}/${keywork}`, [new Date().toISOString(), value]);
          // console.log('emit:', keywork, [new Date().toISOString(), value]);
        });
      } catch (e) {
        console.log('MQTT Client connection failed');
      }
    })

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
  console.log('log');
  // check session
  if (req.session.User) {
    let topics = getTopics();
    // client.end();
    // client = mqtt.connect(mqttOptions);

    for (let topic of topics) {
      client.subscribe(`${topic.name}/data`);
      // client.subscribe(`${topic.name}/ctrl`);
      console.log("sub", topic.name,'/data');
    }

    res.render('pages/dashboard-page', { name: req.session.Name, topics: topics });
  } else {
    res.redirect('/login');
  }
});

// GET /devices?t=scs/home1
app.get('/devices', (req, res) => {
  // check session
  if (req.session.User) {
    let topic = req.query.t;

    let topics = getTopics(), displayName, devices;

    // for (let topic of topics) {
    //   client.unsubscribe(topic.name);
    // }
    client.subscribe(`${topic}/data`)
    // client.subscribe(`${topic}/ctrl`);

    topics.forEach(t => {
      if(t.name == topic){
        displayName = t.displayName;
        devices = t.devices;
      }
    });

    res.render('pages/topic-page', 
    { 
      name: req.session.Name, 
      displayName: displayName, 
      devices: devices 
    });

  } else {
    res.redirect('/login');
  }
})


app.post('/devices', (req, res) => {
  //TODO: update data trong database
  
})


//sign up
app.post('signup', (req, res) => {
  //TODO: thêm dữ liệu vào csdl, chỉ dùng cho admin
})

function getTopics() {
  let topics = null; //TODO: truy cập DB lấy ra trường topics: [ ... ]

  //dữ liệu giả sử
  topics = [
    {
      name: 'scs/home1',
      displayName: 'Biệt thự Đà Lạt',
      devices: [
        { id: 1, name: "Đèn phòng khách", status: 'on' },
        { id: 2, name: "Đèn phòng ngủ", status: 'off' },
        { id: 3, name: "Đèn phòng ăn", status: 'off' }
      ]
    },
    {
      name: 'scs/home2',
      displayName: 'Biệt thự Hà Nội',
      devices: [
        { id: 1, name: "Đèn phòng khách", status: 'on' },
        { id: 2, name: "Đèn phòng ngủ", status: 'off' },
        { id: 3, name: "Đèn phòng ăn", status: 'on' }
      ]
    }]

  return topics;
}

function setUpCallbacksMqtt(client) {
  //setup the callbacks
  client.on('connect', () => {
    console.log('MQTT Connected');
  });

  client.on('error', error => {
    console.log(error);
    // client.end();
  });

  client.on('close', () => {
    console.log('close');
  })
}

// Initialize Server
const main = async () => {

  await mongoose.connect('mongodb://localhost:27017/IoTdb');
  //console.log(mongoose.connection.readyState);

  var PORT = process.env.PORT || 8080;
  server.listen(PORT, () => { console.log(`server is listening on port: ${PORT}`) });
}

main();

