// lambda/send-follow-up-email.js
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: process.env.AWS_REGION });

exports.handler = async (event: { email: any; name: any; subject: any; message: any; }) => {
  try {
    const { email, name, subject, message } = event;
    
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: subject
        },
        Body: {
          Text: {
            Data: message
          }
        }
      }
    };
    
    await ses.sendEmail(params).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' })
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};