import nodemailer from "nodemailer";

export async function sendEmail(email, name, password, type) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"RepContent Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to RepContent – Your ${type === "admin" ? "Admin" : "Salesperson"} Account Credentials`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #2d89ef;">Welcome to RepContent</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your <strong>${type === "admin" ? "Admin" : "Salesperson"}</strong> account has been successfully created.</p>

          <h3 style="margin-top: 20px;">Login Credentials</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>

          <p>Please use the above credentials to log in to <a href="https://app.repcontent.com" style="color: #2d89ef; text-decoration: none;">RepContent</a>.</p>

          <p style="margin-top: 20px;">For security reasons, we recommend changing your password after your first login.</p>

          <p>Best regards,<br><strong>The RepContent Team</strong></p>

          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;" />
          <p style="font-size: 12px; color: #777;">
            This is an automated message from RepContent. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email sending error:", err);
    throw new Error("Invalid email or email delivery failed");
  }
}
