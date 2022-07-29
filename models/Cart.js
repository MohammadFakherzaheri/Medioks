const mongoose = require('mongoose');

const AddToCartSchema = new mongoose.Schema({
    user_detail:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        require:true
    },
    quantity:{
        type:Number,
        default:1
    },
    total_price:{
        type:String
    }
});

module.exports = AddToCart = mongoose.model('cart',AddToCartSchema);