function mailUser(sender,recipient,subject,content){
    const emailContent = [
        `From: ${sender}`,
        `To: ${recipient}`,
        'Content-type: text/html;charset=iso-8859-1',
        'MIME-Version: 1.0',
        `Subject: ${subject}`,
        '',
        content,
      ].join('\r\n');
    
      const base64EncodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      return base64EncodedEmail;
}


function replyInThread(sender,subject,content,threadId){
    const emailContent = [
        `From: ${sender}`,
        'Content-type: text/html;charset=iso-8859-1',
        'MIME-Version: 1.0',
        `In-Reply-To: ${threadId}`,
        `References: ${threadId}`,
        `Subject: Re: ${subject}`,
        '',
        content,
      ].join('\r\n');
    
      const base64EncodedEmail = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      return base64EncodedEmail;
}

module.exports={
    replyInThread,mailUser
}