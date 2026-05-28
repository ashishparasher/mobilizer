import Razorpay from 'razorpay';

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
});

export default razorpay;
