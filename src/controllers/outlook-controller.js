const axios = require("axios");
const redisConnection = require('../config/db');
const { Queue } = require("bullmq");
const { readMailAndAssignLabel } = require("../services/openai-service");
const cron = require('node-cron');
const OutlookQueue = new Queue("outlook-reply", { connection: redisConnection });
const { OUTLOOK_USER } = require('../config/serverConfig');

const user = async (req, res) => {
    try {
        let userId = OUTLOOK_USER;
        let accessToken = await redisConnection.get(userId);
        const mails = await axios('https://graph.microsoft.com/v1.0/me/messages', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log("This is response: ",mails.data.value[0].id);
        
        if (mails.data.value && mails.data.value.length > 0 && mails.data.value[0].bodyPreview) {
            let message = mails.data.value[0].bodyPreview.split("On")[0];
            const id = mails.data.value[0].id;
            const setOutlookIdInRedis = await redisConnection.set("outlookMessageId",id);
            console.log("Set outlookId in redis:", setOutlookIdInRedis);
            res.status(200).json({message: message});
        } else {
            res.status(200).json({ message: "No emails found or email body preview is missing" });
        }
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(400).json({ Error: "Error while getting mail list" });
    }
}

const read = async (userId, id, req, res) => {
    try {

        console.log("Email of read", userId, "MessageId:", id);
        let access_token = await redisConnection.get(userId);
        console.log("This is read access token: ", access_token);
        let accessToken = await redisConnection.get(userId);

        const mails = await axios(`https://graph.microsoft.com/v1.0/me/messages/${id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        let message = mails.data;
        console.log("MESSAGE", message);

        if (message.bodyPreview && message.sender && message.sender.emailAddress && message.sender.emailAddress.address) {
            let content = message.bodyPreview.split("On")[0];
            let sender = message.sender.emailAddress.address;


            let label = await readMailAndAssignLabel(content);
            OutlookQueue.add("send reply", { label: label, sender: sender, accessToken: accessToken });

            res.status(200).json({ message: "Email labelled. Reply scheduled" });
        } else {
            res.status(200).json({ message: "Email body preview or sender information is missing" });
        }
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(400).json({ Error: "Error while reading mail" });
    }
}

cron.schedule("* * * * *", async () => {
    try {
      console.log("calling LISTEMAIL==============================");
      const req = {
        params: { email: OUTLOOK_USER },
      };
      const res = {
        status: (code) => ({
          json: (data) => console.log(`Status: ${code}, Data: ${JSON.stringify(data)}`)
        })
      };
      await user(req, res);
    } catch (error) {
      console.error("Error calling LISTEMAIL:");
      console.log(error.response ? error.response.data : error.message);
    }
  });
  
  
  cron.schedule("*/2 * * * *", async () => {
    try {
        console.log("calling READEMAIL=================================");
        const id = await redisConnection.get('outlookMessageId');
    
        console.log("Id", id);

        const requestParams = {
            email: OUTLOOK_USER,
            messageId: id
        };

        const mockRes = {
            status: (code) => ({
                json: (data) => console.log(`Status: ${code}, Data: ${JSON.stringify(data)}`)
            })
        };

        await read(
            requestParams.email,
            requestParams.messageId,
            {},
            mockRes
        );
        console.log("ReadMails", requestParams);
    } catch (error) {
        console.error("Error calling READEMAIL:");
        console.log(error.response ? error.response.data : error.message);
    }
});

module.exports = {
    user,
    read
};
