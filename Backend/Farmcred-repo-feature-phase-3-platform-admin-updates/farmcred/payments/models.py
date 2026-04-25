# payments/models.py

from django.db import models
from django.utils import timezone
from decimal import Decimal # For precise decimal fields

# Import models from other apps
from account.models import Account
from marketplace.models import ProduceListing # To link orders to listings

class Order(models.Model):
    """
    Represents a buyer's purchase order for a produce listing,
    central to the escrow payment system.
    """
    STATUS_PENDING_PAYMENT = 'pending_payment'
    STATUS_PAID_TO_ESCROW = 'paid_to_escrow'
    STATUS_FARMER_CONFIRMED_DELIVERY = 'farmer_confirmed_delivery'
    STATUS_BUYER_CONFIRMED_RECEIPT = 'buyer_confirmed_receipt'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_DISPUTED = 'disputed'
    STATUS_RESOLVED_TO_FARMER = 'resolved_to_farmer' # New status for dispute resolution
    STATUS_RESOLVED_TO_BUYER = 'resolved_to_buyer'   # New status for dispute resolution
    STATUS_RESOLVED_SPLIT = 'resolved_split'         # New status for dispute resolution

    # Make STATUS_CHOICES a direct class attribute
    STATUS_CHOICES = [
        (STATUS_PENDING_PAYMENT, 'Pending Payment'),
        (STATUS_PAID_TO_ESCROW, 'Paid to Escrow'),
        (STATUS_FARMER_CONFIRMED_DELIVERY, 'Farmer Confirmed Delivery'),
        (STATUS_BUYER_CONFIRMED_RECEIPT, 'Buyer Confirmed Receipt'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_DISPUTED, 'Disputed'),
        (STATUS_RESOLVED_TO_FARMER, 'Resolved (Funds to Farmer)'),
        (STATUS_RESOLVED_TO_BUYER, 'Resolved (Funds to Buyer)'),
        (STATUS_RESOLVED_SPLIT, 'Resolved (Funds Split)'),
    ]

    DISPUTE_REASON_CHOICES = [
        ('quality_issue', 'Quality Issue'),
        ('quantity_mismatch', 'Quantity Mismatch'),
        ('late_delivery', 'Late Delivery'),
        ('no_delivery', 'No Delivery'),
        ('other', 'Other'),
    ]

    buyer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='buyer_orders',
        limit_choices_to={'role': 'buyer'},
        null=True, blank=True,  # Allow null for guest orders
        help_text="The buyer who placed the order. Null for guest orders."
    )
    
    # Guest buyer information for non-authenticated purchases
    guest_name = models.CharField(max_length=255, null=True, blank=True, help_text="Name for guest orders")
    guest_email = models.EmailField(null=True, blank=True, help_text="Email for guest orders")
    guest_phone = models.CharField(max_length=20, null=True, blank=True, help_text="Phone for guest orders")
    farmer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='farmer_sales_orders',
        limit_choices_to={'role': 'farmer'},
        help_text="The farmer selling the produce."
    )
    produce_listing = models.ForeignKey(
        ProduceListing,
        on_delete=models.SET_NULL, # If listing is deleted, don't delete order, but clear link
        null=True, blank=True,
        related_name='orders',
        help_text="The produce listing associated with this order."
    )

    quantity = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity ordered.")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total amount for the order, including any discounts.")
    
    order_date = models.DateTimeField(default=timezone.now, help_text="Date and time the order was placed.")
    delivery_date = models.DateField(null=True, blank=True, help_text="Expected or actual date of delivery.")
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=STATUS_PENDING_PAYMENT, help_text="Current status of the order.")
    
    is_paid = models.BooleanField(default=False, help_text="True if the buyer has paid the total_amount into escrow.")
    is_delivered = models.BooleanField(default=False, help_text="True if the farmer has confirmed delivery.")
    is_receipt_confirmed = models.BooleanField(default=False, help_text="True if the buyer has confirmed receipt of the produce.")

    escrow_reference = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text="Unique reference for the escrow transaction.")
    
    # Dispute fields
    is_disputed = models.BooleanField(default=False, help_text="True if there is an active dispute on this order.")
    dispute_raised_by = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='disputes_initiated',
        help_text="The account that raised the dispute."
    )
    dispute_reason = models.CharField(
        max_length=100,
        choices=DISPUTE_REASON_CHOICES,
        null=True, blank=True,
        help_text="Reason for the dispute."
    )
    dispute_details = models.TextField(null=True, blank=True, help_text="Detailed explanation of the dispute.")
    dispute_raised_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when the dispute was raised.")
    dispute_resolved_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when the dispute was resolved.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ['-order_date'] # Order by newest first

    def __str__(self):
        return f"Order {self.id} - {self.produce_listing.produce_type if self.produce_listing else 'N/A'} ({self.status})"

    def update_status(self, new_status):
        """Helper to update order status and log/notify if needed."""
        if new_status not in [choice[0] for choice in self.STATUS_CHOICES]:
            raise ValueError(f"Invalid status: {new_status}")
        self.status = new_status
        self.save(update_fields=['status', 'updated_at'])


class PaymentTransaction(models.Model):
    """
    Records transactions with the payment gateway (e.g., mobile money, bank).
    These are distinct from core.Transaction which tracks internal ledger movements.
    """
    TYPE_ESCROW_DEPOSIT = 'escrow_deposit'
    TYPE_ESCROW_RELEASE = 'escrow_release'
    TYPE_ESCROW_REFUND = 'escrow_refund'
    TYPE_LOAN_DISBURSEMENT = 'loan_disbursement' # For direct loan disbursements
    TYPE_LOAN_REPAYMENT = 'loan_repayment'     # For direct loan repayments
    TYPE_DISPUTE_RESOLUTION = 'dispute_resolution'

    
    TRANSACTION_TYPES = [
        (TYPE_ESCROW_DEPOSIT, 'Escrow Deposit'),
        (TYPE_ESCROW_RELEASE, 'Escrow Release'),
        (TYPE_ESCROW_REFUND, 'Escrow Refund'),
        (TYPE_LOAN_DISBURSEMENT, 'Loan Disbursement'),
        (TYPE_LOAN_REPAYMENT, 'Loan Repayment'),
        (TYPE_DISPUTE_RESOLUTION, 'Dispute Resolution'), # FIX: Added to choices
    ]

    STATUS_PENDING = 'pending'
    STATUS_SUCCESSFUL = 'successful'
    STATUS_FAILED = 'failed'

    TRANSACTION_STATUSES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_SUCCESSFUL, 'Successful'),
        (STATUS_FAILED, 'Failed'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL, # If order is deleted, keep transaction history
        null=True, blank=True,
        related_name='payment_transactions',
        help_text="The order associated with this payment transaction."
    )
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='GHS')
    
    # Payer and Recipient are Account objects (e.g., Buyer to Escrow, Escrow to Farmer)
    payer = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments_made',
        help_text="The account initiating the payment."
    )
    recipient = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments_received',
        help_text="The account receiving the payment."
    )

    gateway_reference = models.CharField(max_length=255, unique=True, null=True, blank=True, help_text="Reference ID from the payment gateway.")
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUSES, default=STATUS_PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment Transaction"
        verbose_name_plural = "Payment Transactions"
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} - {self.transaction_type} for {self.amount} ({self.status})"


class BuyerReview(models.Model):
    """
    Represents a review given by a buyer for a completed order.
    """
    buyer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='reviews_given_as_buyer',
        limit_choices_to={'role': 'buyer'},
        help_text="The buyer who gave the review."
    )
    farmer = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='reviews_received_as_farmer',
        limit_choices_to={'role': 'farmer'},
        help_text="The farmer who received the review."
    )
    order = models.OneToOneField( # Ensures one review per order
        Order,
        on_delete=models.CASCADE,
        related_name='buyer_review',
        help_text="The specific order this review is for."
    )

    rating = models.IntegerField(
        choices=[(i, str(i)) for i in range(1, 6)], # 1 to 5 stars
        help_text="Rating given by the buyer (1-5 stars)."
    )
    comment = models.TextField(blank=True, null=True, help_text="Optional comment from the buyer.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Buyer Review"
        verbose_name_plural = "Buyer Reviews"
        unique_together = ('buyer', 'order') # A buyer can only review a specific order once
        ordering = ['-created_at']

    def __str__(self):
        return f"Review for Order {self.order.id} by {self.buyer.full_name}: {self.rating} stars"

