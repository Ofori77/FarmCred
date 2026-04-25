# core/serializers.py

from rest_framework import serializers
from django.db.models import Sum, Count, Q
from datetime import date, timedelta
from django.utils import timezone
from django.db.models.functions import ExtractMonth, ExtractYear
from decimal import Decimal, ROUND_HALF_UP
import calendar
from .utils import calculate_loan_roi

from account.models import Account
from .models import Transaction, Transfer, Loan, InvestorReview, FarmerProfile, InvestorProfile, BuyerProfile


class TransactionSerializer(serializers.ModelSerializer):
    account_party_full_name = serializers.CharField(source='account_party.full_name', read_only=True)
    buyer_full_name = serializers.CharField(source='buyer.full_name', read_only=True, allow_null=True)
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True, allow_null=True)


    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['account_party']


class TransferSerializer(serializers.ModelSerializer):
    # Based on models.py, 'farmer' is the ForeignKey to Account
    # 'recipient_or_sender' is a CharField for the other party's name/number
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True)
    
    class Meta:
        model = Transfer
        fields = '__all__'
        # 'farmer' is already in __all__, and it's a read-only FK
        read_only_fields = ['farmer']


class LoanSerializer(serializers.ModelSerializer):
    lender_full_name = serializers.CharField(source='lender.full_name', read_only=True)
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True)
    roi = serializers.SerializerMethodField()

    def get_roi(self, obj):
        # Calculate ROI only if the loan is fully repaid
        if obj.status == 'repaid':
            roi_value = calculate_loan_roi(obj)
            return roi_value
        return None

    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ['farmer', 'lender']


class InvestorReviewSerializer(serializers.ModelSerializer):
    farmer_full_name = serializers.CharField(source='farmer.full_name', read_only=True)
    farmer_phone_number = serializers.CharField(source='farmer.phone_number', read_only=True)
    investor_full_name = serializers.CharField(source='investor.full_name', read_only=True)

    class Meta:
        model = InvestorReview
        fields = '__all__'
        read_only_fields = ['investor', 'farmer']


class FarmerProfileSerializer(serializers.ModelSerializer):
    account_id = serializers.IntegerField(source='account.id', read_only=True)
    phone_number = serializers.CharField(source='account.phone_number', read_only=True)
    email = serializers.EmailField(source='account.email', read_only=True)
    
    receive_level_notifications = serializers.BooleanField(source='account.receive_level_notifications', required=False)
    receive_sms_notifications = serializers.BooleanField(source='account.receive_sms_notifications', required=False)
    receive_email_notifications = serializers.BooleanField(source='account.receive_email_notifications', required=False)

    class Meta:
        model = FarmerProfile
        fields = [
            'account_id', 'full_name', 'phone_number', 'email', 'country', 'region', 'dob',
            'national_id', 'home_address', 'produce',
            'trust_level_stars', 'trust_score_percent', 'total_income_last_12_months',
            'is_discoverable_by_investors',
            'receive_level_notifications', 'receive_sms_notifications', 'receive_email_notifications'
        ]
        read_only_fields = [
            'trust_level_stars', 'trust_score_percent', 'total_income_last_12_months'
        ]


class FarmerProfileOverviewSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='account.id', read_only=True)
    current_month_income = serializers.SerializerMethodField()
    current_month_expenses = serializers.SerializerMethodField()
    total_loans_taken = serializers.SerializerMethodField()
    active_loans = serializers.SerializerMethodField()
    overdue_loans = serializers.SerializerMethodField()

    class Meta:
        model = FarmerProfile
        fields = [
            'id',
            'full_name', 'trust_level_stars', 'trust_score_percent',
            'total_income_last_12_months', 'current_month_income',
            'current_month_expenses', 'total_loans_taken', 'active_loans',
            'overdue_loans'
        ]

    def get_current_month_income(self, obj):
        current_month = timezone.localdate().month
        current_year = timezone.localdate().year
        income = Transaction.objects.filter(
            account_party=obj.account,
            status='income',
            date__month=current_month,
            date__year=current_year
        ).aggregate(Sum('amount'))['amount__sum']
        return str(income) if income is not None else str(Decimal('0.00'))

    def get_current_month_expenses(self, obj):
        current_month = timezone.localdate().month
        current_year = timezone.localdate().year
        expenses = Transaction.objects.filter(
            account_party=obj.account,
            status='expense',
            date__month=current_month,
            date__year=current_year
        ).aggregate(Sum('amount'))['amount__sum']
        return str(expenses) if expenses is not None else str(Decimal('0.00'))

    def get_total_loans_taken(self, obj):
        return obj.num_loans_taken() 

    def get_active_loans(self, obj):
        return Loan.objects.filter(farmer=obj.account, status='active').count()

    def get_overdue_loans(self, obj):
        return Loan.objects.filter(
            farmer=obj.account,
            status='active',
            due_date__lt=timezone.localdate()
        ).count()


class FarmerTrustBreakdownSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='account.id', read_only=True)
    total_loans_taken = serializers.SerializerMethodField()
    on_time_repayments = serializers.SerializerMethodField()
    missed_repayments = serializers.SerializerMethodField()
    income_consistency_months = serializers.SerializerMethodField()
    average_monthly_income = serializers.SerializerMethodField()

    class Meta:
        model = FarmerProfile
        fields = [
            'id',
            'full_name', 'trust_level_stars', 'trust_score_percent',
            'total_loans_taken', 'on_time_repayments', 'missed_repayments',
            'total_income_last_12_months', 'income_consistency_months',
            'average_monthly_income'
        ]

    def get_total_loans_taken(self, obj):
        return obj.num_loans_taken() 

    def get_on_time_repayments(self, obj):
        return obj.on_time_loans() 

    def get_missed_repayments(self, obj):
        return obj.missed_loans() 

    def get_income_consistency_months(self, obj):
        today = timezone.localdate()
        GOOD_INCOME_THRESHOLD = 1000.00

        start_date_12_months_ago = today.replace(year=today.year - 1, day=1)
        last_day_of_current_month = calendar.monthrange(today.year, today.month)[1]
        end_date_current_month = today.replace(day=last_day_of_current_month)

        income_data = Transaction.objects.filter(
            account_party=obj.account,
            status='income',
            date__gte=start_date_12_months_ago,
            date__lte=end_date_current_month
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

        current_date_iter = today
        temp_consistent_months_count = 0
        for i in range(12):
            target_year = current_date_iter.year
            target_month = current_date_iter.month

            income_for_month = monthly_income_map.get((target_year, target_month), 0.0)
            if income_for_month >= GOOD_INCOME_THRESHOLD:
                temp_consistent_months_count += 1
            
            if current_date_iter.month == 1:
                current_date_iter = current_date_iter.replace(year=current_date_iter.year - 1, month=12)
            else:
                current_date_iter = current_date_iter.replace(month=current_date_iter.month - 1)
        
        consistent_months_count = temp_consistent_months_count

        return consistent_months_count

    def get_average_monthly_income(self, obj):
        today = timezone.localdate()
        start_date_for_12_months = today.replace(year=today.year - 1, day=1)
        last_day_of_current_month = calendar.monthrange(today.year, today.month)[1]
        end_date_current_month = today.replace(day=last_day_of_current_month)

        total_income_aggregate = Transaction.objects.filter(
            account_party=obj.account,
            status='income',
            date__gte=start_date_for_12_months,
            date__lte=end_date_current_month
        ).aggregate(Sum('amount'))['amount__sum']
        
        num_months_with_income = Transaction.objects.filter(
            account_party=obj.account,
            status='income',
            date__gte=start_date_for_12_months,
            date__lte=end_date_current_month
        ).annotate(
            month=ExtractMonth('date'),
            year=ExtractYear('date')
        ).values('year', 'month').distinct().count()

        if num_months_with_income > 0 and total_income_aggregate is not None:
            return (Decimal(total_income_aggregate) / num_months_with_income).quantize(Decimal('0.00'), rounding=ROUND_HALF_UP)
        return Decimal('0.00')


class FarmerListSerializer(FarmerProfileOverviewSerializer):
    """
    Serializer specifically for listing farmers, inheriting basic overview.
    Ensures 'id' is available from FarmerProfileOverviewSerializer.
    """
    class Meta(FarmerProfileOverviewSerializer.Meta):
        fields = FarmerProfileOverviewSerializer.Meta.fields


class FarmerDetailSerializer(serializers.ModelSerializer):
    account_id = serializers.IntegerField(source='account.id', read_only=True)
    phone_number = serializers.CharField(source='account.phone_number', read_only=True)
    email = serializers.EmailField(source='account.email', read_only=True)
    
    transactions = serializers.SerializerMethodField()
    transfers = serializers.SerializerMethodField()
    loans = serializers.SerializerMethodField()
    
    class Meta:
        model = FarmerProfile
        fields = [
            'account_id', 'full_name', 'phone_number', 'email', 'country', 'region', 'dob',
            'national_id', 'home_address', 'produce',
            'trust_level_stars', 'trust_score_percent', 'total_income_last_12_months',
            'transactions', 'transfers', 'loans',
        ]

    def get_transactions(self, obj):
        transactions = Transaction.objects.filter(account_party=obj.account).order_by('-date')[:5]
        return TransactionSerializer(transactions, many=True).data

    def get_transfers(self, obj):
        # FIX: Query using the 'farmer' ForeignKey on the Transfer model and order by 'date'
        transfers = Transfer.objects.filter(farmer=obj.account).order_by('-date')[:5]
        return TransferSerializer(transfers, many=True).data

    def get_loans(self, obj):
        loans = Loan.objects.filter(farmer=obj.account).order_by('-date_taken')[:5]
        return LoanSerializer(loans, many=True).data


class InvestorProfileSerializer(serializers.ModelSerializer):
    account_id = serializers.IntegerField(source='account.id', read_only=True)
    phone_number = serializers.CharField(source='account.phone_number', read_only=True)
    email = serializers.EmailField(source='account.email', read_only=True)

    receive_level_notifications = serializers.BooleanField(source='account.receive_level_notifications', required=False)
    receive_sms_notifications = serializers.BooleanField(source='account.receive_sms_notifications', required=False)
    receive_email_notifications = serializers.BooleanField(source='account.receive_email_notifications', required=False)

    total_principal_lent = serializers.SerializerMethodField()
    num_farmers_funded = serializers.SerializerMethodField()
    investor_profit_loss = serializers.SerializerMethodField()

    class Meta:
        model = InvestorProfile
        fields = [
            'account_id', 'full_name', 'phone_number', 'email', 'country', 'region',
            'total_principal_lent', 'num_farmers_funded', 'investor_profit_loss',
            'receive_level_notifications', 'receive_sms_notifications', 'receive_email_notifications'
        ]

    def get_total_principal_lent(self, obj):
        total = Loan.objects.filter(lender=obj.account).aggregate(Sum('amount'))['amount__sum']
        return total if total is not None else Decimal('0.00')

    def get_num_farmers_funded(self, obj):
        return Loan.objects.filter(lender=obj.account).values('farmer').distinct().count()

    def get_investor_profit_loss(self, obj):
        loans_given = Loan.objects.filter(lender=obj.account)
        
        total_lent = loans_given.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        
        total_repaid_income = Transaction.objects.filter(
            account_party=obj.account,
            category='loan_repayment',
            status='income'
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        return total_repaid_income - total_lent


class BuyerProfileSerializer(serializers.ModelSerializer):
    account_id = serializers.IntegerField(source='account.id', read_only=True)
    phone_number = serializers.CharField(source='account.phone_number', read_only=True)
    email = serializers.EmailField(source='account.email', read_only=True)

    receive_level_notifications = serializers.BooleanField(source='account.receive_level_notifications', required=False)
    receive_sms_notifications = serializers.BooleanField(source='account.receive_sms_notifications', required=False)
    receive_email_notifications = serializers.BooleanField(source='account.receive_email_notifications', required=False)


    class Meta:
        model = BuyerProfile
        fields = [
            'account_id', 'full_name', 'phone_number', 'email', 'country', 'region',
            'receive_level_notifications', 'receive_sms_notifications', 'receive_email_notifications'
        ]


class FarmCredPlatformLenderSerializer(serializers.ModelSerializer):
    total_loans_issued_by_platform = serializers.SerializerMethodField()
    total_repayments_received_by_platform = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'full_name', 'email', 'phone_number',
            'total_loans_issued_by_platform', 'total_repayments_received_by_platform'
        ]
        read_only_fields = fields

    def get_total_loans_issued_by_platform(self, obj):
        total = Loan.objects.filter(lender=obj).aggregate(Sum('amount'))['amount__sum']
        return total if total is not None else Decimal('0.00')

    def get_total_repayments_received_by_platform(self, obj):
        total_repaid = Transaction.objects.filter(
            account_party=obj,
            category='loan_repayment',
            status='income'
        ).aggregate(Sum('amount'))['amount__sum']
        return total_repaid if total_repaid is not None else Decimal('0.00')

