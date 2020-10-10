const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    originalname: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    public: {
        type: Boolean,
        default: false
    },
    file_type: {
        type: String,
        required: true
    },
    workshop_title: {
        type: String
    },
    description: {
        type: String
    },
    tags: {
        type: String
    }
});

module.exports = mongoose.model('File', newSchema);