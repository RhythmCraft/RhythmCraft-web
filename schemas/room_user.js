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
    roomcode: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('RoomUser', newSchema);