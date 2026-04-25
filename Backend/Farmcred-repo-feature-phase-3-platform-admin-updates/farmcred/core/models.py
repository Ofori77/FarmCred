# core/models.py
from django.db import models
from django.db.models import Sum, Q # Import Q for complex lookups
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal # Ensure Decimal is imported


# Assuming your Account model is in 'account.models'
from account.models import Account
from django.contrib.postgres.fields import ArrayField # Ensure this import is present if you use it

# NEW: Import Order model from payments app
from payments.models import Order


# core/models.py (Add these constants at the top level, after imports)

from decimal import Decimal # Ensure Decimal is imported

# --- Constants for Loan Qualification ---
MIN_TRUST_LEVEL_STARS_FOR_LOAN = Decimal('3.5')
MIN_TRUST_SCORE_PERCENT_FOR_LOAN = Decimal('65.00')
FARMCRED_DEFAULT_INTEREST_RATE = Decimal('5.0') # 5.0% annual interest

# ... (rest of your models.py content)
class FarmerProfile(models.Model):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='farmer_profile', primary_key=True)
    full_name = models.CharField(max_length=255)
    # Changed phone_number to allow null and blank for soft deletion/anonymization
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="This is a denormalized field, managed by view. Set to null on account deletion.")
    country = models.CharField(max_length=100, default='Ghana')
    region = models.CharField(max_length=100, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    home_address = models.TextField(null=True, blank=True)
    # Changed produce to JSONField as per migration for flexibility
    produce = models.JSONField(default=list, blank=True, help_text="List of produce items, e.g., ['Maize@10.50', 'Cassava@5.00']")

    # Trust related fields
    trust_level_stars = models.DecimalField(max_digits=3, decimal_places=1, default=0.0, help_text="Calculated trust level in stars (0.0 to 5.0)")
    trust_score_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Calculated trust score in percentage (0.00 to 100.00)")
    
    # New field to track discoverability by investors
    is_discoverable_by_investors = models.BooleanField(default=True, help_text="If true, this farmer can be found by investors.")

    # Financial metrics (calculated periodically)
    total_income_last_12_months = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Farmer Profile'
        verbose_name_plural = 'Farmer Profiles'

    def __str__(self):
        return self.full_name

    def get_expected_roi(self):
        """
        Calculates expected ROI based on trust level. This is a simplified example.
        Higher trust -> lower risk -> potentially lower but more reliable ROI for investor.
        Or, higher trust -> higher potential for larger investments -> higher ROI for investor.
        Let's assume higher trust means higher ROI for the investor, as they are more likely to repay.
        Example: 1 star = 5%, 5 stars = 20%
        """
        if self.trust_level_stars >= Decimal('4.5'):
            return Decimal('20.0')
        elif self.trust_level_stars >= Decimal('3.5'):
            return Decimal('15.0')
        elif self.trust_level_stars >= Decimal('2.5'):
            return Decimal('10.0')
        else:
            return Decimal('5.0')
    
    def get_max_qualified_loan_amount(self):
        """
        Calculates the maximum loan amount a farmer qualifies for based on trust level and score.
        This is a simplified example.
        Base amount + (trust_level_stars bonus) + (trust_score_percent bonus)
        """
        base_amount = Decimal('500.00') # Everyone starts with a base qualification
        
        # Bonus based on trust level stars (e.g., each star above 3.5 adds GHS 200)
        star_bonus = Decimal('0.00')
        if self.trust_level_stars > Decimal('3.5'):
            star_bonus = (self.trust_level_stars - Decimal('3.5')) * Decimal('200.00')
        
        # Bonus based on trust score percent (e.g., each percent above 65% adds GHS 10)
        score_bonus = Decimal('0.00')
        if self.trust_score_percent > Decimal('65.00'):
            score_bonus = (self.trust_score_percent - Decimal('65.00')) * Decimal('10.00')
            
        max_amount = base_amount + star_bonus + score_bonus
        return max_amount.quantize(Decimal('0.01')) # Quantize to 2 decimal places

    def on_time_repayment_ratio(self):
        """
        Calculates the ratio of on-time loan repayments to total repaid loans.
        Returns 0.0 if no loans repaid.
        """
        repaid_loans = Loan.objects.filter(farmer=self.account, status='repaid')
        total_repaid_loans = repaid_loans.count()
        
        if total_repaid_loans == 0:
            return Decimal('0.0')
        
        on_time_loans = repaid_loans.filter(on_time=True).count()
        return Decimal(on_time_loans) / Decimal(total_repaid_loans)

    def total_loans_taken(self):
        """
        Calculates the total amount of loans taken by this farmer.
        """
        total = self.account.loans_taken.aggregate(Sum('amount'))['amount__sum']
        return total if total is not None else Decimal('0.00')

    def num_loans_taken(self):
        """
        Returns the count of all loans taken by this farmer.
        """
        return self.account.loans_taken.count()

    def on_time_loans(self):
        """
        Returns the count of on-time repaid loans for this farmer.
        """
        return Loan.objects.filter(farmer=self.account, status='repaid', on_time=True).count()

    def missed_loans(self):
        """
        Returns the count of missed repayments for this farmer.
        This includes loans that were repaid late AND loans that are active and overdue.
        """
        current_date_for_comparison = timezone.localdate()

        # Loans repaid late
        late_repaid_loans = Loan.objects.filter(
            farmer=self.account,
            status='repaid',
            on_time=False,
            date_repaid__isnull=False # Ensure it was actually repaid, just late
        ).count()

        # Active loans that are overdue
        overdue_active_loans = Loan.objects.filter(
            farmer=self.account,
            status='active',
            due_date__lt=current_date_for_comparison
        ).count()
        
        total_missed = late_repaid_loans + overdue_active_loans
        return total_missed


class InvestorProfile(models.Model):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='investor_profile', primary_key=True)
    full_name = models.CharField(max_length=255)
    # Changed phone_number to allow null and blank for soft deletion/anonymization
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="This is a denormalized field, managed by view. Set to null on account deletion.")
    country = models.CharField(max_length=100, default='Ghana')
    region = models.CharField(max_length=100, null=True, blank=True)

    # Financial metrics (calculated periodically)
    total_invested_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_returns_received = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    investor_profit_loss = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00')) # NEW: For profit/loss calculation

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Investor Profile'
        verbose_name_plural = 'Investor Profiles'

    def __str__(self):
        return self.full_name

class LenderProfile(models.Model):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='lender_profile', primary_key=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    country = models.CharField(max_length=100, default='Ghana')
    region = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Lender Profile'
        verbose_name_plural = 'Lender Profiles'

    def __str__(self):
        return self.full_name

class BuyerProfile(models.Model):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='buyer_profile', primary_key=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    country = models.CharField(max_length=100, default='Ghana')
    region = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Buyer Profile'
        verbose_name_plural = 'Buyer Profiles'

    def __str__(self):
        return self.full_name


class Transaction(models.Model):
    TRANSACTION_STATUS = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    TRANSACTION_CATEGORY = [
        ('produce_sale', 'Produce Sale'),
        ('loan_repayment', 'Loan Repayment'),
        ('farm_input_purchase', 'Farm Input Purchase'),
        ('investment', 'Investment'),
        ('other', 'Other'),
        ('escrow_deposit', 'Escrow Deposit'), # NEW: For funds entering escrow
        ('escrow_release', 'Escrow Release'), # NEW: For funds leaving escrow to farmer
        ('escrow_refund', 'Escrow Refund'),   # NEW: For funds leaving escrow to buyer (refund)
    ]

    # account_party is the primary account involved in the transaction (e.g., farmer for income/expense)
    account_party = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions', help_text="The account (Farmer/Investor/Lender/Buyer) whose transaction this is.")
    
    # buyer is the counterparty for produce sales (only relevant for 'produce_sale' category)
    # It can be null if the transaction is not a produce sale, or if the buyer is not an account in the system.
    buyer = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases_made', limit_choices_to={'role': 'buyer'}, help_text="The buyer account, if applicable (e.g., for produce sales).")

    # NEW: Link to the Order model if this transaction is related to an order
    related_order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions', # Allows accessing transactions from an Order
        help_text="The related Order, if this transaction is part of an order process."
    )

    name = models.CharField(max_length=255)
    date = models.DateField(default=timezone.localdate)
    category = models.CharField(max_length=50, choices=TRANSACTION_CATEGORY, default='other')
    status = models.CharField(max_length=20, choices=TRANSACTION_STATUS) # income or expense
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-date', '-created_at'] # Order by date descending, then created_at for consistency

    def __str__(self):
        return f"{self.account_party.full_name} - {self.name} ({self.status}: {self.amount})"


class Transfer(models.Model):
    TRANSFER_TYPE = [
        ('sent', 'Sent'),
        ('received', 'Received'),
    ]
    TRANSFER_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    # Farmer is the account initiating or receiving the transfer
    farmer = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transfers', limit_choices_to={'role': 'farmer'})
    transfer_id = models.CharField(max_length=100, unique=True, help_text="Unique ID from payment gateway")
    date = models.DateField(default=timezone.localdate)
    recipient_or_sender = models.CharField(max_length=255, help_text="Name or number of the other party")
    type = models.CharField(max_length=20, choices=TRANSFER_TYPE) # sent or received
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=TRANSFER_STATUS, default='pending')
    description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Transfer'
        verbose_name_plural = 'Transfers'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Transfer {self.transfer_id} ({self.type}) by {self.farmer.full_name}"


class Loan(models.Model):
    LOAN_STATUS = [
        ('pending', 'Pending'), # Loan requested, awaiting approval/disbursement
        ('active', 'Active'),   # Loan disbursed, currently being repaid
        ('repaid', 'Repaid'),   # Loan fully repaid
        ('defaulted', 'Defaulted'), # Loan not repaid
        ('cancelled', 'Cancelled'), # Loan offer cancelled/rejected
    ]
    farmer = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='loans_taken', limit_choices_to={'role': 'farmer'})
    # Lender can be an Investor or the Platform Lender
    lender = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='loans_given', limit_choices_to=Q(role='investor') | Q(role='platform_lender'))
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_taken = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    date_repaid = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=LOAN_STATUS, default='pending')
    on_time = models.BooleanField(default=False, help_text='True if loan was repaid on or before due date.')
    
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.0'))
    repayment_period_months = models.IntegerField(default=3) # New field to define repayment period
    is_active = models.BooleanField(default=True, help_text='True if loan is still outstanding or recently repaid.')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Loan'
        verbose_name_plural = 'Loans'
        ordering = ['-date_taken']

    def __str__(self):
        return f"Loan {self.id} to {self.farmer.full_name} for {self.amount}"


class InvestorReview(models.Model):
    investor = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='reviews_given', limit_choices_to={'role': 'investor'})
    farmer = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='reviews_received', limit_choices_to={'role': 'farmer'})
    
    created_at = models.DateTimeField(auto_now_add=True) # Renamed from marked_at

    class Meta:
        verbose_name = 'Investor Review'
        verbose_name_plural = 'Investor Reviews'
        unique_together = ('investor', 'farmer') # An investor can review a farmer only once

    def __str__(self):
        return f"Review by {self.investor.full_name} for {self.farmer.full_name}"

