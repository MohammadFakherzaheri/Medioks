const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    category_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'addcategory'
    },
    subcategory_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"subcategory"
    },
    book_ISBN:{
        type:Number,
        require:true
    },
    book_name:{
        type:String,
        require:true
    },
    book_author:{
        type:String,
        require:true
    },
    add_publisher:{
        type:String,
        require:true
    },
    publisher:{
        type:String,
        require:true
    },
    book_edition:{
        type:String,
    },
    publication_year :{
        type:Date
    },
    date:{
        type: Date,
        default: Date.now
    },
    price:[{
        cureency_type:{
            type:String,
            require:true
        },
        discount:{
            type:Number
        },
        origial_price:{
            type:Number,
            require:true
        },
        sale_price:{
            type:Number,
            require:true
        }
    }],
    description:{
        type:String
    },
    dimension:[{
        length:{
            type:Number
        },
        width:{
            type:Number
        },
        height:{
            type:Number
        }

    }],
    miscellaneous:[{
        binding:{
            type:String,
            enum:["HardCover","Paperback"]
        },
        ships_date:{
            min_day:{
                type:String,
                require:true,
            },
            max_day:{
                type:String,
                require:true,
            }
        },
        Weight:{
            type:String,
            require:true,
        },
        condition:{
            type:String,
            enum:["New", "Old"],
            trim:true
        },
        quantity:{
            type:Number,
            require:true
        },
        stock_location:{
            type:String,
            enum:["Godown", "Counter"],
            trim:true
        },
    }],
    product_img:{
        type:String
    }

});

module.exports = AddProduct = mongoose.model('product',ProductSchema);