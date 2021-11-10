const mongoose = require("mongoose");
const userSchema = mongoose.Schema(
  {
    // username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true }, // email là username để đang nhập
    name: { type: String, required: true },
    mqtt_user: { type: String, required: true, unique: true, trim: true },
    mqtt_pass: { type: String, required: true },
    topics: {
      type: Array,
      required: true
    }
  },
  { collection: "users" }
);
const User = mongoose.model("users", userSchema);
module.exports.User = User;
