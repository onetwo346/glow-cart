const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const app = express();
const stripe = Stripe('sk_test_YourSecretKey'); // Replace with your Stripe secret key

app.use(cors());
app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  const { product } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
            },
            unit_amount: Math.round(product.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:3000/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/`,
      metadata: {
        productId: product.id,
        fileUrl: product.fileUrl,
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = 'whsec_YourWebhookSecret'; // Replace with your Stripe webhook secret

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { productId, fileUrl } = session.metadata;

    // Store purchase in database (Firebase/MongoDB)
    console.log(`Purchase completed for product ID: ${productId}, File: ${fileUrl}`);

    // Optionally send email with download link here
  }

  res.json({ received: true });
});

app.get('/api/verify-purchase/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      const product = {
        id: session.metadata.productId,
        title: session.metadata.name,
        fileUrl: session.metadata.fileUrl,
      };
      res.json({ purchased: true, product });
    } else {
      res.json({ purchased: false });
    }
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
