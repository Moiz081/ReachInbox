const axios = require('axios');
const redisConnection = require('../config/db');
const { Queue, Worker } = require("bullmq")
const { readMailAndAssignLabel, readLabelAndReply } = require("../services/openai-service");
const cron = require('node-cron');
const LabelQueue = new Queue("reply", redisConnection);
const { GMAIL_USER } = require('../config/serverConfig');

const userInfo = async (req, res) => {
    try {
        let { userId } = req.params
        let access_token = await redisConnection.get(userId)

        let response = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/${userId}/profile`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        })

        res.status(200).json(response.data)
    } catch (error) {
        console.log(error)
        res.status(400).json({ Error: "Error while getting user data" })
    }
}

const createLabel = async (req, res) => {
    try {
        let { userId } = req.params
        let access_token = await redisConnection.get(userId)
        console.log(access_token);
        let labelContent = req.body
        console.log(labelContent);
        let response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${userId}/labels`,
            labelContent,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${access_token}`
                }
            });

        res.status(200).json(response.data)
    } catch (error) {
        console.log(error.response ? error.response.data : error.message);
        res.status(400).json({ 
            Error: "Error while creating new label",
            Details: error.response ? error.response.data : error.message
        });
    }
}

const list = async (req, res) => {
    try {
        let userId = GMAIL_USER;
        let access_token = await redisConnection.get(userId)

        let response = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/${userId}/messages?maxResults=5`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        })

        console.log("This is response: ",response.data);
        const id = response.data.messages[0].id;
        const setIdInRedis = await redisConnection.set("messageId",id);
        console.log("Set Id in redis:", setIdInRedis);

        res.status(200).json(response.data)
    } catch (error) { 
        console.log(error.response ? error.response.data : error.message);
        res.status(400).json({ 
            Error: "Error while getting email list",
            Details: error.response ? error.response.data : error.message
        });
    }
}

const read = async (userId, id, req, res) => {
    try { 
        console.log("Email of read", userId, "MessageId:", id);
        let access_token = await redisConnection.get(userId);
        console.log("This is read access token: ", access_token);
        let response = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${id}`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        })
        const fromHeaderValue = response.data.payload.headers.find(header => header.name === 'From').value;
        console.log(fromHeaderValue);
        const senderEmail = fromHeaderValue.match(/<([^>]+)>/)[1];
        console.log(senderEmail);
        if (senderEmail == userId) {
            senderEmail = response.data.payload.headers.find(header => header.name === 'To').value.match(/<([^>]+)>/)[1];
            console.log(senderEmail);
        }

        let label = await readMailAndAssignLabel(response.data)

        console.log(label);
        if (!label) return res.status(400).json({ Error: "Error while assigning label" });

        if (label == "Interested") { 
            await assignLabel("Label_2", userId, id, access_token);
            // await readLabelAndReply("Interested");
        }
        else if (label == "Not Interested") {
            await assignLabel("Label_3", userId, id, access_token);
            // await readLabelAndReply("Not Interested");
        }
        else if (label == "More Information") {
            await assignLabel("Label_1", userId, id, access_token);
            // await readLabelAndReply("More Information");
        }
        let jobData = {
            userId: userId,
            id: id,
            access_token: access_token,
            label: label,
            reply: response.data.snippet,
            sender: senderEmail
        }
        LabelQueue.add("Send Reply", jobData);
        console.log("job added to queue", jobData.label);
        
        res.status(200).json({ Message: "Label assigned. Reply scheduled" })
    } catch (error) {
        console.log(error.response ? error.response.data : error.message);
        res.status(400).json({ 
            Error: "Error while reading message",
            Details: error.response ? error.response.data : error.message
        });
    }
}

const lables = async (req, res) => {
    try {
        let { userId, id } = req.params

        let access_token = await redisConnection.get(userId)

        let response = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/${userId}/labels`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        })
        console.log('Request body:', req.body);
        console.log('User ID:', userId);
        console.log('Message ID:', id);
        console.log('Access Token:', access_token);
        res.status(200).json(response.data)
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(400).json({ Error: "Error while getting labels list" })
    }
}


const addLabel = async (req, res) => {
    try {
        let { userId, id } = req.params;

        let access_token = await redisConnection.get(userId);

        if (!access_token) {
            throw new Error('Access token not found for user');
        }

        console.log('Request body:', req.body);
        console.log('User ID:', userId);
        console.log('Message ID:', id);
        console.log('Access Token:', access_token);

        let response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${id}/modify`,
            req.body,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${access_token}`
                }
            }
        );
        console.log("This is axios response:", response.data);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error details:', error.response ? error.response.data : error.message);
        res.status(400).json({ Error: "Error while adding label to message", details: error.response ? error.response.data : error.message });
    }
}

async function assignLabel(label, userId, id, access_token) {
    try {
        let labelOptions = {
            "addLabelIds": [`${label}`]
        }
        await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${userId}/messages/${id}/modify`, labelOptions, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        })
        return true;
    } catch (error) {
        return false;
    }
}

cron.schedule("* * * * *", async () => {
    try {
      console.log("calling LISTEMAIL==============================");
      const req = {
        params: { email: GMAIL_USER },
      };
      const res = {
        status: (code) => ({
          json: (data) => console.log(`Status: ${code}, Data: ${JSON.stringify(data)}`)
        })
      };
      await list(req, res);
    } catch (error) {
      console.error("Error calling LISTEMAIL:");
      console.log(error.response ? error.response.data : error.message);
    }
  });
  
  
  cron.schedule("*/2 * * * *", async () => {
    try {
        console.log("calling READEMAIL=================================");
        const id = await redisConnection.get('id');
    
        console.log("Id", id);

        const requestParams = {
            email: GMAIL_USER,
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
        console.log("ReadMails===========================", requestParams);
    } catch (error) {
        console.error("Error calling READEMAIL:");
        console.log(error.response ? error.response.data : error.message);
    }
});


module.exports = {
    userInfo,
    createLabel,
    list,
    read,
    lables,
    addLabel
};
