"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/redux/hooks/useCart";
import { useInitiateOrder } from "@/hooks/useMarketPlace";
import { MarketplaceNavbar } from "@/components/marketplace/Navbar";
import { toast } from "sonner";
import { ShoppingCart, ArrowLeft, Shield, Trash2 } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, removeItem, clear: clearCart, totalAmount } = useCart();
  const { initiateOrder, loading: orderLoading } = useInitiateOrder();
  
  // Default to guest checkout (no authentication required)
  const [isGuestCheckout, setIsGuestCheckout] = useState(true);
  const [guestInfo, setGuestInfo] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: ''
  });
  
  const [deliveryDate, setDeliveryDate] = useState('');
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (!deliveryDate) {
    setDeliveryDate(formatDate(tomorrow));
  }

  const handlePlaceOrders = async () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Validate guest information (always required)
    if (!guestInfo.guest_name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!guestInfo.guest_email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!guestInfo.guest_phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestInfo.guest_email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      const orderPromises = cartItems.map(async (item) => {
        const orderData = {
          listing_id: item.id,
          quantity: item.quantity,
          delivery_date: deliveryDate,
          guest_name: guestInfo.guest_name,
          guest_email: guestInfo.guest_email,
          guest_phone: guestInfo.guest_phone
        };
        return await initiateOrder(orderData);
      });

      await Promise.all(orderPromises);
      
      clearCart();
      
      toast.success("All orders placed successfully!", {
        description: "You will receive updates via email and SMS.",
      });
      
      // Redirect back to marketplace after successful orders
      setTimeout(() => {
        router.push('/marketplace');
      }, 2000);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to place some orders");
    }
  };

  const handleSingleCheckout = (itemId: number, quantity: number) => {
    router.push(`/marketplace/buy/${itemId}?quantity=${quantity}`);
  };

  if (cartItems.length === 0) {
    return (
      <>
        <MarketplaceNavbar />
        <div className="min-h-screen bg-gray-50 pt-24">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-600 mb-4">Your cart is empty</h2>
              <p className="text-gray-500 mb-8">Add some products to your cart before checking out.</p>
              <Link href="/marketplace">
                <Button className="bg-[#158f20] hover:bg-[#117d1b]">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MarketplaceNavbar />
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back Button */}
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-[#158f20] hover:text-[#117d1b] mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Your Items ({cartItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.image || '/images/placeholder.png'}
                          alt={item.name}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-600">by {item.farmerName}</p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity} {item.unit_of_measure}
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          ₵{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSingleCheckout(item.id, item.quantity)}
                        >
                          Checkout Separately
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Checkout Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Checkout Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Guest Information Fields */}
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900">Your Information</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="guest_name">Full Name *</Label>
                        <Input
                          id="guest_name"
                          type="text"
                          placeholder="Enter your full name"
                          value={guestInfo.guest_name}
                          onChange={(e) => setGuestInfo(prev => ({
                            ...prev,
                            guest_name: e.target.value
                          }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="guest_email">Email Address *</Label>
                        <Input
                          id="guest_email"
                          type="email"
                          placeholder="Enter your email address"
                          value={guestInfo.guest_email}
                          onChange={(e) => setGuestInfo(prev => ({
                            ...prev,
                            guest_email: e.target.value
                          }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="guest_phone">Phone Number *</Label>
                        <Input
                          id="guest_phone"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={guestInfo.guest_phone}
                          onChange={(e) => setGuestInfo(prev => ({
                            ...prev,
                            guest_phone: e.target.value
                          }))}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-blue-700">
                      * Order updates will be sent to your email and phone number
                    </p>
                  </div>

                  {/* Delivery Date */}
                  <div>
                    <Label htmlFor="delivery">Delivery Date</Label>
                    <Input
                      id="delivery"
                      type="date"
                      value={deliveryDate}
                      min={formatDate(tomorrow)}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                  
                  {/* Order Summary */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-2">Order Summary</h4>
                    <div className="space-y-1 text-sm">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.name} × {item.quantity}</span>
                          <span>₵{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span className="text-[#158f20]">₵{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Place Order Button */}
                  <Button
                    onClick={handlePlaceOrders}
                    disabled={orderLoading || (!guestInfo.guest_name.trim() || !guestInfo.guest_email.trim() || !guestInfo.guest_phone.trim())}
                    className="w-full bg-gradient-to-br from-[#128f20] to-[#72BF01] text-white hover:opacity-90"
                  >
                    {orderLoading ? "Processing..." : `Place All Orders - ₵${totalAmount.toFixed(2)}`}
                  </Button>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>✓ Payments held in escrow until delivery</p>
                    <p>✓ Buyer protection guaranteed</p>
                    <p>✓ Easy dispute resolution</p>
                    <p className="text-blue-600 font-medium">
                      ✓ Order updates sent via email and SMS
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
