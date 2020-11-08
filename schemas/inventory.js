const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    owner: {
        type: String,
        required: true
    },
    product_id: {
        type: String,
        required: true
    },
    createdAt: {
        type: Number,
        required: true,
        default: Date.now()
    }
});

module.exports = mongoose.model('Inventory', newSchema);