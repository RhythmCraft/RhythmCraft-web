const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Number,
        required: true,
        default: Date.now()
    },
    expires: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    promotion_money: {
        type: Number
    },
    promotion_item: {
        type: String
    }
});

module.exports = mongoose.model('Promotion', newSchema);