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
    },
    startpos: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    public: {
        type: Boolean,
        required: true,
        default: true
    },
    room_for_note_test: {
        type: Boolean,
        required: true,
        default: false
    },
    note_name_for_note_test: {
        type: String
    },
    room_for_single_play: {
        type: Boolean,
        required: true,
        default: false
    },
    room_from_workshop: {
        type: Boolean,
        required: true,
        default: false
    },
    room_for_replay: {
        type: Boolean,
        required: true,
        default: false
    },
    pitch: {
        type: Number,
        required: true,
        default: 100,
        min: 50,
        max: 400
    },
    autoplay: {
        type: Boolean,
        required: true,
        default: false
    },
    trusted: {
        type: Boolean,
        required: true,
        default: false
    },
    note_name: {
        type: String
    },
    auto_manage_room: {
        type: Boolean,
        required: true,
        default: false
    },
    auto_manage_room_timeout_setted: {
        type: Boolean,
        required: true,
        default: false
    },
    packet_multiplier: {
        type: Number,
        required: true,
        default: 1
    }
});

module.exports = mongoose.model('Room', newSchema);