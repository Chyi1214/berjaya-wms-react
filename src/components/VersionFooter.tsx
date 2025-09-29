// Version Footer Component

interface VersionFooterProps {
  className?: string;
}

export function VersionFooter({ className = '' }: VersionFooterProps) {
  // Get version from package.json via import.meta.env or hardcode
  const version = '6.5.17';
  const buildDate = new Date().toLocaleDateString();

  return (
    <footer className={`text-center py-4 text-xs text-gray-400 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <p>
          Berjaya WMS v{version} • Worker Zone Interface - Multilingual Support (5 Languages)
        </p>
        <p className="mt-1">
          Built with React + Firebase • {buildDate}
        </p>
      </div>
    </footer>
  );
}

export default VersionFooter;
