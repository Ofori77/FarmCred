# platform_admin/admin_views.py
# Additional admin endpoints for comprehensive user and system management

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Sum, Q, Count, Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

# Import models
from account.models import Account
from core.models import FarmerProfile, InvestorProfile, BuyerProfile, Loan, InvestorReview, Transaction
from payments.models import Order, PaymentTransaction, BuyerReview
from marketplace.models import ProduceListing

# Import permissions
from core.permissions import IsPlatformLenderOrAdmin

# Import serializers
from .admin_serializers import (
    AdminUserListSerializer, AdminUserDetailSerializer,
    AdminOrderListSerializer, AdminTransactionListSerializer,
    AdminLoanListSerializer, AdminTrustSystemSerializer
)


# =============================================================================
# 1. USER MANAGEMENT ENDPOINTS
# =============================================================================

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_list_all_users(request):
    """
    GET /api/admin/users/
    Lists all user accounts with filtering options.
    """
    users = Account.objects.all().order_by('-date_joined')
    
    # Filter by role
    role_filter = request.query_params.get('role')
    if role_filter:
        users = users.filter(role=role_filter)
    
    # Filter by active status
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        users = users.filter(is_active=is_active.lower() == 'true')
    
    # Search by name, email, or phone
    search = request.query_params.get('search')
    if search:
        users = users.filter(
            Q(full_name__icontains=search) |
            Q(email__icontains=search) |
            Q(phone_number__icontains=search)
        )
    
    serializer = AdminUserListSerializer(users, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_user_detail(request, user_id):
    """
    GET /api/admin/users/<int:user_id>/
    PATCH /api/admin/users/<int:user_id>/
    Retrieve or update a specific user account.
    """
    user = get_object_or_404(Account, id=user_id)
    
    if request.method == 'GET':
        serializer = AdminUserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PATCH':
        # Allow admins to update user status, role, etc.
        allowed_fields = ['is_active', 'role', 'full_name', 'email', 'phone_number']
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.save(update_fields=update_data.keys())
        
        serializer = AdminUserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_bulk_user_action(request):
    """
    POST /api/admin/users/bulk-action/
    Perform bulk actions on multiple users.
    """
    action = request.data.get('action')  # 'activate', 'deactivate', 'change_role'
    user_ids = request.data.get('user_ids', [])
    
    if not action or not user_ids:
        return Response(
            {'detail': 'Action and user_ids are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    users = Account.objects.filter(id__in=user_ids)
    
    if action == 'activate':
        users.update(is_active=True)
        message = f'Activated {users.count()} users'
    elif action == 'deactivate':
        users.update(is_active=False)
        message = f'Deactivated {users.count()} users'
    elif action == 'change_role':
        new_role = request.data.get('new_role')
        if not new_role:
            return Response(
                {'detail': 'new_role is required for change_role action'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        users.update(role=new_role)
        message = f'Changed role to {new_role} for {users.count()} users'
    else:
        return Response(
            {'detail': 'Invalid action'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return Response({'message': message}, status=status.HTTP_200_OK)


# =============================================================================
# 2. ORDER & PAYMENT MANAGEMENT ENDPOINTS
# =============================================================================

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_list_all_orders(request):
    """
    GET /api/admin/orders/
    Lists all orders with advanced filtering.
    """
    orders = Order.objects.all().order_by('-created_at')
    
    # Filter by status
    status_filter = request.query_params.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)
    
    # Filter by date range
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        orders = orders.filter(created_at__gte=start_date)
    if end_date:
        orders = orders.filter(created_at__lte=end_date)
    
    # Filter by amount range
    min_amount = request.query_params.get('min_amount')
    max_amount = request.query_params.get('max_amount')
    if min_amount:
        orders = orders.filter(total_amount__gte=min_amount)
    if max_amount:
        orders = orders.filter(total_amount__lte=max_amount)
    
    serializer = AdminOrderListSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_payment_transactions(request):
    """
    GET /api/admin/transactions/
    Lists all payment transactions for oversight.
    """
    transactions = PaymentTransaction.objects.all().order_by('-created_at')
    
    # Filter by transaction type
    transaction_type = request.query_params.get('type')
    if transaction_type:
        transactions = transactions.filter(transaction_type=transaction_type)
    
    # Filter by status
    status_filter = request.query_params.get('status')
    if status_filter:
        transactions = transactions.filter(status=status_filter)
    
    serializer = AdminTransactionListSerializer(transactions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_escrow_overview(request):
    """
    GET /api/admin/escrow/overview/
    Provides overview of escrow account and held funds.
    """
    from payments.views import get_escrow_account
    
    escrow_account = get_escrow_account()
    
    # Calculate total funds in escrow
    income_sum = Transaction.objects.filter(
        account_party=escrow_account, status='income'
    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    
    expense_sum = Transaction.objects.filter(
        account_party=escrow_account, status='expense'
    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    
    total_escrow_balance = income_sum - expense_sum
    
    # Get pending orders (funds in escrow)
    pending_orders = Order.objects.filter(
        status__in=[Order.STATUS_PAID_TO_ESCROW, Order.STATUS_FARMER_CONFIRMED_DELIVERY]
    )
    
    total_pending_amount = pending_orders.aggregate(
        Sum('total_amount')
    )['total_amount__sum'] or Decimal('0.00')
    
    # Get disputed orders
    disputed_orders_count = Order.objects.filter(status=Order.STATUS_DISPUTED).count()
    
    data = {
        'escrow_account_id': escrow_account.id if escrow_account else None,
        'total_escrow_balance': total_escrow_balance,
        'total_pending_amount': total_pending_amount,
        'pending_orders_count': pending_orders.count(),
        'disputed_orders_count': disputed_orders_count,
    }
    
    return Response(data, status=status.HTTP_200_OK)


# =============================================================================
# 3. TRUST SYSTEM OVERSIGHT ENDPOINTS
# =============================================================================

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_trust_system_overview(request):
    """
    GET /api/admin/trust-system/
    Overview of farmer trust scores and ratings.
    """
    farmers = FarmerProfile.objects.all()
    
    # Calculate trust score statistics
    avg_trust_score = farmers.aggregate(
        avg_score=Avg('trust_score_percent')
    )['avg_score'] or 0
    
    # Group farmers by trust level
    trust_levels = {}
    for level in [1, 2, 3, 4, 5]:
        count = farmers.filter(trust_level_stars=level).count()
        trust_levels[f'level_{level}_stars'] = count
    
    # Get recent reviews (both investor reviews and buyer reviews with ratings)
    recent_investor_reviews = InvestorReview.objects.order_by('-created_at')[:5]
    
    serializer = AdminTrustSystemSerializer({
        'average_trust_score': avg_trust_score,
        'trust_level_distribution': trust_levels,
        'total_farmers': farmers.count(),
        'recent_reviews': recent_investor_reviews
    })
    
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_modify_trust_level(request, farmer_id):
    """
    PATCH /api/admin/farmers/<int:farmer_id>/trust-level/
    Manually adjust a farmer's trust level (admin override).
    """
    farmer = get_object_or_404(Account, id=farmer_id, role='farmer')
    farmer_profile = get_object_or_404(FarmerProfile, account=farmer)
    
    new_trust_score = request.data.get('trust_score_percent')
    new_trust_level = request.data.get('trust_level_stars')
    adjustment_reason = request.data.get('reason', 'Admin adjustment')
    
    if new_trust_score is not None:
        farmer_profile.trust_score_percent = new_trust_score
    
    if new_trust_level is not None:
        farmer_profile.trust_level_stars = new_trust_level
    
    farmer_profile.save()
    
    # Log the adjustment
    Transaction.objects.create(
        account_party=farmer,
        name=f"Trust Level Adjustment by Admin",
        description=f"Trust level modified: {adjustment_reason}",
        amount=Decimal('0.00'),
        category='system_adjustment',
        status='income',
        date=timezone.localdate()
    )
    
    return Response({
        'message': 'Trust level updated successfully',
        'new_trust_score': farmer_profile.trust_score_percent,
        'new_trust_level': farmer_profile.trust_level_stars
    }, status=status.HTTP_200_OK)


# =============================================================================
# 4. LOAN MANAGEMENT ENDPOINTS  
# =============================================================================

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_list_all_loans(request):
    """
    GET /api/admin/loans/
    Lists all loans (platform and investor loans).
    """
    loans = Loan.objects.all().order_by('-date_taken')
    
    # Filter by loan type (platform vs investor)
    lender_type = request.query_params.get('lender_type')
    if lender_type == 'platform':
        loans = loans.filter(lender__role='platform_lender')
    elif lender_type == 'investor':
        loans = loans.filter(lender__role='investor')
    
    # Filter by status
    status_filter = request.query_params.get('status')
    if status_filter:
        loans = loans.filter(status=status_filter)
    
    # Filter by date range
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        loans = loans.filter(date_taken__gte=start_date)
    if end_date:
        loans = loans.filter(date_taken__lte=end_date)
    
    serializer = AdminLoanListSerializer(loans, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_loan_performance_metrics(request):
    """
    GET /api/admin/loans/metrics/
    Provides loan performance analytics.
    """
    total_loans = Loan.objects.count()
    active_loans = Loan.objects.filter(status='active').count()
    completed_loans = Loan.objects.filter(status='completed').count()
    defaulted_loans = Loan.objects.filter(status='defaulted').count()
    
    total_loan_amount = Loan.objects.aggregate(
        Sum('amount')
    )['amount__sum'] or Decimal('0.00')
    
    total_repaid = Loan.objects.filter(
        status='completed'
    ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
    
    # Calculate default rate
    default_rate = (defaulted_loans / total_loans * 100) if total_loans > 0 else 0
    
    # Platform vs Investor loan breakdown
    platform_loans = Loan.objects.filter(lender__role='platform_lender').count()
    investor_loans = Loan.objects.filter(lender__role='investor').count()
    
    data = {
        'total_loans': total_loans,
        'active_loans': active_loans,
        'completed_loans': completed_loans,
        'defaulted_loans': defaulted_loans,
        'default_rate_percent': round(default_rate, 2),
        'total_loan_amount': total_loan_amount,
        'total_repaid_amount': total_repaid,
        'platform_loans_count': platform_loans,
        'investor_loans_count': investor_loans
    }
    
    return Response(data, status=status.HTTP_200_OK)


# =============================================================================
# 5. ADVANCED DASHBOARD METRICS
# =============================================================================

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def admin_platform_analytics(request):
    """
    GET /api/admin/analytics/
    Comprehensive platform analytics dashboard.
    """
    # User metrics
    total_users = Account.objects.count()
    active_users = Account.objects.filter(is_active=True).count()
    farmers_count = Account.objects.filter(role='farmer').count()
    investors_count = Account.objects.filter(role='investor').count()
    buyers_count = Account.objects.filter(role='buyer').count()
    
    # Order metrics (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_orders = Order.objects.filter(created_at__gte=thirty_days_ago)
    total_recent_orders = recent_orders.count()
    recent_order_value = recent_orders.aggregate(
        Sum('total_amount')
    )['total_amount__sum'] or Decimal('0.00')
    
    # Produce listing metrics
    total_listings = ProduceListing.objects.count()
    active_listings = ProduceListing.objects.filter(is_available=True).count()
    
    # Financial metrics
    total_transaction_volume = Order.objects.filter(
        status=Order.STATUS_COMPLETED
    ).aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0.00')
    
    data = {
        'user_metrics': {
            'total_users': total_users,
            'active_users': active_users,
            'farmers_count': farmers_count,
            'investors_count': investors_count,
            'buyers_count': buyers_count,
        },
        'order_metrics': {
            'total_recent_orders': total_recent_orders,
            'recent_order_value': recent_order_value,
            'total_transaction_volume': total_transaction_volume,
        },
        'marketplace_metrics': {
            'total_listings': total_listings,
            'active_listings': active_listings,
        }
    }
    
    return Response(data, status=status.HTTP_200_OK)
