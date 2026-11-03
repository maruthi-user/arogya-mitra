import { Loader } from "lucide-react";

export default function Loaders() {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );
}