import { useQuery } from '@tanstack/react-query';

export default function PromotionsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Promotions</h1>
        <p className="text-gray-500 mt-1">Manage promo codes and discounts</p>
      </div>
      <div className="card text-center py-16">
        <p className="text-4xl mb-4">🎁</p>
        <p className="text-gray-500 font-medium">Promotion management coming soon</p>
        <p className="text-gray-400 text-sm mt-2">Create and manage promo codes for your passengers</p>
      </div>
    </div>
  );
}
