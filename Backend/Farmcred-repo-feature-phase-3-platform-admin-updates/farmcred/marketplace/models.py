# marketplace/models.py

from django.db import models
from account.models import Account # Import the custom Account model
from django.conf import settings # For accessing AUTH_USER_MODEL
from django.utils import timezone
from decimal import Decimal # For precise decimal fields

class ProduceListing(models.Model):
    """
    Represents a farmer's listing of produce available for sale on the marketplace.
    """
    # Constants for status
    STATUS_ACTIVE = 'active'
    STATUS_SOLD = 'sold' # Changed from 'sold_out' for conciseness
    STATUS_INACTIVE = 'inactive' # Farmer can temporarily deactivate
    STATUS_EXPIRED = 'expired' # Automatically set if available_until passes
    STATUS_DELETED = 'deleted' # For soft deletion

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_SOLD, 'Sold'),
        (STATUS_INACTIVE, 'Inactive'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_DELETED, 'Deleted'),
    ]

    # Link to the farmer who created the listing
    farmer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='produce_listings',
        limit_choices_to={'role': 'farmer'}, # Re-added limit_choices_to
        help_text="The farmer offering the produce."
    )

    # Basic produce details
    produce_type = models.CharField(max_length=100, help_text="e.g., Maize, Tomatoes, Yam, Cocoa.") # Reverted to CharField
    quantity_available = models.DecimalField(max_digits=10, decimal_places=2, help_text="Available quantity, e.g., 500.00 kg, 10.00 bags.")
    unit_of_measure = models.CharField(max_length=20, default="kg", help_text="e.g., kg, bags, crates, pieces.")
    base_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base price per unit, e.g., 2.50 GHS/kg.")

    # Discount information (optional) - Re-added original discount fields
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Optional percentage discount (e.g., 10.00 for 10%)."
    )
    discount_fixed_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Optional fixed amount discount per unit (e.g., 0.50 GHS/kg)."
    )

    # Availability and Location
    location_description = models.CharField(max_length=255, help_text="e.g., 'Ashanti Region, Kumasi', 'Near Techiman market'.")
    
    # Dates for availability
    available_from = models.DateField(default=timezone.localdate, help_text="Date from which the produce is available.")
    available_until = models.DateField(null=True, blank=True, help_text="Date until which the produce is available. Null means ongoing.")

    # Status of the listing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    # Optional image field (will store paths, not actual images) - Re-added image_url
    image_url = models.URLField(max_length=500, null=True, blank=True, help_text="URL to a photo of the produce.")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Produce Listing"
        verbose_name_plural = "Produce Listings"
        ordering = ['-created_at'] # Order by most recent listings

    def __str__(self):
        return f"{self.produce_type} ({self.quantity_available} {self.unit_of_measure}) by {self.farmer.full_name}"

    def get_current_price_per_unit(self):
        """Calculates the effective price per unit after applying discounts."""
        effective_price = self.base_price_per_unit
        if self.discount_percentage:
            effective_price -= (effective_price * self.discount_percentage / Decimal('100.00'))
        if self.discount_fixed_amount:
            effective_price -= self.discount_fixed_amount
        return max(Decimal('0.00'), effective_price) # Ensure price doesn't go negative

    def is_available(self):
        """Checks if the listing is currently active and within its availability window."""
        today = timezone.localdate()
        return self.status == ProduceListing.STATUS_ACTIVE and \
               self.available_from <= today and \
               (self.available_until is None or self.available_until >= today)


class Conversation(models.Model):
    """
    Represents a direct messaging conversation between a farmer and a buyer.
    """
    # Participants in the conversation
    farmer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='farmer_conversations',
        limit_choices_to={'role': 'farmer'}, # Re-added limit_choices_to
        help_text="The farmer participant in the conversation."
    )
    buyer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='buyer_conversations',
        limit_choices_to={'role': 'buyer'}, # Re-added limit_choices_to
        help_text="The buyer participant in the conversation."
    )

    # Optional link to a specific produce listing that initiated the conversation
    related_listing = models.ForeignKey(
        ProduceListing,
        on_delete=models.SET_NULL, # If listing is deleted, don't delete conversation
        null=True, blank=True,
        related_name='conversations',
        help_text="The produce listing that initiated this conversation (optional)."
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # Updates whenever a new message is added

    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        # Ensure only one conversation exists between a farmer and a buyer for a given listing
        unique_together = ('farmer', 'buyer', 'related_listing')
        ordering = ['-updated_at'] # Order by most recently active conversations

    def __str__(self):
        return f"Conversation between {self.farmer.full_name} and {self.buyer.full_name} (Listing: {self.related_listing.produce_type if self.related_listing else 'N/A'})"


class Message(models.Model):
    """
    Represents an individual message within a conversation.
    """
    # Status for read receipts
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('read', 'Read'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        help_text="The conversation this message belongs to."
    )
    sender = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        help_text="The sender of the message (farmer or buyer)."
    )
    recipient = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='received_messages',
        help_text="The recipient of the message (farmer or buyer)."
    )
    
    content = models.TextField(help_text="The text content of the message.")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='sent')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ['created_at'] # Order messages chronologically within a conversation

    def __str__(self):
        return f"Message from {self.sender.full_name} to {self.recipient.full_name} in {self.conversation.id}"

