# platform_admin/admin_serializers.py
# Serializers for admin dashboard endpoints

from rest_framework import serializers
from account.models import Account
from core.models import FarmerProfile, InvestorProfile, BuyerProfile, Loan, InvestorReview
from payments.models import Order, PaymentTransaction
from marketplace.models import ProduceListing


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users in admin dashboard"""
    profile_type = serializers.SerializerMethodField()
    last_activity = serializers.DateTimeField(source='last_login', read_only=True)
    
    class Meta:
        model = Account
        fields = [
            'id', 'email', 'phone_number', 'full_name', 'role', 
            'is_active', 'is_staff', 'date_joined', 'last_activity', 'profile_type'
        ]
    
    def get_profile_type(self, obj):
        if hasattr(obj, 'farmer_profile'):
            return 'farmer'
        elif hasattr(obj, 'investor_profile'):
            return 'investor'
        elif hasattr(obj, 'buyer_profile'):
            return 'buyer'
        return 'basic'


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual user in admin dashboard"""
    farmer_profile = serializers.SerializerMethodField()
    investor_profile = serializers.SerializerMethodField()
    buyer_profile = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()
    total_loans = serializers.SerializerMethodField()
    
    class Meta:
        model = Account
        fields = [
            'id', 'email', 'phone_number', 'full_name', 'role', 'is_active', 
            'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'receive_level_notifications', 'receive_sms_notifications', 
            'receive_email_notifications', 'farmer_profile', 'investor_profile', 
            'buyer_profile', 'total_orders', 'total_loans'
        ]
    
    def get_farmer_profile(self, obj):
        if hasattr(obj, 'farmer_profile'):
            profile = obj.farmer_profile
            return {
                'trust_level_stars': profile.trust_level_stars,
                'trust_score_percent': profile.trust_score_percent,
                'produce': profile.produce,
                'is_discoverable_by_investors': profile.is_discoverable_by_investors
            }
        return None
    
    def get_investor_profile(self, obj):
        if hasattr(obj, 'investor_profile'):
            return {
                'investment_capacity': obj.investor_profile.investment_capacity,
                'preferred_investment_duration': obj.investor_profile.preferred_investment_duration
            }
        return None
    
    def get_buyer_profile(self, obj):
        if hasattr(obj, 'buyer_profile'):
            return {
                'organization': obj.buyer_profile.organization,
                'business_type': obj.buyer_profile.business_type
            }
        return None
    
    def get_total_orders(self, obj):
        if obj.role == 'farmer':
            return obj.farmer_sales_orders.count()
        elif obj.role == 'buyer':
            return obj.buyer_orders.count()
        return 0
    
    def get_total_loans(self, obj):
        if obj.role == 'farmer':
            return obj.loans_taken.count()
        elif obj.role in ['investor', 'platform_lender']:
            return obj.loans_given.count()
        return 0


class AdminOrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing orders in admin dashboard"""
    buyer_name = serializers.CharField(source='buyer.full_name', read_only=True)
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    produce_type = serializers.CharField(source='produce_listing.produce_type', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_name', 'farmer', 'farmer_name', 
            'produce_type', 'quantity', 'total_amount', 'status',
            'delivery_date', 'is_paid', 'is_delivered', 'is_disputed',
            'created_at', 'updated_at'
        ]


class AdminTransactionListSerializer(serializers.ModelSerializer):
    """Serializer for listing payment transactions in admin dashboard"""
    payer_name = serializers.CharField(source='payer.full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.full_name', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'order_id', 'payer', 'payer_name', 'recipient', 
            'recipient_name', 'amount', 'transaction_type', 'status',
            'gateway_reference', 'created_at'
        ]


class AdminLoanListSerializer(serializers.ModelSerializer):
    """Serializer for listing loans in admin dashboard"""
    farmer_name = serializers.CharField(source='farmer.full_name', read_only=True)
    lender_name = serializers.CharField(source='lender.full_name', read_only=True)
    lender_type = serializers.CharField(source='lender.role', read_only=True)
    
    class Meta:
        model = Loan
        fields = [
            'id', 'farmer', 'farmer_name', 'lender', 'lender_name', 
            'lender_type', 'amount', 'interest_rate', 'status',
            'date_taken', 'due_date', 'date_repaid'
        ]


class AdminTrustSystemSerializer(serializers.Serializer):
    """Serializer for trust system overview data"""
    average_trust_score = serializers.FloatField()
    trust_level_distribution = serializers.DictField()
    total_farmers = serializers.IntegerField()
    recent_reviews = serializers.SerializerMethodField()
    
    def get_recent_reviews(self, obj):
        reviews = obj.get('recent_reviews', [])
        return [
            {
                'id': review.id,
                'investor_name': review.investor.full_name,
                'farmer_name': review.farmer.full_name,
                'created_at': review.created_at
            }
            for review in reviews
        ]
