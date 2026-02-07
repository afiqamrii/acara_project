type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 z-[99]
          bg-black/45
          transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 z-[100]
          h-screen w-[380px]
          bg-white
          flex flex-col
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">List Purchase</h2>
          <button
            onClick={onClose}
            className="text-xl text-gray-500 hover:text-gray-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto text-gray-600">
          <p>Your cart is empty.</p>
        </div>

        {/* Footer */}
        <div className="p-5 border-t">
          <div className="mb-4 font-medium text-gray-800">
            Subtotal: MYR 0.00
          </div>

          <button
            className="
              w-full
              bg-purple-600
              text-white
              py-3
              rounded-lg
              font-semibold
              transition
              hover:bg-purple-700
            "
          >
            Checkout
          </button>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
