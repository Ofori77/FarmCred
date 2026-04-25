# platform_admin/views.py

from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Sum, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal # NEW: Import Decimal

# Import models from other apps
from account.models import Account # For getting Account objects
from payments.models import Order, PaymentTransaction # For orders and payment history
from core.models import FarmerProfile, Transaction # For farmer details in nested serializers

# Import permissions from core app
from core.permissions import IsPlatformLenderOrAdmin

# Import serializers from the new platform_admin app
from .serializers import (
    PlatformLenderOrderListSerializer,
    PlatformLenderOrderDetailSerializer,
    PlatformLenderDashboardStatsSerializer
)

# Helper function for escrow account (re-use from payments.views if needed, or define here)
def get_escrow_account():
    """Retrieves the FarmCred Escrow account."""
    try:
        # Assuming there's a specific role for the escrow account
        return Account.objects.get(role='platform_escrow')
    except Account.DoesNotExist:
        # Handle case where escrow account doesn't exist (e.g., create it)
        # For now, we'll just raise an error or return None, depending on desired behavior
        return None


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def platform_lender_list_orders(request):
    """
    GET /api/platform-admin/orders/
    Lists all orders for the platform lender dashboard.
    Allows filtering by order status.
    """
    orders = Order.objects.all().order_by('-created_at')

    # Filter by status if provided in query parameters
    status_filter = request.query_params.get('status')
    if status_filter:
        # Access STATUS_CHOICES directly from the Order model
        valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
        if status_filter not in valid_statuses:
            return Response(
                {"detail": f"Invalid status filter. Must be one of: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        orders = orders.filter(status=status_filter)

    serializer = PlatformLenderOrderListSerializer(orders, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def platform_lender_retrieve_order_detail(request, pk):
    """
    GET /api/platform-admin/orders/<int:pk>/
    Retrieves detailed information for a specific order.
    """
    order = get_object_or_404(Order, pk=pk)
    serializer = PlatformLenderOrderDetailSerializer(order)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated, IsPlatformLenderOrAdmin])
def platform_lender_get_dashboard_stats(request):
    """
    GET /api/platform-admin/dashboard-stats/
    Retrieves aggregated statistics for the platform lender dashboard.
    """
    escrow_account = get_escrow_account()
    total_funds_in_escrow = Decimal('0.00')
    if escrow_account:
        # Calculate balance based on transactions where escrow is account_party
        # Sum of income transactions minus sum of expense transactions
        income_sum = Transaction.objects.filter(
            account_party=escrow_account, status='income'
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')

        expense_sum = Transaction.objects.filter(
            account_party=escrow_account, status='expense'
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        
        total_funds_in_escrow = income_sum - expense_sum

    total_active_orders = Order.objects.filter(
        status__in=[
            Order.STATUS_PENDING_PAYMENT,
            Order.STATUS_PAID_TO_ESCROW,
            Order.STATUS_FARMER_CONFIRMED_DELIVERY
        ]
    ).count()

    total_disputed_orders = Order.objects.filter(status=Order.STATUS_DISPUTED).count()

    # Stats for last 30 days
    thirty_days_ago = timezone.localdate() - timedelta(days=30)
    
    total_completed_orders_last_30_days = Order.objects.filter(
        status=Order.STATUS_COMPLETED,
        updated_at__gte=thirty_days_ago # Assuming updated_at reflects completion
    ).count()

    # Total transaction value (sum of all order total_amounts for completed orders)
    # Or, sum of all PaymentTransaction amounts
    total_transaction_value_last_30_days = Order.objects.filter(
        status=Order.STATUS_COMPLETED,
        updated_at__gte=thirty_days_ago
    ).aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0.00')

    new_farmers_last_30_days = Account.objects.filter(
        role='farmer',
        date_joined__gte=thirty_days_ago
    ).count()

    new_buyers_last_30_days = Account.objects.filter(
        role='buyer',
        date_joined__gte=thirty_days_ago
    ).count()

    stats_data = {
        'total_funds_in_escrow': total_funds_in_escrow,
        'total_active_orders': total_active_orders,
        'total_disputed_orders': total_disputed_orders,
        'total_completed_orders_last_30_days': total_completed_orders_last_30_days,
        'total_transaction_value_last_30_days': total_transaction_value_last_30_days,
        'new_farmers_last_30_days': new_farmers_last_30_days,
        'new_buyers_last_30_days': new_buyers_last_30_days,
    }

    serializer = PlatformLenderDashboardStatsSerializer(stats_data)
    return Response(serializer.data, status=status.HTTP_200_OK)
