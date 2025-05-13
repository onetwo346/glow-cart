function ProductCard({ product, addToCart }) {
  return (
    <div className="card-3d p-4 bg-gray-900 bg-opacity-80 rounded-lg neon-glow">
      <img
        src={product.image}
        alt={product.title}
        className="w-full h-48 object-cover rounded-md"
      />
      <h3 className="mt-4 text-xl font-semibold">{product.title}</h3>
      <p className="mt-2 text-gray-300">{product.description}</p>
      <p className="mt-2 text-cyan-400 font-bold">${product.price.toFixed(2)}</p>
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => addToCart(product)}
          className="flex-1 bg-cyan-500 text-black py-2 rounded-md hover:bg-cyan-400 neon-glow"
        >
          Add to Cart
        </button>
        <button
          onClick={() => (window.location.href = product.stripeLink)}
          className="flex-1 bg-purple-500 text-white py-2 rounded-md hover:bg-purple-400 neon-glow"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
