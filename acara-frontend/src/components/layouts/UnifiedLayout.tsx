import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../../features/header/pages/navbar";
import Footer from "../common/Footer";
import AccountTabBar from "../common/AccountTabBar";
import CartDrawer from "../../features/header/pages/cartdrawer";
import VendorMessageLauncher from "../../features/bookings/components/VendorMessageLauncher";

const UnifiedLayout = () => {
    const [cartOpen, setCartOpen] = useState(false);
    const isCustomer = ["user", "vendor"].includes(localStorage.getItem("role") ?? "");
    const isVendor = localStorage.getItem("role") === "vendor";

    return (
        <div className="flex min-h-screen flex-col bg-[#f7f6fb]">
            {/* Same navbar as marketplace */}
            <Navbar />

            {/* Account-level tab navigation */}
            <AccountTabBar />

            {/* Page content — scrollable, centered */}
            <main className="mx-auto w-full max-w-[1536px] flex-1 w-[90%] lg:w-[80%] py-6">
                <Outlet />
            </main>

            {/* Same footer as marketplace */}
            <Footer />

            {/* Drawers and floating elements */}
            {isCustomer && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
            {isVendor && <VendorMessageLauncher />}
        </div>
    );
};

export default UnifiedLayout;
