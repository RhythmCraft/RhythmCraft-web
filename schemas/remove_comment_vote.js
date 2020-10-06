const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    user: {
        type: String,
        required: true
    },
    comment_id: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('RemoveCommentVote', newSchema);