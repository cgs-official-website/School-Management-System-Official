import { welcomeEmailTemplate, forgotPasswordTemplate, superAdminApprovalTemplate } from '../lib/emailTemplates';

/**
 * Sends an email using the backend serverless function.
 * 
 * @param {Object} options 
 * @param {string} options.to - The recipient's email address
 * @param {string} options.templateType - 'WELCOME', 'FORGOT_PASSWORD', or 'APPROVAL'
 * @param {Object} options.data - The data required for the specific template
 * @returns {Promise<Object>} - Response from the server
 */
export const sendEmail = async ({ to, templateType, data }) => {
  let subject = '';
  let html = '';

  switch (templateType) {
    case 'WELCOME':
      subject = 'Welcome to Acme School System';
      html = welcomeEmailTemplate(data.userName, data.role, data.loginUrl);
      break;
    case 'FORGOT_PASSWORD':
      subject = 'Password Reset Request';
      html = forgotPasswordTemplate(data.resetLink);
      break;
    case 'APPROVAL':
      subject = 'Your School Account is Approved!';
      html = superAdminApprovalTemplate(data.schoolName, data.dashboardLink);
      break;
    default:
      throw new Error('Invalid template type provided');
  }

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    return result;
  } catch (error) {
    console.error("Error in sendEmail service:", error);
    throw error;
  }
};
