from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Sum
from datetime import date, timedelta
from django.utils import timezone
from django.db.models.functions import ExtractMonth, ExtractYear
from django.db.models import Q
from django.contrib.auth.hashers import check_password
from decimal import Decimal
from django.shortcuts import get_object_or_404

# NEW: Import serializers here because FarmCredPlatformLenderSerializer is defined in this file
from rest_framework import serializers
from core.permissions import IsInvestor # Corrected import

from account.models import Account
from .models import Transaction, Transfer, Loan, InvestorReview, FarmerProfile, InvestorProfile, BuyerProfile
from payments.models import Order  # Import Order model for farmer order management
from .serializers import (
    TransactionSerializer, TransferSerializer, LoanSerializer, InvestorReviewSerializer,
    FarmerProfileOverviewSerializer, FarmerTrustBreakdownSerializer,
    FarmerListSerializer, FarmerDetailSerializer,
    FarmerProfileSerializer, InvestorProfileSerializer,
    BuyerProfileSerializer
)
from payments.serializers import OrderSerializer  # Import OrderSerializer for farmer order views
# Import the new permission class
from .permissions import IsFarmer, IsInvestor, IsBuyer, IsPlatformLenderOrAdmin


# --- Farmer Dashboard Endpoints (Primary Web API) ---

@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_profile(request):
    """
    GET /api/farmer/profile/
    Retrieves the authenticated farmer's profile data.

    PUT /api/farmer/profile/
    Updates the authenticated farmer's profile data.
    """
    farmer_profile = request.user.farmer_profile
    
    if request.method == 'GET':
        serializer = FarmerProfileSerializer(farmer_profile)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        mutable_data = request.data.copy()
        
        account_fields = {}
        if 'phone_number' in mutable_data:
            # Update phone_number directly on the Account model
            request.user.phone_number = mutable_data.pop('phone_number')
            request.user.save(update_fields=['phone_number'])
            # Also update the denormalized phone_number on FarmerProfile
            farmer_profile.phone_number = request.user.phone_number
            farmer_profile.save(update_fields=['phone_number'])


        if 'email' in mutable_data:
            account_fields['email'] = mutable_data.pop('email')
        if 'receive_level_notifications' in mutable_data:
            account_fields['receive_level_notifications'] = mutable_data.pop('receive_level_notifications')
        if 'receive_sms_notifications' in mutable_data:
            account_fields['receive_sms_notifications'] = mutable_data.pop('receive_sms_notifications')
        if 'receive_email_notifications' in mutable_data:
            account_fields['receive_email_notifications'] = mutable_data.pop('receive_email_notifications')

        partial = request.method == 'PATCH'
        
        serializer = FarmerProfileSerializer(farmer_profile, data=mutable_data, partial=partial)
        
        if serializer.is_valid():
            # Save account-related fields
            if account_fields:
                for field, value in account_fields.items():
                    setattr(request.user, field, value)
                request.user.save(update_fields=account_fields.keys())

            # Save farmer profile fields
            serializer.save() 
            
            request.user.refresh_from_db()
            farmer_profile.refresh_from_db()
            return Response(FarmerProfileSerializer(farmer_profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_overview(request):
    """
    GET /api/farmer/overview/
    Retrieves key overview statistics for the authenticated farmer,
    including trust score, current month income/expenses, etc.
    """
    farmer_profile = request.user.farmer_profile
    serializer = FarmerProfileOverviewSerializer(farmer_profile)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_transactions(request):
    """
    GET /api/farmer/transactions/
    Lists transactions for the authenticated farmer.
    Allows filtering by category, status, and date range.

    POST /api/farmer/transactions/
    Records a new transaction for the authenticated farmer.
    """
    if request.method == 'GET':
        # UPDATED: Filter by account_party instead of farmer
        transactions = Transaction.objects.filter(account_party=request.user).order_by('-date')

        category = request.query_params.get('category')
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if category:
            transactions = transactions.filter(category=category)
        if status_filter:
            transactions = transactions.filter(status=status_filter)
        if date_from:
            transactions = transactions.filter(date__gte=date_from)
        if date_to:
            transactions = transactions.filter(date__lte=date_to)
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        mutable_data = request.data.copy()
        # UPDATED: Set account_party to the requesting user's ID
        mutable_data['account_party'] = request.user.id

        # If a buyer is specified by ID, ensure it's a valid buyer account
        # This block is now simplified as the serializer will handle the ID to object conversion
        buyer_id = mutable_data.get('buyer')
        if buyer_id:
            try:
                # Just check if the buyer exists and is active, no need to re-assign mutable_data['buyer']
                # The serializer's PrimaryKeyRelatedField will handle the lookup
                Account.objects.get(id=buyer_id, role='buyer', is_active=True)
            except Account.DoesNotExist:
                return Response({'detail': 'Specified buyer not found or is inactive.'}, status=status.HTTP_400_BAD_REQUEST)


        serializer = TransactionSerializer(data=mutable_data)
        if serializer.is_valid():
            # UPDATED: Save with account_party. DRF's ModelSerializer handles the 'buyer' field automatically
            # if it's present in validated_data and not read_only.
            serializer.save(account_party=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        # FIX: Corrected typo from HTTP_400_BAD_BAD_REQUEST to HTTP_400_BAD_REQUEST
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_transactions_chart(request):
    """
    GET /api/farmer/transactions/chart/
    Returns monthly income and expenses for the last 12 months for charting.
    """
    today = timezone.localdate()
    start_date = (today - timedelta(days=365)).replace(day=1)
    
    transactions_data = Transaction.objects.filter(
        account_party=request.user, # UPDATED: Filter by account_party
        date__gte=start_date,
        date__lte=today
    ).annotate(
        year=ExtractYear('date'),
        month=ExtractMonth('date')
    ).values('year', 'month', 'status').annotate(
        total_amount=Sum('amount')
    ).order_by('year', 'month')

    chart_data = {}
    current_month_iter = start_date
    for _ in range(12):
        month_key = current_month_iter.strftime('%Y-%m')
        chart_data[month_key] = {'month': month_key, 'income': Decimal('0.00'), 'expenses': Decimal('0.00')} # Initialize with Decimal
        
        if current_month_iter.month == 12:
            current_month_iter = current_month_iter.replace(year=current_month_iter.year + 1, month=1, day=1)
        else:
            current_month_iter = current_month_iter.replace(month=current_month_iter.month + 1, day=1)


    for t in transactions_data:
        month_key = f"{t['year']}-{t['month']:02d}"
        if month_key not in chart_data:
            chart_data[month_key] = {'month': month_key, 'income': Decimal('0.00'), 'expenses': Decimal('0.00')} # Initialize with Decimal

        if t['status'] == 'income':
            chart_data[month_key]['income'] += Decimal(t['total_amount']) # Add as Decimal
        elif t['status'] == 'expense':
            chart_data[month_key]['expenses'] += Decimal(t['total_amount']) # Add as Decimal
    
    response_data = list(chart_data.values())
    response_data.sort(key=lambda x: x['month']) 

    # Convert Decimal values to string for JSON serialization to match test expectations
    for entry in response_data:
        entry['income'] = str(entry['income'])
        entry['expenses'] = str(entry['expenses'])

    return Response(response_data)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_transfers(request):
    """
    GET /api/farmer/transfers/
    Lists transfers for the authenticated farmer.
    Allows filtering by type (sent/received) and status.

    POST /api/farmer/transfers/
    Records a new transfer for the authenticated farmer.
    """
    if request.method == 'GET':
        transfers = Transfer.objects.filter(farmer=request.user).order_by('-date')

        transfer_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')

        if transfer_type:
            transfers = transfers.filter(type=transfer_type)
        if status_filter:
            transfers = transfers.filter(status=status_filter)
        
        serializer = TransferSerializer(transfers, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        mutable_data = request.data.copy()
        mutable_data['farmer'] = request.user.id

        serializer = TransferSerializer(data=mutable_data)
        if serializer.is_valid():
            serializer.save(farmer=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_trust_breakdown(request):
    """
    GET /api/farmer/trust-breakdown/
    Retrieves a detailed breakdown of the farmer's trust score.
    """
    farmer_profile = request.user.farmer_profile

    serializer = FarmerTrustBreakdownSerializer(farmer_profile)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_loans(request):
    """
    GET /api/farmer/loans/
    Lists loans associated with the authenticated farmer.

    POST /api/farmer/loans/
    Allows a farmer to request a new loan.
    """
    if request.method == 'GET':
        loans = Loan.objects.filter(farmer=request.user).order_by('-date_taken')
        serializer = LoanSerializer(loans, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # As per the revised plan, farmer loan requests are not directly creating a Loan object here.
        # They are handled through investor offers or platform-initiated loans.
        return Response({'detail': 'Loan requests are currently handled through investor offers or platform initiatives.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_received_reviews(request):
    """
    GET /api/farmer/received-reviews/
    Lists all InvestorReview records where investors have marked 
    this farmer for review (watchlist feature).
    """
    reviews = InvestorReview.objects.filter(farmer=request.user, investor__is_active=True).select_related('investor').order_by('-created_at')
    serializer = InvestorReviewSerializer(reviews, many=True)
    return Response(serializer.data)


# --- Investor Dashboard Endpoints (Primary Web API) ---

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_farmers_list(request):
    """
    GET /api/investor/farmers/
    Lists all farmer profiles visible to the investor.
    Allows filtering by region, produce, and trust score range.
    Now also filters by `is_discoverable_by_investors=True`.
    """
    farmers = FarmerProfile.objects.filter(account__is_active=True, is_discoverable_by_investors=True).select_related('account')

    region = request.query_params.get('region')
    produce = request.query_params.get('produce')
    min_trust_score = request.query_params.get('min_trust_score')
    max_trust_score = request.query_params.get('max_trust_score')

    if region:
        farmers = farmers.filter(region__iexact=region)
    
    if produce:
        produce_list = [p.strip() for p in produce.split(',')]
        q_objects = Q()
        for p in produce_list:
            q_objects |= Q(produce__contains=[p])
        farmers = farmers.filter(q_objects)

    if min_trust_score:
        try:
            min_trust_score = float(min_trust_score)
            farmers = farmers.filter(trust_score_percent__gte=Decimal(str(min_trust_score)))
        except ValueError:
            return Response({"detail": "Invalid min_trust_score. Must be a number."}, status=status.HTTP_400_BAD_REQUEST)
    
    if max_trust_score:
        try:
            max_trust_score = float(max_trust_score)
            farmers = farmers.filter(trust_score_percent__lte=Decimal(str(max_trust_score)))
        except ValueError:
            return Response({"detail": "Invalid max_trust_score. Must be a number."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = FarmerListSerializer(farmers, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_farmer_profile_detail(request, pk):
    """
    GET /api/investor/farmers/<int:pk>/profile/
    Retrieves detailed profile data for a specific farmer (by account ID).
    """
    try:
        farmer_account = Account.objects.get(pk=pk, role='farmer', is_active=True)
        farmer_profile = FarmerProfile.objects.get(account=farmer_account)
    except (Account.DoesNotExist, FarmerProfile.DoesNotExist):
        return Response({'detail': 'Farmer not found or is inactive.'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = FarmerDetailSerializer(farmer_profile)
    return Response(serializer.data)


@api_view(['POST', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_review_farmer(request, pk):
    """
    POST /api/investor/farmers/<int:pk>/review/
    Marks a farmer for "review later" by the authenticated investor.

    DELETE /api/investor/farmers/<int:pk>/review/
    Unmarks a farmer from "review later".
    """
    try:
        farmer_account = Account.objects.get(pk=pk, role='farmer', is_active=True)
    except Account.DoesNotExist:
        return Response({'detail': 'Farmer not found or is inactive.'}, status=status.HTTP_404_NOT_FOUND)

    investor_account = request.user

    if request.method == 'POST':
        investor_review, created = InvestorReview.objects.get_or_create(
            investor=investor_account,
            farmer=farmer_account
        )
        if created:
            return Response({'detail': 'Farmer marked for review.', 'review_id': investor_review.id}, status=status.HTTP_201_CREATED)
        else:
            return Response({'detail': 'Farmer already marked for review.', 'review_id': investor_review.id}, status=status.HTTP_200_OK)

    elif request.method == 'DELETE':
        try:
            review_entry = InvestorReview.objects.get(
                investor=investor_account,
                farmer=farmer_account
            )
            review_entry.delete()
            return Response({'detail': 'Farmer unmarked for review.'}, status=status.HTTP_204_NO_CONTENT)
        except InvestorReview.DoesNotExist:
            # FIX: Changed HTTP_404_NOT_REQUESTED to HTTP_404_NOT_FOUND
            return Response({'detail': 'Farmer was not marked for review by this investor.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_reviewed_farmers(request):
    """
    GET /api/investor/farmers/reviewed/
    Lists all farmers that have been marked for "review later"
    by the authenticated investor.
    """
    reviewed_farmers = InvestorReview.objects.filter(investor=request.user, farmer__is_active=True).select_related('farmer')
    serializer = InvestorReviewSerializer(reviewed_farmers, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_profile(request):
    """
    GET /api/investor/profile/
    Retrieves the authenticated investor's profile data.

    PUT /api/investor/profile/
    Updates the authenticated investor's profile data.
    """
    investor_profile = request.user.investor_profile
    
    if request.method == 'GET':
        serializer = InvestorProfileSerializer(investor_profile)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        mutable_data = request.data.copy()

        account_fields = {}
        if 'phone_number' in mutable_data:
            request.user.phone_number = mutable_data.pop('phone_number')
            request.user.save(update_fields=['phone_number'])
            # Also update the denormalized phone_number on InvestorProfile
            investor_profile.phone_number = request.user.phone_number
            investor_profile.save(update_fields=['phone_number'])

        if 'email' in mutable_data:
            account_fields['email'] = mutable_data.pop('email')
        if 'receive_level_notifications' in mutable_data:
            account_fields['receive_level_notifications'] = mutable_data.pop('receive_level_notifications')
        if 'receive_sms_notifications' in mutable_data:
            account_fields['receive_sms_notifications'] = mutable_data.pop('receive_sms_notifications')
        if 'receive_email_notifications' in mutable_data:
            account_fields['receive_email_notifications'] = mutable_data.pop('receive_email_notifications')

        partial = request.method == 'PATCH'
        
        serializer = InvestorProfileSerializer(investor_profile, data=mutable_data, partial=partial)
        
        if serializer.is_valid():
            # Save account-related fields
            if account_fields:
                for field, value in account_fields.items():
                    setattr(request.user, field, value)
                request.user.save(update_fields=account_fields.keys())
            
            # Save investor profile fields
            serializer.save()
            
            request.user.refresh_from_db()
            investor_profile.refresh_from_db()
            return Response(InvestorProfileSerializer(investor_profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsInvestor])
def investor_loans_list(request): # Dedicated view for investor's loans
    """
    GET /api/investor/loans/
    Lists all loans given by the authenticated investor.
    """
    investor_account = request.user
    loans = Loan.objects.filter(lender=investor_account).order_by('-date_taken')
    serializer = LoanSerializer(loans, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsInvestor])
def loan_detail_roi(request, pk):
    """
    Retrieve the details of a specific loan, including the ROI, for an investor.
    """
    loan = get_object_or_404(Loan, pk=pk)
    serializer = LoanSerializer(loan)
    return Response(serializer.data)
# --- Platform Lender Dashboard Endpoints (NEW) ---

@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
# FIX: Use the custom permission class
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def platform_lender_profile(request):
    """
    GET /api/platform-lender/profile/
    Retrieves the FarmCred Platform Lender's profile data (which is its Account data).

    PUT /api/platform-lender/profile/
    Updates the FarmCred Platform Lender's account data.
    """
    # The platform lender doesn't have a dedicated profile model beyond Account
    platform_lender_account = request.user
    
    if request.method == 'GET':
        # Use the FarmCredPlatformLenderSerializer from core/serializers.py
        from core.serializers import FarmCredPlatformLenderSerializer # Import it here
        serializer = FarmCredPlatformLenderSerializer(platform_lender_account)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        mutable_data = request.data.copy()

        fields_to_update = {}
        if 'full_name' in mutable_data:
            fields_to_update['full_name'] = mutable_data.pop('full_name')
        if 'phone_number' in mutable_data:
            fields_to_update['phone_number'] = mutable_data.pop('phone_number')
        if 'email' in mutable_data:
            fields_to_update['email'] = mutable_data.pop('email')
        if 'receive_level_notifications' in mutable_data:
            fields_to_update['receive_level_notifications'] = mutable_data.pop('receive_level_notifications')
        if 'receive_sms_notifications' in mutable_data:
            fields_to_update['receive_sms_notifications'] = mutable_data.pop('receive_sms_notifications')
        if 'receive_email_notifications' in mutable_data:
            fields_to_update['receive_email_notifications'] = mutable_data.pop('receive_email_notifications')

        if not fields_to_update:
            return Response({'detail': 'No fields provided for update.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            for field, value in fields_to_update.items():
                setattr(platform_lender_account, field, value)
            platform_lender_account.save(update_fields=fields_to_update.keys())
            platform_lender_account.refresh_from_db()
            from core.serializers import FarmCredPlatformLenderSerializer # Re-import for response
            return Response(FarmCredPlatformLenderSerializer(platform_lender_account).data)
        except Exception as e:
            return Response({'detail': f'Error updating platform lender profile: {e}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
# FIX: Use the custom permission class
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def platform_lender_loans_list(request):
    """
    GET /api/platform-lender/loans/
    Lists all loans given by the FarmCred Platform Lender.
    """
    platform_lender_account = request.user
    loans = Loan.objects.filter(lender=platform_lender_account).order_by('-date_taken')
    serializer = LoanSerializer(loans, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# --- Buyer Dashboard Endpoints (Primary Web API) ---

@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsBuyer])
def buyer_profile(request):
    """
    GET /api/buyer/profile/
    Retrieves the authenticated buyer's profile data.

    PUT /api/buyer/profile/
    Updates the authenticated buyer's profile data.
    """
    buyer_profile = request.user.buyer_profile
    
    if request.method == 'GET':
        serializer = BuyerProfileSerializer(buyer_profile)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        mutable_data = request.data.copy()

        account_fields = {}
        if 'phone_number' in mutable_data:
            request.user.phone_number = mutable_data.pop('phone_number')
            request.user.save(update_fields=['phone_number'])
            buyer_profile.phone_number = request.user.phone_number
            buyer_profile.save(update_fields=['phone_number'])

        if 'email' in mutable_data:
            account_fields['email'] = mutable_data.pop('email')
        if 'receive_level_notifications' in mutable_data:
            account_fields['receive_level_notifications'] = mutable_data.pop('receive_level_notifications')
        if 'receive_sms_notifications' in mutable_data:
            account_fields['receive_sms_notifications'] = mutable_data.pop('receive_sms_notifications')
        if 'receive_email_notifications' in mutable_data:
            account_fields['receive_email_notifications'] = mutable_data.pop('receive_email_notifications')

        partial = request.method == 'PATCH'
        
        serializer = BuyerProfileSerializer(buyer_profile, data=mutable_data, partial=partial)
        
        if serializer.is_valid():
            if account_fields:
                for field, value in account_fields.items():
                    setattr(request.user, field, value)
                request.user.save(update_fields=account_fields.keys())
            
            serializer.save()
            
            request.user.refresh_from_db()
            buyer_profile.refresh_from_db()
            return Response(BuyerProfileSerializer(buyer_profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsBuyer])
def buyer_transactions_list(request):
    """
    GET /api/buyer/transactions/
    Lists all transactions where the authenticated buyer was the 'buyer'.
    """
    buyer_account = request.user
    transactions = Transaction.objects.filter(buyer=buyer_account).order_by('-date')
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    POST /api/delete-account/
    Soft deletes the authenticated user's account by setting is_active=False
    and anonymizing PII in related profiles. Requires password confirmation.
    """
    user = request.user
    password = request.data.get('password')

    if not password:
        return Response({'detail': 'Password is required for account deletion.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(password):
        return Response({'detail': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)

    user.is_active = False
    # FIX: Anonymize email and phone_number to satisfy constraint, but keep them unique and within max_length
    timestamp_str = str(int(timezone.now().timestamp()))
    user.email = f"deleted_{user.id}_{timestamp_str}@deleted.com"
    # Make phone number shorter for max_length=100
    user.phone_number = f"del_{user.id}_{timestamp_str}"[:100] # Truncate if too long
    user.save(update_fields=['is_active', 'email', 'phone_number'])

    # Anonymize associated profiles
    if hasattr(user, 'farmer_profile'):
        farmer_profile = user.farmer_profile
        farmer_profile.full_name = f"Deleted Farmer {user.id}"
        farmer_profile.phone_number = None # This is denormalized, can be None
        farmer_profile.dob = None
        farmer_profile.national_id = None
        farmer_profile.home_address = None
        farmer_profile.produce = []
        farmer_profile.is_discoverable_by_investors = False # Ensure not discoverable
        farmer_profile.save(update_fields=['full_name', 'phone_number', 'dob', 'national_id', 'home_address', 'produce', 'is_discoverable_by_investors'])
    elif hasattr(user, 'investor_profile'):
        investor_profile = user.investor_profile
        investor_profile.full_name = f"Deleted Investor {user.id}"
        investor_profile.phone_number = None # This is denormalized, can be None
        investor_profile.save(update_fields=['full_name', 'phone_number'])
    elif hasattr(user, 'buyer_profile'):
        buyer_profile = user.buyer_profile
        buyer_profile.full_name = f"Deleted Buyer {user.id}"
        buyer_profile.phone_number = None # This is denormalized, can be None
        buyer_profile.save(update_fields=['full_name', 'phone_number'])


    return Response({'detail': 'Account soft-deleted successfully. Some data may be retained for historical purposes.'}, status=status.HTTP_200_OK)


# --- Farmer Order Management Views ---

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_orders_list(request):
    """
    GET /api/farmer/orders/
    Lists all orders for the authenticated farmer.
    """
    farmer_account = request.user
    orders = Order.objects.filter(farmer=farmer_account).order_by('-order_date')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_order_detail(request, pk):
    """
    GET /api/farmer/orders/{pk}/
    Retrieves details of a specific order for the farmer.
    
    PATCH /api/farmer/orders/{pk}/
    Updates order status and notes for the farmer.
    """
    farmer_account = request.user
    
    try:
        order = Order.objects.get(pk=pk, farmer=farmer_account)
    except Order.DoesNotExist:
        return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PATCH':
        # Allow farmers to update order status and notes
        status_value = request.data.get('status')
        notes = request.data.get('notes')
        
        if status_value:
            # Validate status transitions based on current order status
            valid_transitions = {
                Order.STATUS_PENDING_PAYMENT: [],  # Cannot change from pending payment
                Order.STATUS_PAID_TO_ESCROW: [Order.STATUS_FARMER_CONFIRMED_DELIVERY],
                Order.STATUS_FARMER_CONFIRMED_DELIVERY: [],  # Already confirmed delivery
                Order.STATUS_COMPLETED: [],  # Order is complete
                Order.STATUS_CANCELLED: [],  # Order is cancelled
                Order.STATUS_DISPUTED: [],  # Order is disputed
            }
            
            if status_value not in valid_transitions.get(order.status, []):
                return Response({
                    'detail': f'Invalid status transition from {order.status} to {status_value}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            order.status = status_value
            
            # If confirming delivery, also set delivery date and is_delivered flag
            if status_value == Order.STATUS_FARMER_CONFIRMED_DELIVERY:
                order.is_delivered = True
                order.delivery_date = timezone.localdate()
        
        if notes:
            # You might want to add a notes field to the Order model if it doesn't exist
            # For now, we'll assume there's some way to store farmer notes
            pass
        
        order.save()
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsFarmer])
def farmer_confirm_delivery(request, pk):
    """
    POST /api/farmer/orders/{pk}/confirm-delivery/
    Allows a farmer to confirm that they have delivered the goods for an order.
    Moves order status to 'farmer_confirmed_delivery'.
    """
    farmer_account = request.user
    
    try:
        order = Order.objects.get(
            pk=pk,
            farmer=farmer_account,
            status=Order.STATUS_PAID_TO_ESCROW  # Only confirm delivery if funds are in escrow
        )
    except Order.DoesNotExist:
        return Response({
            "detail": "Order not found or not in 'paid_to_escrow' status."
        }, status=status.HTTP_404_NOT_FOUND)

    # Update order status and delivery information
    order.is_delivered = True
    order.status = Order.STATUS_FARMER_CONFIRMED_DELIVERY
    order.delivery_date = timezone.localdate()
    order.save(update_fields=['is_delivered', 'status', 'delivery_date'])

    # Return updated order data
    serializer = OrderSerializer(order)
    return Response(serializer.data, status=status.HTTP_200_OK)

