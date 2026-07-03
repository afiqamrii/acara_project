import { useState } from "react";
import { Outlet } from "react-router-dom";
import { UserSidebar } from "../../features/header/pages/UserSidebar";
import CartDrawer from "../../features/header/pages/cartdrawer";

const UserLayout = () => {
    const [cartOpen, setCartOpen] = useState(false);
    const isCustomer = localStorage.getItem("role") === "user";

    return (
        <div className="flex min-h-screen w-full bg-[#f7f8fc] md:h-screen md:overflow-hidden">
            <UserSidebar onCartOpen={() => setCartOpen(true)} />
            <Outlet />
            {isCustomer && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
        </div>
    );
};

export default UserLayout;
