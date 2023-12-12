const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema
const bankDetailsSchema = new mongoose.Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
        minlength: 4
    },
    bank_name: {
        type: String,
        required: true,
        minlength: 4
    },
    account_number: {
        type: Number,
        min: 10,
        required: true,
        unique: true
    },
    branch_name: {
        type: String,
        required: true,
    },
    IFSC: {
        type: String,
        required: true
    },
    bank_address: {
        type: String,
        required: true
    }
});

// Collection create
const Banks = new mongoose.model('Bank_details', bankDetailsSchema);

module.exports = Banks;