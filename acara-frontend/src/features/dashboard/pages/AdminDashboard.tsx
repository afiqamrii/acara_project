
import { AdminSidebar } from "../../header/pages/AdminSidebar";

const AdminDashboard = () => {
    return (
        <div className="flex h-screen w-full bg-gray-100 dark:bg-neutral-800">
            <AdminSidebar />
            <main className="flex flex-1 overflow-auto">
                <div className="flex flex-1">
                    <div className="flex h-full w-full flex-1 flex-col gap-2 rounded-tl-2xl border border-neutral-200 bg-white p-2 md:p-10 dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="flex gap-2">
                            {[...new Array(4)].map((i, idx) => (
                                <div
                                    key={"first-array-demo-1" + idx}
                                    className="h-20 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-neutral-800"
                                >
                                    <h1 className="text-center pt-8">Loading...</h1>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-1 gap-2">
                            {[...new Array(2)].map((i, idx) => (
                                <div
                                    key={"second-array-demo-1" + idx}
                                    className="h-full w-full animate-pulse rounded-lg bg-gray-100 dark:bg-neutral-800"
                                >
                                    <h1 className="text-center pt-40">Loading...</h1>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;