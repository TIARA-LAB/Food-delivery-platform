import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);  

export const sendOtpEmail = async (to, otp) => {
  console.log('OTP:', otp, '→', to);
  
  try {
    const result = await resend.emails.send({
      from: 'FoodApp <onboarding@resend.dev>',
      to: [to],
      subject: `FoodApp OTP: ${otp}`,
      text: `Your verification code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 60px; text-align: center; color: #667eea;">${otp}</h1>
          <p style="text-align: center; color: #666;">Valid for 10 minutes</p>
        </div>
      `
    });
    
    console.log('EMAIL SENT SUCCESSFULLY!');
    console.log(' Check Gmail inbox/spam:', to);
    
  } catch (error) {
    console.error(' EMAIL FAILED:', error.message);
    console.error(' Full error:', error);
  }
  
 /* // 🔥 TERMINAL BACKUP (Always works)
  console.log('\n🎯 POSTMAN → POST /verify-otp');
  console.log(`{`);
  console.log(`  "email": "${to}",`);
  console.log(`  "otp": "${otp}"`);
  console.log(`}`);
  console.log('='.repeat(50));
  */
  return { success: true, otp, email: to };
};
