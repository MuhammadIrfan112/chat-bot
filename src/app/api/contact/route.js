import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, message, type, phone, installTime, techInfo, websiteType, hasHostingAccess, hostingUser, hostingPass } = body;

    // Determine subject and content based on form type
    let subject = '';
    let htmlContent = '';

    if (type === 'installation') {
      subject = `New Installation Request from ${name}`;
      htmlContent = `
        <h2>New Chatbot Installation Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Preferred Time:</strong> ${installTime}</p>
        <p><strong>Technical Info / URL:</strong> ${techInfo || 'N/A'}</p>
        <p><strong>Website Type:</strong> ${websiteType}</p>
        <p><strong>Hosting Access:</strong> ${hasHostingAccess}</p>
        ${hasHostingAccess === 'Yes' ? `
          <p><strong>Hosting Username:</strong> ${hostingUser || 'Not provided'}</p>
          <p><strong>Hosting Password:</strong> ${hostingPass || 'Not provided'}</p>
        ` : ''}
      `;
    } else {
      subject = `New Contact Message from ${name}`;
      htmlContent = `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `;
    }

    // Configure nodemailer with environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net', // Default GoDaddy SMTP
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER || '"RealtyPropFlow" <support@realtypropflow.com>',
      to: 'support@realtypropflow.com', // Where you want to receive the emails
      replyTo: email || process.env.SMTP_USER,
      subject: subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
