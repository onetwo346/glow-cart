const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');
const app = express();
// Replace with your actual Stripe secret key (starts with 'sk_')
const stripe = Stripe('sk_test_51NxSAMPLEKEY123456789012345678901234');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Store purchase data for chatbot functionality
const purchaseDatabase = {};

// Single product checkout
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
              description: product.description || '',
              images: product.image ? [product.image] : []
            },
            unit_amount: Math.round(product.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:3005'}/?session_id={CHECKOUT_SESSION_ID}&download=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:3005'}/`,
      metadata: {
        productId: product.id,
        fileUrl: product.fileUrl,
        productTitle: product.title,
        productImage: product.image || ''
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// NEW: Cart checkout with multiple items
app.post('/api/create-cart-checkout', async (req, res) => {
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items provided' });
  }

  try {
    // Create line items for all products in the cart
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: item.description || '',
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Store product IDs and file URLs in metadata
    const metadata = {
      productIds: items.map(item => item.id).join(','),
      fileUrls: items.map(item => item.fileUrl).join(','),
      productTitles: items.map(item => item.title).join('||'),
      productImages: items.map(item => item.image || '').join('||')
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:3005'}/?session_id={CHECKOUT_SESSION_ID}&download=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:3005'}/`,
      metadata: metadata,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating cart checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Direct checkout route - redirects straight to Stripe
app.get('/direct-checkout/:productId', async (req, res) => {
  const productId = req.params.productId;
  
  try {
    // Find the product by ID (in a real app, this would come from a database)
    // For now, we're using a simple array of products
    const products = [
      { 
        id: 1, 
        title: "Quantum Blueprint", 
        price: 9.99, 
        description: "Advanced design templates with futuristic elements and cosmic themes.",
        image: "https://images.unsplash.com/photo-1545231027-637d2f6210f8", 
        fileUrl: "/downloads/cosmic-ui-kit.pdf"
      },
      { 
        id: 2, 
        title: "Neon Soundwave", 
        price: 4.99, 
        description: "Cyberpunk-inspired audio samples and synthesizer presets.",
        image: "https://images.unsplash.com/photo-1614149162883-504ce4d13909", 
        fileUrl: "/downloads/cosmic-ui-kit.pdf"
      },
      // Add more products as needed
    ];
    
    // Convert string ID to number if needed
    const searchId = isNaN(productId) ? productId : Number(productId);
    const product = products.find(p => p.id === searchId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.title,
              description: product.description || '',
              images: product.image ? [product.image] : []
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:3005'}/?session_id={CHECKOUT_SESSION_ID}&download=true`,
      cancel_url: `${req.headers.origin || 'http://localhost:3005'}/`,
      metadata: {
        productId: product.id,
        fileUrl: product.fileUrl,
        productTitle: product.title
      },
    });
    
    // Redirect directly to Stripe checkout
    res.redirect(303, session.url);
  } catch (error) {
    console.error('Error creating direct checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// For webhook handling, we need raw body
const webhookMiddleware = express.raw({type: 'application/json'});

app.post('/api/webhook', webhookMiddleware, (req, res) => {
  const sig = req.headers['stripe-signature'];
  // Store this in an environment variable in production
  const webhookSecret = 'whsec_your_webhook_secret'; 

  let event;
  try {
    // Use the raw body for webhook verification
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sessionId = session.id;
    const customerEmail = session.customer_details?.email;

    // Check if this is a cart purchase (multiple items)
    if (session.metadata.productIds) {
      const productIds = session.metadata.productIds.split(',');
      const fileUrls = session.metadata.fileUrls.split(',');
      const productTitles = session.metadata.productTitles.split('||');
      const productImages = session.metadata.productImages ? session.metadata.productImages.split('||') : [];
      
      const products = productIds.map((id, index) => ({
        id,
        title: productTitles[index] || 'Digital Product',
        fileUrl: fileUrls[index],
        image: productImages[index] || ''
      }));
      
      // Store purchase data for chatbot
      purchaseDatabase[sessionId] = {
        products,
        timestamp: new Date().toISOString(),
        customerEmail,
        isCartPurchase: true
      };
      
      console.log(`Cart purchase completed for session ID: ${sessionId}`);
      console.log(`Customer email: ${customerEmail}, Products: ${productTitles}`);
    } else {
      // Single product purchase
      const { productId, fileUrl, productTitle, productImage } = session.metadata;
      
      // Store purchase data for chatbot
      purchaseDatabase[sessionId] = {
        product: {
          id: productId,
          title: productTitle || 'Digital Product',
          fileUrl,
          image: productImage || ''
        },
        timestamp: new Date().toISOString(),
        customerEmail,
        isCartPurchase: false
      };
      
      console.log(`Purchase completed for product ID: ${productId}, File: ${fileUrl}`);
      console.log(`Customer email: ${customerEmail}, Product: ${productTitle}`);
    }

    // In a real implementation, you would:
    // 1. Store the purchase in your database
    // 2. Send an email with download link
    // 3. Create a customer record if they don't exist
  }

  res.json({ received: true });
});

app.get('/api/verify-purchase/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      // Check if this is a cart purchase (multiple items)
      if (session.metadata.productIds) {
        const productIds = session.metadata.productIds.split(',');
        const fileUrls = session.metadata.fileUrls.split(',');
        const productTitles = session.metadata.productTitles.split('||');
        const productImages = session.metadata.productImages ? session.metadata.productImages.split('||') : [];
        
        const products = productIds.map((id, index) => ({
          id,
          title: productTitles[index] || 'Digital Product',
          fileUrl: fileUrls[index],
          image: productImages[index] || ''
        }));
        
        // Store purchase data for chatbot
        purchaseDatabase[sessionId] = {
          products,
          timestamp: new Date().toISOString(),
          customerEmail: session.customer_details?.email,
          isCartPurchase: true
        };
        
        res.json({
          purchased: true,
          products,
          isCartPurchase: true,
          customerEmail: session.customer_details?.email
        });
      } else {
        // Single product purchase
        const product = {
          id: session.metadata.productId,
          title: session.metadata.productTitle || 'Digital Product',
          fileUrl: session.metadata.fileUrl,
          image: session.metadata.productImage || ''
        };
        
        // Store purchase data for chatbot
        purchaseDatabase[sessionId] = {
          product,
          timestamp: new Date().toISOString(),
          customerEmail: session.customer_details?.email,
          isCartPurchase: false
        };
        
        res.json({ 
          purchased: true, 
          product,
          isCartPurchase: false,
          customerEmail: session.customer_details?.email
        });
      }
    } else {
      res.json({ purchased: false });
    }
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

// Serve the download file directly
app.get('/api/download/:productId', async (req, res) => {
  const { productId } = req.params;
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  try {
    // Verify the purchase first
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Unauthorized access - payment not completed' });
    }
    
    // Get the file path from metadata
    const fileUrl = session.metadata.fileUrl;
    const filePath = path.join(__dirname, fileUrl);
    
    // Set headers for download
    const fileName = path.basename(fileUrl);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Chatbot API endpoints
app.get('/api/chatbot/purchases/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!purchaseDatabase[sessionId]) {
    return res.status(404).json({ error: 'No purchase found for this session' });
  }
  
  const purchaseData = purchaseDatabase[sessionId];
  res.json(purchaseData);
});

// Chatbot message endpoint
app.post('/api/chatbot/message', (req, res) => {
  const { sessionId, message } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  // Get purchase data for this session
  const purchaseData = purchaseDatabase[sessionId];
  
  if (!purchaseData) {
    return res.json({
      message: "I don't see any purchases associated with your session. If you've recently made a purchase, please refresh the page or check your email for download links."
    });
  }
  
  // Check if message contains keywords for showing downloads
  const showDownloadsKeywords = ['download', 'pdf', 'file', 'purchase', 'bought', 'show', 'get', 'access'];
  const isAskingForDownloads = showDownloadsKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  
  // If not asking for downloads, provide a general response
  if (!isAskingForDownloads) {
    return res.json({
      message: "I'm your GlowCart assistant! I can help you access your purchased downloads. Just ask me to 'show my downloads' or 'get my PDFs'."
    });
  }
  
  // Prepare response based on purchase data
  let response;
  
  if (purchaseData.isCartPurchase) {
    const productList = purchaseData.products.map(p => 
      `<div class="chatbot-product">
        <div style="display: flex; align-items: center;">
          ${p.image ? `<img src="${p.image}" class="chatbot-product-image" alt="${p.title}">` : ''}
          <div>
            <div class="chatbot-product-title">${p.title}</div>
            <a href="${p.fileUrl}" target="_blank" class="chatbot-download-link">
              <i class="fas fa-file-pdf"></i> Download PDF
            </a>
          </div>
        </div>
      </div>`
    ).join('');
    
    response = {
      message: `Here are your purchased downloads:`,
      html: productList
    };
  } else {
    const product = purchaseData.product;
    response = {
      message: `Here's your purchased download:`,
      html: `<div class="chatbot-product">
        <div style="display: flex; align-items: center;">
          ${product.image ? `<img src="${product.image}" class="chatbot-product-image" alt="${product.title}">` : ''}
          <div>
            <div class="chatbot-product-title">${product.title}</div>
            <a href="${product.fileUrl}" target="_blank" class="chatbot-download-link">
              <i class="fas fa-file-pdf"></i> Download PDF
            </a>
          </div>
        </div>
      </div>`
    };
  }
  
  res.json(response);
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
