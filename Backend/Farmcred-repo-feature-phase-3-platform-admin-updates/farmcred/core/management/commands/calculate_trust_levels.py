# core/management/commands/calculate_trust_levels.py
from django.core.management.base import BaseCommand
from core.models import FarmerProfile, Transaction
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta, date
from django.db.models.functions import ExtractMonth, ExtractYear
import logging
from decimal import Decimal # Import Decimal
import calendar # Import calendar to get last day of month

# Import the notification utilities
from core.utils import send_sms, send_email

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Calculates and updates trust_level_stars and total_income_last_12_months for all farmers based on income consistency, and sends notifications for level changes.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting trust_level_stars and total_income_last_12_months calculation...'))

        # Define the Good Income Threshold (GIT) and consistency months
        GOOD_INCOME_THRESHOLD = 1000.00 # GHS 1000.00, as discussed
        REQUIRED_CONSISTENT_MONTHS = 8 # At least 8 of the last 12 months

        farmers_updated_stars = 0
        farmers_updated_income = 0
        total_farmers = FarmerProfile.objects.count()

        for farmer_profile in FarmerProfile.objects.all():
            farmer_account = farmer_profile.account

            today = timezone.localdate()
            # Calculate the start date for the last 12 calendar months (inclusive of the current month)
            # Example: if today is July 10, 2025, this should be July 1, 2024.
            start_date_12_months_ago = today.replace(year=today.year - 1, day=1)
            
            # Calculate the end date to include the entire current month
            last_day_of_current_month = calendar.monthrange(today.year, today.month)[1]
            end_date_current_month = today.replace(day=last_day_of_current_month)


            # Calculate total_income_last_12_months
            total_income_sum = Transaction.objects.filter(
                account_party=farmer_account,
                status='income',
                date__gte=start_date_12_months_ago,
                date__lte=end_date_current_month # Use end of current month
            ).aggregate(Sum('amount'))['amount__sum']

            new_total_income = total_income_sum if total_income_sum is not None else Decimal('0.00')

            if farmer_profile.total_income_last_12_months != new_total_income:
                farmer_profile.total_income_last_12_months = new_total_income
                farmers_updated_income += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Updated total_income_last_12_months for {farmer_profile.full_name} (ID: {farmer_profile.pk}) to {new_total_income:.2f}"
                ))


            # Calculate income consistency for the last 12 months (for trust level stars)
            income_data = Transaction.objects.filter(
                account_party=farmer_account,
                status='income',
                date__gte=start_date_12_months_ago,
                date__lte=end_date_current_month # Use end of current month
            ).annotate(
                month=ExtractMonth('date'),
                year=ExtractYear('date')
            ).values('year', 'month').annotate(
                monthly_income=Sum('amount')
            ).order_by('year', 'month')

            consistent_months_count = 0
            monthly_income_map = {
                (entry['year'], entry['month']): float(entry['monthly_income'])
                for entry in income_data
            }


            # Iterate through the last 12 months to check consistency
            # Start from the current month and go backward 12 times
            current_date_iter = today
            temp_consistent_months_count = 0 # Use a temp variable for debugging
            for i in range(12):
                target_year = current_date_iter.year
                target_month = current_date_iter.month

                income_for_month = monthly_income_map.get((target_year, target_month), 0.0)
                if income_for_month >= GOOD_INCOME_THRESHOLD:
                    temp_consistent_months_count += 1
                
                # Move to the previous month
                if current_date_iter.month == 1:
                    current_date_iter = current_date_iter.replace(year=current_date_iter.year - 1, month=12)
                else:
                    current_date_iter = current_date_iter.replace(month=current_date_iter.month - 1)
            
            consistent_months_count = temp_consistent_months_count # Assign to actual variable


            # Determine trust_level_stars based on income consistency
            old_trust_level_stars = farmer_profile.trust_level_stars
            if consistent_months_count >= REQUIRED_CONSISTENT_MONTHS:
                new_trust_level_stars = 5.0 # High trust for consistent income
            elif consistent_months_count >= 4: # Example: 4-7 months consistent
                new_trust_level_stars = 3.0
            else:
                new_trust_level_stars = 1.0 # Low trust for inconsistent income

            if farmer_profile.trust_level_stars != new_trust_level_stars:
                farmer_profile.trust_level_stars = new_trust_level_stars
                farmers_updated_stars += 1
                self.stdout.write(self.style.SUCCESS(
                    f"Updated trust_level_stars for {farmer_profile.full_name} (ID: {farmer_profile.pk}) from {old_trust_level_stars} to {new_trust_level_stars}"
                ))
                # Send notification if trust level changed and notifications are enabled
                if farmer_profile.account.receive_level_notifications:
                    email_message = (
                        f"Dear {farmer_profile.full_name},\n\n"
                        f"Your trust level has changed from {old_trust_level_stars} stars to {new_trust_level_stars} stars.\n"
                        f"Keep up the good work to maintain or improve your rating!\n\n"
                        f"FarmCred Team"
                    )
                    sms_message = (
                        f"FarmCred: Your trust level changed from {old_trust_level_stars} to {new_trust_level_stars} stars."
                    )

                    # Send email if opted in and email address exists
                    if farmer_profile.account.receive_email_notifications and farmer_profile.account.email:
                        send_email(farmer_profile.account.email, "FarmCred Trust Level Update", email_message)
                    elif not farmer_profile.account.email:
                        logger.warning(f"Skipped Email for farmer {farmer_profile.full_name} (ID: {farmer_profile.pk}) due to missing email address.")

                    # Send SMS if opted in and phone number exists (from FarmerProfile's denormalized field)
                    if farmer_profile.account.receive_sms_notifications and farmer_profile.phone_number:
                        send_sms(farmer_profile.phone_number, sms_message)
                    elif not farmer_profile.phone_number:
                        logger.warning(f"Skipped SMS for farmer {farmer_profile.full_name} (ID: {farmer_profile.pk}) due to missing phone number. (via management command)")
                else:
                    self.stdout.write(self.style.NOTICE(
                        f"Notifications disabled for {farmer_profile.full_name} (ID: {farmer_profile.pk}). Trust level changed but no notification sent."
                    ))
            else:
                self.stdout.write(self.style.NOTICE(
                    f'No change for {farmer_profile.full_name} (ID: {farmer_profile.pk}). Current: {farmer_profile.trust_level_stars:.1f}'
                ))
            
            # Save the farmer profile after all updates (income, trust score, trust stars)
            farmer_profile.save()


        self.stdout.write(self.style.SUCCESS(
            f'Finished trust_level_stars and total_income_last_12_months calculation. {farmers_updated_stars} stars updated, {farmers_updated_income} incomes updated out of {total_farmers} farmers.'
        ))

