const mongoose = require('mongoose');

const WishListSchema = new mongoose.Schema({
    user_detail:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        require:true
    },

});

module.exports = WishList = mongoose.model('wishlist',WishListSchema);