# core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Loan, FarmerProfile
from django.db.models import Sum, Q # Import Q for complex lookups
from datetime import date, timedelta # Import for date calculations if needed for trust_score_percent logic
from django.utils import timezone # Import timezone

@receiver(post_save, sender=Loan)
def update_farmer_trust_score_on_loan_save(sender, instance, created, **kwargs):
    """
    Signal receiver to update a farmer's trust_score_percent whenever a Loan
    object associated with them is saved (created or updated).
    """
    farmer_account = instance.farmer # The Account instance linked to the loan
    
    # Ensure this is a farmer's account and they have a FarmerProfile
    try:
        farmer_profile = FarmerProfile.objects.get(account=farmer_account)
    except FarmerProfile.DoesNotExist:
        # If no farmer profile exists for this account, we cannot update trust score.
        # This might indicate an inconsistency, or a non-farmer account took a loan.
        print(f"Warning: Loan saved for account {farmer_account.email} but no FarmerProfile found.")
        return

    # Get all loans for this specific farmer
    all_loans = Loan.objects.filter(farmer=farmer_account)
    total_loans = all_loans.count()

    if total_loans == 0:
        # If no loans, set a default score (e.g., 50%)
        new_trust_score_percent = 50.00
    else:
        # Count on-time repaid loans
        on_time_loans = all_loans.filter(on_time=True, date_repaid__isnull=False).count()

        # Count missed loans:
        # A loan is "missed" if it was repaid but not on time (on_time=False)
        # OR if it's active/overdue and its due_date is in the past (not repaid)
        missed_loans = all_loans.filter(
            Q(on_time=False, date_repaid__isnull=False) | # Repaid late
            Q(status='active', date_repaid__isnull=True, due_date__lt=timezone.localdate()) # Overdue and not repaid
        ).count()

        # Apply the trust score calculation logic:
        # (on_time_loans / total_loans) * 70 + (1 - (missed_loans / total_loans)) * 30
        
        # Avoid division by zero if total_loans somehow becomes zero (shouldn't if in this 'else' block)
        # Ensure that on_time_loans and missed_loans are not greater than total_loans for ratio calculation
        on_time_ratio = on_time_loans / total_loans
        missed_ratio = missed_loans / total_loans

        on_time_contribution = on_time_ratio * 70
        missed_contribution = (1 - missed_ratio) * 30 # (1 - proportion of missed loans) contributes to score
        
        new_trust_score_percent = on_time_contribution + missed_contribution
        
        # Ensure score is between 0 and 100
        new_trust_score_percent = max(0.0, min(100.0, new_trust_score_percent))

    # Update the farmer's profile, but avoid infinite loop by disabling signals
    # for this specific save operation.
    if farmer_profile.trust_score_percent != new_trust_score_percent:
        farmer_profile.trust_score_percent = new_trust_score_percent
        # Temporarily disconnect the signal to prevent a recursive call to save()
        post_save.disconnect(update_farmer_trust_score_on_loan_save, sender=Loan)
        farmer_profile.save(update_fields=['trust_score_percent'])
        # Reconnect the signal after saving
        post_save.connect(update_farmer_trust_score_on_loan_save, sender=Loan)
        print(f"Updated trust_score_percent for {farmer_profile.full_name} to {new_trust_score_percent:.2f}%")

