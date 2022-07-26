const mongoose = require('mongoose');

const SubCategorySchema = new mongoose.Schema({
    category_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'addcategory'
    },
    sub_categoryName:{
        type:String,
        reuqire:true
    }
});

module.exports = SubCategory = mongoose.model('subcategory',SubCategorySchema)