import { useState } from "react";
import { Outlet } from "react-router-dom";
import { UserSidebar } from "../../features/header/pages/UserSidebar";
import CartDrawer from "../../features/header/pages/cartdrawer";
import VendorMessageLauncher from "../../features/bookings/components/VendorMessageLauncher";

const UserLayout = () => {
    const [cartOpen, setCartOpen] = useState(false);
    const isCustomer = ["user", "vendor"].includes(localStorage.getItem("role") ?? "");
    const isVendor = localStorage.getItem("role") === "vendor";

    return (
        <div className="flex min-h-screen w-full bg-[#f7f8fc] md:h-screen md:overflow-hidden">
            <UserSidebar onCartOpen={() => setCartOpen(true)} />
            <Outlet />
            {isCustomer && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
            {isVendor && <VendorMessageLauncher />}
        </div>
    );
};

export default UserLayout;
