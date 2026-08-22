type PaypalTokenResponse = {
  access_token: string;
};

type PaypalOrderResponse = {
  id: string;
  links: Array<{
    href: string;
    rel: string;
  }>;
};

type PaypalCaptureResponse = {
  status: string;
};

export async function getPaypalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal credentials");
  }

  const baseUrl =
    environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PayPal Auth failed: ${response.statusText}`);
  }

  const data = (await response.json()) as PaypalTokenResponse;
  return data.access_token;
}

export async function createPaypalOrder(amount: number, returnUrl: string, cancelUrl: string): Promise<{
  approveLink?: string;
  orderId: string;
}> {
  const token = await getPaypalToken();
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  const baseUrl =
    environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
          description: "Freelance ID Generation",
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal Create Order error:", errorText);
    throw new Error("Failed to create PayPal order");
  }

  const order = (await response.json()) as PaypalOrderResponse;
  const approveLink = order.links.find((link) => link.rel === "approve")?.href;

  return { orderId: order.id, approveLink };
}

export async function capturePaypalOrder(orderId: string): Promise<PaypalCaptureResponse> {
  const token = await getPaypalToken();
  const environment = process.env.PAYPAL_ENVIRONMENT || "sandbox";

  const baseUrl =
    environment === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal Capture Order error:", errorText);
    throw new Error("Failed to capture PayPal order");
  }

  return (await response.json()) as PaypalCaptureResponse;
}
