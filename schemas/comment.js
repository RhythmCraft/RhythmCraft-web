const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    writer: {
        type: String,
        required: true
    },
    note_name: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now()
    },
    text: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    pin: {
        type: Number,
        required: true,
        default: 0
    },
    pin_by: {
        type: String,
        required: true,
        default: 'nobody'
    },
    like: {
        type: Number,
        required: true,
        default: 0
    },
    heart: {
        type: Boolean,
        required: true,
        default: false
    },
    heart_by: {
        type: String,
        required: true,
        default: 'nobody'
    }
});

module.exports = mongoose.model('Comment', newSchema);