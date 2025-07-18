const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: '163',
  auth: {
    user: process.env.MAIL_USER,      // 你的163邮箱，来自环境变量
    pass: process.env.MAIL_PASS       // 你的授权码，来自环境变量
  }
});

/**
 * 发送用户反馈邮件
 * @param {string} content - 反馈内容
 * @param {string} contact - 联系方式
 */
async function sendFeedbackMail(content, contact) {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: process.env.MAIL_USER, // 你自己收
    subject: 'AI视频学习助手-用户反馈',
    text: `反馈内容：${content}\n联系方式：${contact || '未填写'}`
  });
}

module.exports = { sendFeedbackMail };
 