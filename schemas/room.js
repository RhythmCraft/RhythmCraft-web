const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    master: {
        type: String,
        required: true
    },
    password: {
        type: String
    },
    note_speed: {
        type: Number,
        required: true,
        min: 1,
        max: 600000
    },
    now_player: {
        type: Number,
        required: true,
        default: 0
    },
    max_player: {
        type: Number,
        required: true,
        default: 8
    },
    roomcode: {
        type: String,
        required: true
    },
    playing: {
        type: Boolean,
        required: true,
        default: false
    },
    music: {
        type: String,
        required: true
    },
    music_name: {
        type: String,
        required: true
    },
    ready_player: {
        type: Number,
        required: true,
        default: 0
    },
    note: {
        type: JSON
    }
});

module.exports = mongoose.model('Room', newSchema);