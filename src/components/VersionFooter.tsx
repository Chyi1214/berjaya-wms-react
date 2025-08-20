// Version Footer Component

interface VersionFooterProps {
  className?: string;
}

export function VersionFooter({ className = '' }: VersionFooterProps) {
  // Get version from package.json via import.meta.env or hardcode
  const version = '4.0.0';
  const buildDate = new Date().toLocaleDateString();

  return (
    <footer className={`text-center py-4 text-xs text-gray-400 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <p>
          Berjaya WMS v{version} • Production Line Tracking • Car VIN Management • Worker Clock In/Out
        </p>
        <p className="mt-1">
          Built with React + Firebase • {buildDate}
        </p>
      </div>
    </footer>
  );
}

export default VersionFooter;