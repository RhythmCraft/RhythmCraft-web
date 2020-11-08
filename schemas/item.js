const mongoose = require('mongoose');

const { Schema } = mongoose;
const newSchema = new Schema({
    uploader: {
        type: String,
        required: true
    },
    product_id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 1
    },
    multi_buy: {
        type: Boolean,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    stop_sell: {
        type: Boolean,
        required: true,
        default: false
    },
    image_name: {
        type: String
    }
});

module.exports = mongoose.model('Item', newSchema);