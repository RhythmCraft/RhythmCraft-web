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
        type: Boolean,
        required: true,
        default: false
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
    }
});

module.exports = mongoose.model('User', userSchema);