export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-medium">Florus Enterprises</p>
          <p className="text-sm text-gray-600">
            Trusted wholesale and trade distribution of pharmaceutical products
          </p>
          <p className="text-xs text-gray-500 mt-4">
            © {new Date().getFullYear()} Florus Enterprises. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
