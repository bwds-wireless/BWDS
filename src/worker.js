// Cloudflare Worker – BWDS Stripe Checkout + static asset serving

const CORS = {
  'Access-Control-Allow-Origin': 'https://bwds4wifi.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (pathname === '/create-checkout-session' && request.method === 'POST') {
      return handleCreateCheckout(request, env);
    }

    if (pathname === '/stripe-webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleCreateCheckout(request, env) {
  try {
    const { invoiceNumber, amountUsd, email } = await request.json();

    if (!invoiceNumber || !amountUsd) {
      return jsonErr('Invoice number and amount are required.', 400);
    }

    const amountCents = Math.round(parseFloat(amountUsd) * 100);
    if (isNaN(amountCents) || amountCents < 50) {
      return jsonErr('Amount must be at least $0.50.', 400);
    }

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amountCents),
      'line_items[0][price_data][product_data][name]': `BWDS Invoice ${invoiceNumber}`,
      'line_items[0][price_data][product_data][description]':
        'Broadband Wireless Design Studio – Professional Wireless Services',
      'line_items[0][quantity]': '1',
      success_url: `${origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      'metadata[invoice_number]': invoiceNumber,
    });

    if (email) params.set('customer_email', email);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe error', session);
      return jsonErr(session.error?.message ?? 'Payment session creation failed.', 502);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (err) {
    console.error('Checkout handler error', err);
    return jsonErr('Internal server error.', 500);
  }
}

async function handleWebhook(request, env) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  if (env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    console.log(
      `Payment received – invoice ${s.metadata?.invoice_number}, ` +
      `$${(s.amount_total / 100).toFixed(2)}, ${s.customer_email ?? 'no email'}`
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const { t: timestamp, v1: signature } = parts;
  if (!timestamp || !signature) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const raw = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`));
  const computed = Array.from(new Uint8Array(raw))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === signature;
}

function jsonErr(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
