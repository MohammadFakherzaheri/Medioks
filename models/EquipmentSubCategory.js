const mongoose = require('mongoose');

const EquipmentSubCategorySchema = new mongoose.Schema({
    category_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'addcategory'
    },
    sub_categoryName:{
        type:String,
        reuqire:true
    }
});

module.exports = EquipmentSubCategory = mongoose.model('equipmentsubcategory',EquipmentSubCategorySchema)