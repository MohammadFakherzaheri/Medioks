const mongoose = require('mongoose');

const CheckOutSchema = new mongoose.Schema({
    deliveryAddress:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'userDeliveryAddress'
    },
    user_details:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    product_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product'
    },
    MRP_total:{
        type:Number
    },

})