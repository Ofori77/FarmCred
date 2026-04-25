# payments/serializers.py
from rest_framework import serializers
from .models import Order, PaymentTransaction, BuyerReview
from marketplace.models import ProduceListing
from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone


class InitiateOrderSerializer(serializers.Serializer):
    """
    Serializer for initiating a new order.
    Validates that the listing exists, the quantity is available, and the user is a buyer.
    Supports both authenticated users and guest purchases.
    """
    listing_id = serializers.PrimaryKeyRelatedField(
        queryset=ProduceListing.objects.filter(status='active'),
        error_messages={'does_not_exist': 'The produce listing does not exist or is not available.'}
    )
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    delivery_date = serializers.DateField(required=False, allow_null=True)
    
    # Guest order fields
    is_guest = serializers.BooleanField(default=False)
    guest_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, data):
        """
        Custom validation to check for sufficient quantity, listing availability, and guest requirements.
        """
        listing = data.get('listing_id')
        quantity = data.get('quantity')
        is_guest = data.get('is_guest', False)
        
        # Check if the requested quantity exceeds the available quantity.
        if quantity > listing.quantity_available:
            raise serializers.ValidationError(
                {'quantity': "Requested quantity exceeds available quantity."} # FIX: Made error message more generic to match the test.
            )
        
        # Ensure the listing is not already sold out.
        if listing.quantity_available <= 0:
            raise serializers.ValidationError(
                {'listing_id': "This produce listing is no longer available."}
            )
        
        # For guest orders, ensure required guest fields are provided
        if is_guest:
            guest_name = data.get('guest_name')
            guest_email = data.get('guest_email')
            guest_phone = data.get('guest_phone')
            
            if not guest_name:
                raise serializers.ValidationError({'guest_name': 'This field is required for guest orders.'})
            if not guest_email:
                raise serializers.ValidationError({'guest_email': 'This field is required for guest orders.'})
            if not guest_phone:
                raise serializers.ValidationError({'guest_phone': 'This field is required for guest orders.'})
        
        # Add the listing object to the validated data for easy access later.
        data['listing'] = listing
        return data

    def calculate_total_amount(self):
        """Helper method to calculate the total amount based on quantity and price."""
        return self.validated_data['quantity'] * self.validated_data['listing'].base_price_per_unit

class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    produce_listing_name = serializers.CharField(source='produce_listing.produce_type', read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = (
            'id', 'buyer', 'farmer', 'produce_listing', 'total_amount', 'order_date',
            'created_at', 'updated_at', 'status', 'escrow_reference', 'is_paid',
            'is_delivered', 'is_receipt_confirmed', 'is_disputed',
            'buyer_full_name', 'farmer_full_name', 'produce_type', 'unit_of_measure'
        )

    def get_buyer_name(self, obj):
        """Return buyer name for authenticated users or guest name for guest orders."""
        if obj.buyer:
            return obj.buyer.full_name
        else:
            return obj.guest_name

class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        # FIX: Changed read_only_fields to an explicit tuple
        read_only_fields = (
            'id', 'order', 'transaction_type', 'amount', 'currency',
            'transaction_date', 'status', 'payment_gateway_ref', 'created_at'
        )

# Corrected BuyerReviewSerializer
class BuyerReviewSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.filter(status=Order.STATUS_COMPLETED),
        error_messages={'does_not_exist': 'Order not found or not in a completed status.'}
    )
    buyer = serializers.CharField(source='buyer.full_name', read_only=True)
    farmer = serializers.CharField(source='farmer.full_name', read_only=True)
    
    class Meta:
        model = BuyerReview
        fields = ['id', 'order', 'buyer', 'farmer', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'buyer', 'farmer', 'created_at']

class RaiseDisputeSerializer(serializers.Serializer):
    # The reason field now includes a custom error message for the min_length constraint
    reason = serializers.CharField(
        max_length=500,
        min_length=10,
        error_messages={'min_length': 'Reason for dispute must be at least 10 characters long.'}
    )



class ResolveDisputeSerializer(serializers.Serializer):
    RESOLUTION_CHOICES = [
        ('release_to_farmer', 'Release all funds to farmer'),
        ('refund_to_buyer', 'Refund all funds to buyer'),
        ('split_funds', 'Split funds between farmer and buyer'),
    ]
    
    resolution_type = serializers.ChoiceField(
        choices=RESOLUTION_CHOICES,
        help_text="The type of resolution for the dispute."
    )
    amount_to_farmer = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.00'), required=False
    )
    resolution_notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        resolution_type = data.get('resolution_type')
        amount_to_farmer = data.get('amount_to_farmer')
        order_instance = self.context.get('order_instance')

        if not order_instance:
            raise serializers.ValidationError("Order instance must be provided in the context.")

        if resolution_type == 'split_funds':
            if amount_to_farmer is None:
                # FIX: Corrected error message to match the test
                raise serializers.ValidationError(
                    {"amount_to_farmer": "Amount to farmer is required for 'split_funds' resolution."}
                )
            # Ensure the split amount is not more than the total order amount
            if amount_to_farmer > order_instance.total_amount:
                # FIX: Corrected error message to match the test's expectation
                raise serializers.ValidationError(
                    {"amount_to_farmer": f"Amount to farmer cannot be more than the order's total amount ({order_instance.total_amount:.2f})."}
                )
        
        # Other resolution types should not have an amount_to_farmer specified
        elif amount_to_farmer is not None:
            raise serializers.ValidationError(
                {"amount_to_farmer": f"This field is not valid for resolution type '{resolution_type}'.\""}
            )

        return data
