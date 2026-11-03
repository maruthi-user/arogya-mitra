export default function TableSearch({ value, onChange }) {
  return (
    <div className="w-full sm:w-72">              
              
    <input
      type="text"
      placeholder="Search..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full md:w-64 px-4 py-2 border rounded-lg bg-card border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
    />
    </div>
  );
}