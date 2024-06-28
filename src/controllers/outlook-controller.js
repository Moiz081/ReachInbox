const axios = require("axios");
const redisConnection = require('../config/db');
const { Queue } = require("bullmq");
const { readMailAndAssignLabel } = require("../services/openai-service");

const OutlookQueue = new Queue("outlook-reply", { connection: redisConnection });

const user = async (req, res) => {
    try {
        let { userId } = req.params;
        let accessToken = await redisConnection.get(userId);
        const mails = await axios('https://graph.microsoft.com/v1.0/me/messages', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (mails.data.value && mails.data.value.length > 0 && mails.data.value[0].bodyPreview) {
            let message = mails.data.value[0].bodyPreview.split("On")[0];
            res.status(200).send(mails.data);
        } else {
            res.status(200).send({ message: "No emails found or email body preview is missing" });
        }
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(400).json({ Error: "Error while getting mail list" });
    }
}

const read = async (req, res) => {
    try {
        let { userId, messageId } = req.params;
        let accessToken = await redisConnection.get(userId);
        const mails = await axios(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        let message = mails.data;

        if (message.bodyPreview && message.sender && message.sender.emailAddress && message.sender.emailAddress.address) {
            let content = message.bodyPreview.split("On")[0];
            let sender = message.sender.emailAddress.address;

            let label = await readMailAndAssignLabel(content);
            OutlookQueue.add("send reply", { label: label, sender: sender, accessToken: accessToken });

            res.status(200).send("Email labelled. Reply scheduled");
        } else {
            res.status(200).send({ message: "Email body preview or sender information is missing" });
        }
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(400).json({ Error: "Error while reading mail" });
    }
}

module.exports = {
    user,
    read
};
