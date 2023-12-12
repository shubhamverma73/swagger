const mongoose = require('mongoose');

// Schema
const usersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 4
    },
    phone: {
        type: Number,
        min: 10,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: [true, "Email is already exists"],
    },
    address: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Collection create
const Users = new mongoose.model('Users', usersSchema);

module.exports = Users;