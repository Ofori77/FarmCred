# platform_admin/admin_urls.py

from django.urls import path
from . import admin_views

urlpatterns = [
    # =============================================================================
    # USER MANAGEMENT ENDPOINTS
    # =============================================================================
    path('users/', admin_views.admin_list_all_users, name='admin-users-list'),
    path('users/<int:user_id>/', admin_views.admin_user_detail, name='admin-user-detail'),
    path('users/bulk-action/', admin_views.admin_bulk_user_action, name='admin-users-bulk-action'),
    
    # =============================================================================
    # ORDER & PAYMENT MANAGEMENT ENDPOINTS  
    # =============================================================================
    path('orders/', admin_views.admin_list_all_orders, name='admin-orders-list'),
    path('transactions/', admin_views.admin_payment_transactions, name='admin-transactions-list'),
    path('escrow/overview/', admin_views.admin_escrow_overview, name='admin-escrow-overview'),
    
    # =============================================================================
    # TRUST SYSTEM OVERSIGHT ENDPOINTS
    # =============================================================================
    path('trust-system/', admin_views.admin_trust_system_overview, name='admin-trust-system'),
    path('trust/analytics/', admin_views.admin_trust_system_overview, name='admin-trust-analytics'),
    path('farmers/<int:farmer_id>/trust-level/', admin_views.admin_modify_trust_level, name='admin-modify-trust-level'),
    
    # =============================================================================
    # LOAN MANAGEMENT ENDPOINTS
    # =============================================================================
    path('loans/', admin_views.admin_list_all_loans, name='admin-loans-list'),
    path('loans/metrics/', admin_views.admin_loan_performance_metrics, name='admin-loan-metrics'),
    
    # =============================================================================
    # ADVANCED DASHBOARD METRICS
    # =============================================================================
    path('analytics/', admin_views.admin_platform_analytics, name='admin-analytics'),
]
