const mongoose = require('mongoose')
const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
	password: { type: String, required: true },
	email: { type: String, required: true, unique: true, lowercase: true },
	mqtt_username:{ type: String, required: true, unique: true, trim: true },
	mqtt_password:{ type: String, required: true },
	},
	{ collection: 'users' }
);
const User = mongoose.model('User', userSchema);
module.exports.User = User;