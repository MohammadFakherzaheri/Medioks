const jwt = require('jsonwebtoken');
const config = require('config')

module.exports = function(req,res,next){

    const token = req.header('x-auth-token');
    // check whether we have token or not
    if(!token){
        return res.status(401).json({msg:'No token, Authorization denied'});
    }
    
    // verify the token alone with decodation process
    
    try{
        // First decode
        const decoded = jwt.verify(token,config.get('tokeSecret'));
        // call the user id from payload that we defined
        req.user = decoded.user;
        console.log(req.user,'user')
        next();
    }catch(err){
        res.status(401).json({msg:'Token not valid'})
    }
}