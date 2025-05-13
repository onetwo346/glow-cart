function Cart({ cart, removeFromCart, proceedToCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 bg-opacity-90 p-6 overflow-y-auto neon-glow">
      <h2 className="text-2xl font-bold">Cart</h2>
      {cart.length === 0 ? (
        <p className="mt-4 text-gray-400">Your cart is empty.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.id} className="mt-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg">{item.title}</h3>
                <p className="text-cyan-400">${item.price.toFixed(2)}</p>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-red-500 hover:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          <p className="mt-6 text-xl font-bold">Total: ${total.toFixed(2)}</p>
          <button
            onClick={proceedToCheckout}
            className="mt-4 w-full bg-cyan-500 text-black py-2 rounded-md hover:bg-cyan-400 neon-glow"
          >
            Checkout
          </button>
        </>
      )}
    </div>
  );
}

export default Cart;
