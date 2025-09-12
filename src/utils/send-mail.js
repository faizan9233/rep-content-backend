import nodemailer from "nodemailer";

export async function sendEmail(email, name, password,type) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your ${type==="admin"?"Admin" : "Salesperson"} Account Credentials`,
    text: `Hello ${name},\n\nYour ${type==="admin"?"admin" : "Salesperson"} account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease log in with these credentials.`,
  });
}
