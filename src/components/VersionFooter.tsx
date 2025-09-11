// Version Footer Component

interface VersionFooterProps {
  className?: string;
}

export function VersionFooter({ className = '' }: VersionFooterProps) {
  // Get version from package.json via import.meta.env or hardcode
  const version = '5.10.6';
  const buildDate = new Date().toLocaleDateString();

  return (
    <footer className={`text-center py-4 text-xs text-gray-400 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <p>
          Berjaya WMS v{version} • Item Master CSV Debug • Enhanced Logging
        </p>
        <p className="mt-1">
          Built with React + Firebase • {buildDate}
        </p>
      </div>
    </footer>
  );
}

export default VersionFooter;
