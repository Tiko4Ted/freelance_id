export async function getMpesaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const environment = process.env.MPESA_ENVIRONMENT || "sandbox";

  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing M-Pesa credentials");
  }

  const baseUrl =
    environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`M-Pesa Auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function triggerStkPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string,
) {
  const token = await getMpesaToken();
  const environment = process.env.MPESA_ENVIRONMENT || "sandbox";
  const passkey = process.env.MPESA_PASSKEY;
  const shortcode = process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!passkey || !shortcode || !callbackUrl) {
    throw new Error("Missing M-Pesa STK configuration");
  }

  const baseUrl =
    environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  // YYYYMMDDHHmmss
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64",
  );

  // Format phone number to 254...
  let formattedPhone = phoneNumber.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = `254${formattedPhone.slice(1)}`;
  } else if (!formattedPhone.startsWith("254")) {
    // If it's a 9 digit number like 712345678, prepend 254
    if (formattedPhone.length === 9) {
      formattedPhone = `254${formattedPhone}`;
    }
  }

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference.slice(0, 12), // Max 12 characters usually for AccountRef
    TransactionDesc: transactionDesc,
  };

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("STK Push error:", errorText);
    throw new Error(`STK Push failed`);
  }

  return response.json();
}
