const config = require('../config/envs');

const verifyServiceToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== config.SERVICE_TOKEN) {
        return res.status(403).json({ error: 'Invalid Service Token' });
    }

    next();
};

module.exports = { verifyServiceToken };