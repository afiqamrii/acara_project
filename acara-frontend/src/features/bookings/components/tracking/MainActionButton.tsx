import type { MainAction } from "../../utils/orderTracking";

const MainActionButton = ({
  action,
  onClick,
  pending,
}: {
  action: MainAction | null;
  onClick: () => void;
  pending?: boolean;
}) => {
  if (!action || action.kind === "none") {
    return action ? (
      <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-500">
        {action.label}
      </span>
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || action.disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Please wait..." : action.label}
    </button>
  );
};

export default MainActionButton;
