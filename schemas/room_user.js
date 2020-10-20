const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    nickname: {
        type: String,
        required: true
    },
    fullID: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    roomcode: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('RoomUser', newSchema);