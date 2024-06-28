const express = require('express');
const router = express.Router();

const GoogleAuthController = require('../../controllers/googleAuth-controller');
const MicrosoftAuthController = require('../../controllers/microsoftAuth-controller');
const GmailController = require('../../controllers/gmail-controller');
const OutlookController = require('../../controllers/outlook-controller');

router.get('/google/auth', GoogleAuthController.googleAuth);
router.get('/google/auth/callback', GoogleAuthController.googleAuthCallback);

router.get('/microsoft/auth', MicrosoftAuthController.outlookAuth);
router.get('/microsoft/auth/callback', MicrosoftAuthController.outlookAuthCallback);

router.get('/gmail/userInfo/:userId', GmailController.userInfo);
router.post('/gmail/createLabel/:userId', GmailController.createLabel);
router.get('/gmail/list/:userId', GmailController.list);
router.get('/gmail/read/:userId/messages/:id', GmailController.read);
router.get('/gmail/labels/:userId', GmailController.lables);
router.post('/gmail/addLabel/:userId/messages/:id', GmailController.addLabel);

router.get('/outlook/list/:userId', OutlookController.user);
router.get('/outlook/read/:userId/:messageId', OutlookController.read);
module.exports = router;