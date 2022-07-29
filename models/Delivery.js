const mongoose = require('mongoose');

const DeliverySchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'signup'
    },
    name:{
        type:String,
        require:true
    },
    address:{
        type:String,
        require:true
    },
    state:{
        type:String,
        require:true
    },
    city:{
        type:String,
        require:true
    },
    zipcode:{
        type:Number,
        require:true
    },
    contact_no:{
        type:Number,
        require:true
    },
    date:{
        type: Date,
        default: Date.now
    },
});
module.exports = DeliveryAddress = mongoose.model('userDeliveryAddress',DeliverySchema)