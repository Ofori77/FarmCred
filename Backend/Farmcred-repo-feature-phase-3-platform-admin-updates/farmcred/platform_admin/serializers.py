# platform_admin/serializers.py

from rest_framework import serializers
from django.db.models import Sum, Count, Q, Avg # Import Avg for average rating
from decimal import Decimal
from django.utils import timezone # Import timezone for date calculations
from datetime import timedelta # Import timedelta for date calculations

# Import models from other apps
from account.models import Account
from core.models import FarmerProfile # Needed for farmer_details in order serializer
from payments.models import Order, PaymentTransaction, BuyerReview
from marketplace.models import ProduceListing

# Import serializers from other apps for nesting
from payments.serializers import PaymentTransactionSerializer, BuyerReviewSerializer
from marketplace.serializers import ProduceListingSerializer


class PlatformLenderOrderListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing orders for the Platform Lender dashboard.
    Includes essential details and participant names.
    """
    buyer_full_name = serializers.CharField(source='buyer.full_name', read_only=True)
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True)
    produce_type = serializers.CharField(source='produce_listing.produce_type', read_only=True)
    unit_of_measure = serializers.CharField(source='produce_listing.unit_of_measure', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_full_name', 'farmer', 'farmer_full_name',
            'produce_type', 'quantity', 'unit_of_measure', 'total_amount',
            'order_date', 'status', 'delivery_date', 'created_at', 'updated_at'
        ]
        # FIX: Explicitly list all fields in read_only_fields as a tuple
        read_only_fields = (
            'id', 'buyer', 'buyer_full_name', 'farmer', 'farmer_full_name',
            'produce_type', 'quantity', 'unit_of_measure', 'total_amount',
            'order_date', 'status', 'delivery_date', 'created_at', 'updated_at'
        )


class PlatformLenderOrderDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving a single order's details for the Platform Lender.
    Includes nested details for produce listing, payment transactions, and buyer review.
    This serializer is adjusted to only include fields present in the current Order model.
    """
    produce_listing_details = ProduceListingSerializer(source='produce_listing', read_only=True)
    payment_transactions = PaymentTransactionSerializer(many=True, read_only=True)
    buyer_review = BuyerReviewSerializer(read_only=True) # OneToOneField, so no many=True

    # Custom fields to get full details of buyer and farmer accounts
    buyer_details = serializers.SerializerMethodField()
    farmer_details = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_details', 'farmer', 'farmer_details',
            'produce_listing', 'produce_listing_details', 'quantity', 'total_amount',
            'order_date', 'delivery_date', 'status', 'escrow_reference',
            'is_paid', 'is_delivered', 'is_receipt_confirmed',
            'is_disputed',
            'payment_transactions', 'buyer_review', 'created_at', 'updated_at'
        ]
        # FIX: Explicitly list all fields in read_only_fields as a tuple
        read_only_fields = (
            'id', 'buyer', 'buyer_details', 'farmer', 'farmer_details',
            'produce_listing', 'produce_listing_details', 'quantity', 'total_amount',
            'order_date', 'delivery_date', 'status', 'escrow_reference',
            'is_paid', 'is_delivered', 'is_receipt_confirmed',
            'is_disputed',
            'payment_transactions', 'buyer_review', 'created_at', 'updated_at'
        )

    def get_buyer_details(self, obj):
        # Return essential buyer account details
        if obj.buyer:
            return {
                'id': obj.buyer.id,
                'full_name': obj.buyer.full_name,
                'email': obj.buyer.email,
                'phone_number': obj.buyer.phone_number,
                'role': obj.buyer.role,
            }
        return None

    def get_farmer_details(self, obj):
        # Return essential farmer account/profile details, including trust score
        if obj.farmer:
            farmer_profile = getattr(obj.farmer, 'farmer_profile', None)
            return {
                'id': obj.farmer.id,
                'full_name': obj.farmer.full_name,
                'email': obj.farmer.email,
                'phone_number': obj.farmer.phone_number,
                'role': obj.farmer.role,
                'trust_level_stars': farmer_profile.trust_level_stars if farmer_profile else None,
                'trust_score_percent': farmer_profile.trust_score_percent if farmer_profile else None,
            }
        return None


class PlatformLenderDashboardStatsSerializer(serializers.Serializer):
    """
    Serializer for aggregated statistics for the Platform Lender dashboard.
    """
    total_funds_in_escrow = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_active_orders = serializers.IntegerField()
    total_disputed_orders = serializers.IntegerField()
    total_completed_orders_last_30_days = serializers.IntegerField()
    total_transaction_value_last_30_days = serializers.DecimalField(max_digits=15, decimal_places=2)
    new_farmers_last_30_days = serializers.IntegerField()
    new_buyers_last_30_days = serializers.IntegerField()

    # No Meta class needed for Serializer (not ModelSerializer)
    # No read_only_fields needed as all fields are read-only by nature of Serializer
