// Version Footer Component
import { APP_VERSION } from '../version';

interface VersionFooterProps {
  className?: string;
}

export function VersionFooter({ className = '' }: VersionFooterProps) {
  // Display version (imported from single source of truth)
  const buildDate = new Date().toLocaleDateString();

  return (
    <footer className={`text-center py-4 text-xs text-gray-400 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <p>
          Berjaya WMS v{APP_VERSION} • Worker Zone Interface - Multilingual Support (5 Languages)
        </p>
        <p className="mt-1">
          Built with React + Firebase • {buildDate}
        </p>
      </div>
    </footer>
  );
}

export default VersionFooter;
