import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export default function handler(req, res) {
  const twiml = new VoiceResponse();
  const to = req.body?.To || req.query?.To;
  const callerId = process.env.TWILIO_CALLER_ID;

  if (to) {
    let formattedTo = String(to).replace(/[\s\-\(\)]/g, '');
    if (/^[6-9]\d{9}$/.test(formattedTo)) {
      formattedTo = '+91' + formattedTo;
    } else if (/^91\d{10}$/.test(formattedTo)) {
      formattedTo = '+' + formattedTo;
    } else if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo;
    }

    const dial = twiml.dial({
      callerId: callerId || undefined,
      answerOnBridge: true
    });
    dial.number(formattedTo);
  } else {
    twiml.say('Thanks for calling. No destination phone number was provided.');
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
}
