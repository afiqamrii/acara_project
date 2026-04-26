import { Outlet } from "react-router-dom";
import { UserSidebar } from "../../features/header/pages/UserSidebar";

const UserLayout = () => {
    return (
        <div className="flex min-h-screen w-full bg-[#f7f8fc] md:h-screen md:overflow-hidden">
            <UserSidebar />
            <Outlet />
        </div>
    );
};

export default UserLayout;
