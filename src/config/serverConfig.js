const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    PORT: process.env.PORT,
    GOOGLE_CLIENTID: process.env.GOOGLE_CLIENTID,
    GOOGLE_CLIENTSECRET: process.env.GOOGLE_CLIENTSECRET,
    GOOGLE_REDIRECTURI: process.env.GOOGLE_REDIRECTURI,
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET,
    OPENAI_APIKEY: process.env.OPENAI_APIKEY,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    GMAIL_USER: process.env.GMAIL_USER,
    OUTLOOK_USER: process.env.OUTLOOK_USER
};