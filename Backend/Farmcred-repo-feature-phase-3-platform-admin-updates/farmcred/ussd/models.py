# ussd/models.py
from django.db import models
from account.models import Account # Import the Account model
from django.utils import timezone # For expires_at
import uuid # For generating unique confirmation IDs

class UssdSession(models.Model):
    """
    Model to store and manage USSD session data for multi-step interactions.
    """
    session_id = models.CharField(max_length=255, unique=True, help_text="Unique ID from the USSD gateway for the session.")
    phone_number = models.CharField(max_length=20, help_text="Phone number of the USSD user.")
    current_menu_state = models.CharField(max_length=100, default='initial_menu', help_text="Tracks which menu/step the user is currently on.")
    previous_input = models.TextField(blank=True, null=True, help_text="Stores the user's input from the previous step.")
    # data_payload can store temporary, structured data relevant to the current session
    # e.g., {'registration_name': 'John Doe', 'product_to_add': {'name': 'Mangoes', 'price': 5}}
    data_payload = models.JSONField(default=dict, blank=True, help_text="JSON field to store temporary session-specific data.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="True if the session is ongoing, False if ended.")

    def __str__(self):
        return f"Session {self.session_id} for {self.phone_number} - State: {self.current_menu_state}"

    def update_state(self, new_state, user_input, new_payload=None):
        self.current_menu_state = new_state
        self.previous_input = user_input
        if new_payload is not None:
            self.data_payload = new_payload
        self.updated_at = timezone.now()
        self.save()

    def end_session(self):
        self.is_active = False
        self.save()


class PendingConfirmation(models.Model):
    """
    Model to store pending confirmation requests between different account types.
    e.g., Investor to Farmer (Loan Offer), Farmer to Investor (Loan Repayment),
    Buyer to Farmer (Produce Purchase), Investor to Farmer (Trust View Request).
    """
    # Define choices for request_type
    TYPE_LOAN_OFFER = 'loan_offer'
    TYPE_LOAN_REPAYMENT_CONFIRM = 'loan_repayment_confirm'
    TYPE_PRODUCE_PURCHASE_CONFIRM = 'produce_purchase_confirm'
    TYPE_TRUST_VIEW_REQUEST = 'trust_view_request' # New type for investor viewing farmer trust

    TYPE_CHOICES = [
        (TYPE_LOAN_OFFER, 'Loan Offer'),
        (TYPE_LOAN_REPAYMENT_CONFIRM, 'Loan Repayment Confirmation'),
        (TYPE_PRODUCE_PURCHASE_CONFIRM, 'Produce Purchase Confirmation'),
        (TYPE_TRUST_VIEW_REQUEST, 'Trust View Request'),
    ]

    # Define choices for status
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_DENIED = 'denied'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_DENIED, 'Denied'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    # Using UUID for confirmation_id for better uniqueness and harder to guess
    confirmation_id = models.CharField(max_length=255, unique=True, default=uuid.uuid4, help_text="Unique ID for the confirmation request.")

    initiator_account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='initiated_confirmations',
        help_text="The Account (Farmer/Lender/Buyer) who initiated the confirmation request."
    )
    target_account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='pending_confirmations_for_me',
        help_text="The Account (Farmer/Lender/Buyer) whose confirmation is awaited."
    )
    
    request_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    # Store relevant ID from your core models, e.g., Loan ID, Transaction ID
    related_object_id = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="ID of the related core model object (e.g., Loan ID, Transaction ID)."
    )
    
    # You can store more data here if needed for confirmation context, e.g., amount, specific details
    data_context = models.JSONField(default=dict, blank=True, help_text="Contextual data for the confirmation request.")

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="When this confirmation request expires.")
    confirmed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Conf. ID: {self.confirmation_id} - Type: {self.request_type} - Status: {self.status}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at

    def save(self, *args, **kwargs):
        if not self.confirmation_id:
            self.confirmation_id = str(uuid.uuid4()) # Ensure UUID is set on creation
        super().save(*args, **kwargs)

