# marketplace/serializers.py

from rest_framework import serializers
from .models import ProduceListing, Conversation, Message
from account.models import Account # Assuming Account model is in account.models
from core.models import FarmerProfile # Assuming FarmerProfile is in core.models
from decimal import Decimal # For precise decimal handling

class ProduceListingSerializer(serializers.ModelSerializer):
    """
    Serializer for ProduceListing model.
    Handles creation, update, and display of produce listings.
    """
    # Read-only field to display farmer's full name
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True)
    # Read-only field to display farmer's trust level from FarmerProfile
    farmer_trust_level_stars = serializers.DecimalField(
        source='farmer.farmer_profile.trust_level_stars',
        max_digits=3, # e.g., 5.0
        decimal_places=1,
        read_only=True
    )
    # Read-only field to display farmer's trust score percent from FarmerProfile
    farmer_trust_score_percent = serializers.DecimalField(
        source='farmer.farmer_profile.trust_score_percent',
        max_digits=5, # e.g., 75.50
        decimal_places=2,
        read_only=True
    )
    # Calculate current price after discount
    current_price_per_unit = serializers.SerializerMethodField()

    class Meta:
        model = ProduceListing
        fields = [
            'id', 'farmer', 'farmer_full_name', 'produce_type', 'quantity_available',
            'unit_of_measure', 'base_price_per_unit', 'discount_percentage',
            'current_price_per_unit', 'location_description', 'available_from',
            'available_until', 'status', 'image_url', 'created_at', 'updated_at',
            'farmer_trust_level_stars', 'farmer_trust_score_percent' # Include new fields
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at', 'farmer_full_name',
                            'farmer_trust_level_stars', 'farmer_trust_score_percent']

    def get_current_price_per_unit(self, obj):
        return obj.get_current_price_per_unit()


class ProduceListingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating ProduceListing.
    Used by farmers to manage their listings.
    """
    # Ensure quantity_available has a minimum value
    quantity_available = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))
    base_price_per_unit = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.00'))
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.00'), max_value=Decimal('100.00'), required=False, default=Decimal('0.00'))

    class Meta:
        model = ProduceListing
        fields = [
            'produce_type', 'quantity_available', 'unit_of_measure',
            'base_price_per_unit', 'discount_percentage', 'location_description',
            'available_from', 'available_until', 'status', 'image_url'
        ]
        # 'farmer' will be set by the view based on the authenticated user

class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for Message model.
    Displays message content and sender/recipient details.
    """
    sender_full_name = serializers.CharField(source='sender.full_name', read_only=True)
    recipient_full_name = serializers.CharField(source='recipient.full_name', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_full_name', 'recipient', 'recipient_full_name', 'content', 'status', 'created_at']
        read_only_fields = ['id', 'conversation', 'sender', 'recipient', 'status', 'created_at', 'sender_full_name', 'recipient_full_name']

    def create(self, validated_data):
        # Conversation, sender, and recipient will be set by the view
        return Message.objects.create(**validated_data)


class ConversationSerializer(serializers.ModelSerializer):
    """
    Serializer for Conversation model.
    Displays conversation details and a list of its messages.
    """
    # Display full names of participants
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True)
    buyer_full_name = serializers.CharField(source='buyer.full_name', read_only=True)
    
    # Nested serializer to show details of the related produce listing
    related_listing_details = ProduceListingSerializer(source='related_listing', read_only=True)

    # Nested serializer to display messages within the conversation
    # Only show a few recent messages or handle pagination in the view
    messages = MessageSerializer(many=True, read_only=True) # Will fetch all messages, consider pagination for large convos

    class Meta:
        model = Conversation
        fields = [
            'id', 'farmer', 'farmer_full_name', 'buyer', 'buyer_full_name',
            'related_listing', 'related_listing_details', 'messages',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'farmer_full_name', 'buyer', 'buyer_full_name', 'created_at', 'updated_at', 'messages']

    def create(self, validated_data):
        # The 'farmer' and 'buyer' fields are typically set by the view logic
        # when a conversation is initiated, not directly by the serializer's create method
        # if they are derived from the request user and listing.
        # This serializer is primarily for displaying, not direct creation.
        return super().create(validated_data) # Call super() for default create behavior
