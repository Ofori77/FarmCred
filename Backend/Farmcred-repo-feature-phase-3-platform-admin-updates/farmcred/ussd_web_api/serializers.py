# ussd_web_api/serializers.py

from rest_framework import serializers
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import re # Import re for phone number validation

# Import models from other apps
from account.models import Account
from core.models import FarmerProfile, InvestorProfile, Loan, Transaction, Transfer, BuyerProfile # Removed LenderProfile
from ussd.models import UssdSession, PendingConfirmation

# Import serializers from core app for nested data
from core.serializers import (
    FarmerProfileOverviewSerializer, FarmerTrustBreakdownSerializer,
    TransactionSerializer, TransferSerializer, LoanSerializer,
    FarmerListSerializer # Ensure FarmerListSerializer is imported if used
)

# --- General Purpose Serializers ---

class UssdWebLoginSerializer(serializers.Serializer):
    """
    Serializer for handling PIN-based login for Farmer/Investor via web API.
    """
    phone_number = serializers.CharField(max_length=20)
    pin = serializers.CharField(max_length=4)

    def validate(self, data):
        phone_number = data.get('phone_number')
        pin = data.get('pin')

        if not phone_number or not pin:
            raise serializers.ValidationError("Phone number and PIN are required.")

        try:
            account = Account.objects.get(phone_number=phone_number, is_active=True)
        except Account.DoesNotExist:
            raise serializers.ValidationError("Account not found or is inactive.")

        if not account.pin:
            raise serializers.ValidationError("Account has no PIN set. Please register via USSD first.")

        if not account.check_pin(pin):
            raise serializers.ValidationError("Invalid PIN.")
        
        data['account'] = account # Add account object to validated data
        return data


class ConfirmationRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for displaying pending confirmation requests.
    Includes details about initiator and target.
    """
    initiator_full_name = serializers.CharField(source='initiator_account.full_name', read_only=True)
    initiator_phone_number = serializers.CharField(source='initiator_account.phone_number', read_only=True)
    target_full_name = serializers.CharField(source='target_account.full_name', read_only=True)
    target_phone_number = serializers.CharField(source='target_account.phone_number', read_only=True)
    
    # Custom field to display request type in a human-readable format
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)

    class Meta:
        model = PendingConfirmation
        fields = [
            'id', 'confirmation_id', 'initiator_account', 'initiator_full_name',
            'initiator_phone_number', 'target_account', 'target_full_name',
            'target_phone_number', 'request_type', 'request_type_display',
            'status', 'created_at', 'expires_at', 'data_context' # Removed 'confirmed_at' as it's not always set
        ]
        read_only_fields = fields


class ConfirmationActionSerializer(serializers.Serializer):
    """
    Serializer for accepting or denying a pending confirmation request.
    """
    action = serializers.CharField(max_length=10) # 'accept' or 'deny'
    pin = serializers.CharField(max_length=4, required=False) # Optional PIN for certain actions

    def validate_action(self, value):
        if value not in ['accept', 'deny']:
            raise serializers.ValidationError("Action must be 'accept' or 'deny'.")
        return value


class FarmerProductSerializer(serializers.Serializer):
    """
    Serializer for displaying a farmer's product (name and price).
    """
    name = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)


class AddUpdateProductRequestSerializer(serializers.Serializer):
    """
    Serializer for adding or updating a farmer's product.
    """
    product_name = serializers.CharField(max_length=255)
    product_price = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_product_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Product price must be positive.")
        return value


class RemoveProductRequestSerializer(serializers.Serializer):
    """
    Serializer for removing a farmer's product.
    """
    product_name = serializers.CharField(max_length=255)


class ShareStatsLogsSerializer(serializers.Serializer):
    """
    Serializer for sharing farmer stats/logs via SMS.
    """
    recipient_phone_number = serializers.CharField(max_length=20)

    def validate_recipient_phone_number(self, value):
        # Basic phone number validation (e.g., starts with 233, 9-10 digits)
        if not re.fullmatch(r'233\d{9}', value):
            raise serializers.ValidationError("Invalid Ghanaian phone number format. Must start with 233 and be 12 digits long.")
        return value


class LoanRequestAmountSerializer(serializers.Serializer):
    """
    Serializer for a farmer to request a loan amount.
    """
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Loan amount must be positive.")
        return value


class InitiateLoanOfferSerializer(serializers.Serializer):
    """
    Serializer for an Investor to initiate a loan offer to a Farmer.
    """
    farmer_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    interest_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    repayment_period_months = serializers.IntegerField()

    def validate_farmer_id(self, value):
        try:
            farmer_account = Account.objects.get(id=value, role='farmer', is_active=True)
            if not hasattr(farmer_account, 'farmer_profile'):
                raise serializers.ValidationError("Farmer profile not found for this ID.")
            return value
        except Account.DoesNotExist:
            raise serializers.ValidationError("Farmer not found or is inactive.")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Loan amount must be positive.")
        return value

    def validate_interest_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Interest rate cannot be negative.")
        return value

    def validate_repayment_period_months(self, value):
        if value <= 0:
            raise serializers.ValidationError("Repayment period must be at least 1 month.")
        return value


class InitiateProducePurchaseSerializer(serializers.Serializer):
    """
    Serializer for a Buyer to initiate a produce purchase from a Farmer.
    This serializer will also validate the product and calculate total amount.
    """
    farmer_id = serializers.IntegerField()
    product_name = serializers.CharField(max_length=255) # The name of the product the buyer wants to buy
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2)

    # Internal field to hold the actual product name from farmer's list, after case-insensitive match
    actual_product_name = serializers.CharField(write_only=True, required=False)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True) # Calculated field

    def validate_farmer_id(self, value):
        try:
            farmer_account = Account.objects.get(id=value, role='farmer', is_active=True)
            if not hasattr(farmer_account, 'farmer_profile'):
                raise serializers.ValidationError("Farmer profile not found for this ID.")
            self.farmer_profile = farmer_account.farmer_profile # Store for later use in validate
            return value
        except Account.DoesNotExist:
            raise serializers.ValidationError("Farmer not found or is inactive.")

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        return value

    def validate(self, data):
        # This validation runs after individual field validations
        farmer_profile = getattr(self, 'farmer_profile', None)
        if not farmer_profile:
            # This case should ideally be caught by validate_farmer_id, but as a safeguard
            raise serializers.ValidationError("Farmer profile not available for product validation.")

        requested_product_name = data.get('product_name')
        quantity = data.get('quantity')

        found_product_price = None
        found_product_actual_name = None

        for p_str in farmer_profile.produce:
            if '@' in p_str:
                name, price_str = p_str.split('@')
                if name.lower() == requested_product_name.lower():
                    try:
                        found_product_price = Decimal(price_str)
                        found_product_actual_name = name # Store the actual casing from the farmer's list
                        break
                    except ValueError:
                        # Malformed price in farmer's produce list, skip
                        continue
            elif p_str.lower() == requested_product_name.lower():
                # Product found but no price, treat as invalid for purchase
                # This error is now specifically for the 'product_name' field
                raise serializers.ValidationError({'product_name': "Product found but has no price listed by farmer."})

        if found_product_price is None:
            # This error is now specifically for the 'product_name' field
            raise serializers.ValidationError({'product_name': "Product not found in farmer's listed produce."})

        # Calculate total amount
        total_amount = quantity * found_product_price
        
        data['actual_product_name'] = found_product_actual_name # Add actual name to validated data
        data['total_amount'] = total_amount # Add calculated total amount to validated data
        return data


class InitiateTrustViewSerializer(serializers.Serializer):
    """
    Serializer for an Investor to initiate a request to view a Farmer's trust details.
    """
    farmer_id = serializers.IntegerField()

    def validate_farmer_id(self, value):
        try:
            farmer_account = Account.objects.get(id=value, role='farmer', is_active=True)
            if not hasattr(farmer_account, 'farmer_profile'):
                raise serializers.ValidationError("Farmer profile not found for this ID.")
            return value
        except Account.DoesNotExist:
            raise serializers.ValidationError("Farmer not found or is inactive.")


class InitiateLoanRepaymentConfirmationSerializer(serializers.Serializer):
    """
    Serializer for a Farmer/Investor/Lender to initiate a confirmation of loan repayment.
    """
    loan_id = serializers.IntegerField()
    # This amount is what the initiator *claims* to have paid/received.
    # The target will confirm this amount.
    amount_confirmed = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    def validate_loan_id(self, value):
        try:
            Loan.objects.get(id=value)
            return value
        except Loan.DoesNotExist:
            raise serializers.ValidationError("Loan not found.")

    def validate_amount_confirmed(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

