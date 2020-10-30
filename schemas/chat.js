const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    chat_id: {
        type: String,
        required: true,
        unique: true
    },
    fullID: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Number,
        required: true,
        default: Date.now()
    },
    reported: {
        type: Boolean,
        required: true,
        default: false
    },
    reported_by: {
        type: String,
        required: true,
        default: 'no_user'
    }
});

module.exports = mongoose.model('Chat', newSchema);