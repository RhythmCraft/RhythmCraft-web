const mongoose = require('mongoose');

const { Schema } = mongoose;
const userSchema = new Schema({
    nickname: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String
    },
    snsID: {
        type: String,
        required: true,
        unique: true
    },
    fullID: {
        type: String,
        required: true,
        unique: true
    },
    provider: {
        type: String,
        required: true
    },
    nick_set: {
        type: Boolean,
        required: true,
        default: false
    },
    allow_email_ad: {
        type: Boolean,
        required: true,
        default: false
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    password: {
        type: String
    },
    join_finish: {
        type: Boolean,
        required: true,
        default: true
    },
    block_login: {
        type: Number,
        required: true,
        default: 0
    },
    block_login_reason: {
        type: String
    },
    block_chat: {
        type: Number,
        required: true,
        default: 0
    },
    block_chat_reason: {
        type: String
    },
    admin: {
        type: Boolean,
        required: true,
        default: false
    },
    rhythm_key_1: {
        type: String,
        required: true,
        default: "KeyA"
    },
    rhythm_key_2: {
        type: String,
        required: true,
        default: "KeyS"
    },
    rhythm_key_3: {
        type: String,
        required: true,
        default: "KeyD"
    },
    rhythm_key_4: {
        type: String,
        required: true,
        default: "KeyF"
    },
    rhythm_key_5: {
        type: String,
        required: true,
        default: "KeyJ"
    },
    rhythm_key_6: {
        type: String,
        required: true,
        default: "KeyK"
    },
    rhythm_key_7: {
        type: String,
        required: true,
        default: "KeyL"
    },
    rhythm_key_8: {
        type: String,
        required: true,
        default: "Semicolon"
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    show_accurary_center: {
        type: Boolean,
        required: true,
        default: false
    },
    game_skin: {
        type: String,
        required: true,
        default: 'no_skin'
    },
    custom_game_skin: {
        type: String
    },
    money: {
        type: Number,
        required: true,
        default: 0
    },
    equip: {
        type: JSON,
        required: true,
        default: {}
    },
    friends: {
        type: Array,
        required: true,
        default: []
    },
    friend_request: {
        type: Array,
        required: true,
        default: []
    },
    blocked_user: {
        type: Array,
        required: true,
        default: []
    },
    online: {
        type: Boolean,
        required: true,
        default: false
    },
    status: {
        type: String
    }
});

module.exports = mongoose.model('User', userSchema);