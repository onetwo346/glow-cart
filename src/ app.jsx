import { useState } from 'react';
import Header from './components/Header';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';

// Mock Product Data (Replace with Firebase/MongoDB later)
const products = [
  {
    id: 1,
    title: 'Quantum Blueprint',
    description: 'A stunning digital PDF blueprint of a futuristic city.',
    price: 9.99,
    image: 'https://via.placeholder.com/300x200?text=Quantum+Blueprint',
    category: 'Designs',
    stripeLink: 'https://buy.stripe.com/28oeXG5xvgle4lW9AB',
  },
  {
    id: 2,
    title: 'Neon Soundwave',
    description: 'High-quality digital audio loop for creators.',
    price: 4.99,
    image: 'https://via.placeholder.com/300x200?text=Neon+Soundwave',
    category: 'Audio',
    stripeLink: 'https://buy.stripe.com/28oeXG5xvgle4lW9AB', // Replace with unique link per product
  },
  {
    id: 3,
    title: 'Cosmic Template',
    description: 'Editable digital template for portfolios.',
    price: 14.99,
    image: 'https://via.placeholder.com/300x200?text=Cosmic+Template',
    category: 'Templates',
    stripeLink: 'https://buy.stripe.com/28oeXG5xvgle4lW9AB', // Replace with unique link per product
  },
];

function App() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const proceedToCheckout = () => {
    // Redirect to Stripe Checkout (fallback to first item's link for now)
    const stripeLink = cart[0]?.stripeLink || 'https://buy.stripe.com/28oeXG5xvgle4lW9AB';
    window.location.href = stripeLink;
    // TODO: Replace with dynamic Stripe Checkout session via backend for multiple items
  };

  return (
    <div className="relative">
      <div className="grid-bg"></div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Explore the Universe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      </main>
      <Cart cart={cart} removeFromCart={removeFromCart} proceedToCheckout={proceedToCheckout} />
    </div>
  );
}

export default App;
