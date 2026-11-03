/**
 * Tab bar. Optional `actions` node renders on the right of the same row
 * (e.g. an "Add" button), keeping the tab underline running across.
 */
export default function Tabs({ tabs = [], activeTab, onChange, actions = null }) {
  return (
    <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
      <div className="flex min-w-0 flex-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`
              relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition
              ${
                activeTab === tab.key
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }
            `}
          >
            {tab.label}

            {/* underline */}
            {activeTab === tab.key && (
              <span className="absolute left-0 bottom-0 w-full h-[2px] bg-blue-600 dark:bg-blue-400 rounded"></span>
            )}
          </button>
        ))}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
    </div>
  );
}