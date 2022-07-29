const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    product_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product'
    },
    rating_no:{
        type:Number
    },
    review:{
        type:String
    },
});

module.exports = RatingProduct = mongoose.model('ratingProduct',RatingSchema)