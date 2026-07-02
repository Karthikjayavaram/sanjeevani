const { Resend } = require('resend');

// Initialize Resend conditionally so the server doesn't crash on boot if the key is missing.
// We will throw the error when attempting to send an email instead.
let resendClient = null;
const getResendClient = () => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Server configuration error: RESEND_API_KEY environment variable is missing.');
    }
    if (!process.env.EMAIL_FROM) {
      throw new Error('Server configuration error: EMAIL_FROM environment variable is missing.');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

/**
 * Sends an email using the Resend API with exponential backoff retry logic.
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @returns {Promise<Object>} Resend response object
 */
const sendEmail = async ({ to, subject, text, html }, maxRetries = 3) => {
  const resend = getResendClient();
  const from = process.env.EMAIL_FROM;
  
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await resend.emails.send({
        from: from,
        to: to,
        subject: subject,
        text: text,
        html: html,
      });

      // Resend SDK doesn't always throw an error for bad requests; it might return an error object.
      if (response.error) {
        throw new Error(response.error.message || 'Resend API returned an error.');
      }

      return response.data;
      
    } catch (error) {
      attempt++;
      console.error(`[emailService] Attempt ${attempt} failed to send email to ${to}: ${error.message}`);
      
      if (attempt >= maxRetries) {
        throw new Error(`Failed to send email after ${maxRetries} attempts. Last error: ${error.message}`);
      }
      
      // Exponential backoff: wait 1s, 2s, 4s...
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  sendEmail
};
