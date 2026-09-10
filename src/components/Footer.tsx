export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-2">
          <img 
            src="/florus-logo-rect.svg" 
            alt="Florus Enterprises" 
            className="h-12 w-auto mx-auto"
          />
          <p className="text-sm text-gray-600">
            Trusted Healthcare Distribution Since 2015
          </p>
          <p className="text-xs text-gray-500 mt-4">
            © {new Date().getFullYear()} Florus Enterprises. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
