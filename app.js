const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mqtt = require("mqtt");
const mongoose = require("mongoose");
const { User } = require("./Models/User");

const app = express();
const SESSION_TIME = 30 * 24 * 3600 * 1000; // 30 ngày
const server = require("http").Server(app);
const io = require("socket.io")(server);

var mqttOptions = {
  host: "1af8e2f5e0ae40308432e82daf1071e0.s1.eu.hivemq.cloud",
  port: 8883,
  protocol: "mqtts",
  username: "",
  password: "",
};
var client, socketId;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "iot secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: SESSION_TIME }, //{ secure: true }
  })
);
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/publics"));

//index page
app.get("/", function (req, res) {
  if (req.session.User)
    res.render("pages/landing-page", {
      isLoggin: true,
      name: req.session.Name,
    });
  else res.render("pages/landing-page", { isLoggin: false, name: null });
});

//login
app.get("/login", (req, res) => {
  // check session
  if (req.session.User) {
    res.redirect("/");
  } else {
    res.render("pages/login-page");
  }
});

app.post("/login", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;

  const user = await User.findOne({ email: email });

  if (user && password == user.password) {
    // set session
    req.session.User = user.email;
    req.session.Name = user.name; // têN người dùng

    mqttOptions.username = user.mqtt_user;
    mqttOptions.password = user.mqtt_pass;

    // setup socket.io
    io.on("connection", (socket) => {
      console.log("new connection with ID:", socket.id);
      socketId = socket.id;
      socket.on("disconnect", () => {
        console.log("socket", socket.id, "disconnected");
      });
    });

    // connect to mqtt broker
    client = mqtt.connect(mqttOptions);
    setUpCallbacksMqtt(client, user.email);

    res.status(200).end();
  } else {
    res
      .status(400)
      .json({ msg: "Tên đăng nhập hoặc mật khẩu không chính xác." });
  }
});

//logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//dashboard
app.get("/dashboard", async (req, res) => {
  // check session
  if (req.session.User) {
    let topics = await getTopics(req.session.User);

    for (let topic of topics) {
      client.subscribe(`${topic.name}/data`);
      console.log("sub", topic.name, "/data");
    }

    res.render("pages/dashboard-page", {
      name: req.session.Name,
      topics: topics,
    });
  } else {
    res.redirect("/login");
  }
});

// GET /devices?t=scs/home1
app.get("/devices", async (req, res) => {
  // check session
  if (req.session.User) {
    let topic = req.query.t;

    let topics = await getTopics(req.session.User),
      displayName,
      devices;

    client.subscribe(`${topic}`);

    topics.forEach((t) => {
      if (t.name == topic) {
        displayName = t.displayName;
        devices = t.devices;
      }
    });

    res.render("pages/topic-page", {
      name: req.session.Name,
      displayName: displayName,
      devices: devices,
    });
  } else {
    res.redirect("/login");
  }
});

app.post("/devices", async (req, res) => {
  //update data trong database
  if (req.session.User) {
    console.log(req.body);

    let topic = req.body.topic;
    let deviceId = req.body.id;
    let email = req.session.User;
    let stt = null;


    try {
      stt = await updateDeviceStatus(email, topic, deviceId);
      if (!stt) res.status(500).json({ msg: 'update failed' });

      client.publish(`${topic}`, `ctrl ${deviceId} ${stt}`);
      console.log(`ctrl ${deviceId} ${stt}`);
    } catch (e) {
      console.log(e);
    }

    res.status(200).json({ msg: `device ${deviceId} change status to ${stt}` })
  } else {
    console.log("post failed");
    res.status(400).json({ msg: "not logged in" })
  }
});

async function updateDeviceStatus(email, topic, deviceId) {
  const user = await User.findOne({ email: email });

  let topics = user.topics, stt;
  let newTopics = new Array()

  topics.forEach((t) => {
    if (t.name == topic) {
      stt = t.devices[deviceId - 1].status;
      stt = (stt == "on") ? "off" : "on";
      t.devices[deviceId - 1].status = stt;
    }
    newTopics.push(t);
  });

  try {
    await User.updateOne(
      { email: email },
      {
        $set: { topics: newTopics },
      },
    );
  } catch (e) {
    console.log(e.message);
    return null;
  }

  return stt;
}

//sign up
app.post("signup", (req, res) => {
  //TODO: thêm dữ liệu vào csdl, chỉ dùng cho admin
});

async function getTopics(email) {
  const user = await User.findOne({ email: email });
  return user.topics;
}

function setUpCallbacksMqtt(client, email) {
  //setup the callbacks
  client.on("connect", () => {
    console.log("MQTT Connected");
  });

  client.on("error", (error) => {
    console.log(error);
    client.end();
  });

  client.on("close", () => {
    console.log("close");
  });

  try {
    //   client.subscribe('scs/home1');

    client.on("message", (topic, message) => {
      let arr = message.toString().split(" ");
      let keyword = arr[0]; // temp, humid, ctrl
      let value = arr[1];
      let stt = arr[2];
      if (topic == 'scs/home2' && stt) console.log("from client", stt, message.toString());
      try{
        io.to(`${socketId}`).emit(`${topic}/${keyword}`, [new Date().toISOString(), value, stt ? 0 : 1]);
        // console.log(socketId);
        
      } catch(err){

      }
      if (keyword == 'ctrl') {
        updateDeviceStatus(email, topic, value);
      }
    });
  } catch (e) {
    console.log("MQTT Client connection failed");
  }
}

// Initialize Server
const main = async () => {
  // await mongoose.connect("mongodb://localhost:27017/IoTdb");
  await mongoose.connect("mongodb+srv://scs:scs-team@scs.f5vhz.mongodb.net/IoTdb");

  var PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`server is listening on port: ${PORT}`);
  });
};

main();
