const express = require('express');
const connectDB = require('./config/db');
const app = express();


//ConnectDB
connectDB();


// middleware express
app.use(express.json({extended:false}));
app.use(express.urlencoded({extended:true}))

// Base URL route

// app.use('/v1',require('./routers/apis'));
app.use('/v1',require('./routers/apis'));



app.get('/',(req,res)=> {
    try{
        res.send('API is running')
    }catch(err){
        res.send(err)
        console.log('err',err)
    }
})

const PORT = process.env.PORT || 5000;

app.listen(PORT,()=> console.log(`Server start at port: ${PORT}`));