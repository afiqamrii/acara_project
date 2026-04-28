import { Outlet } from "react-router-dom";
import { AdminSidebar } from "../../features/header/pages/AdminSidebar";

const AdminLayout = () => {
    return (
        <div className="flex h-screen w-full bg-gray-100 dark:bg-neutral-800">
            <AdminSidebar />
            <Outlet />
        </div>
    );
};

export default AdminLayout;
