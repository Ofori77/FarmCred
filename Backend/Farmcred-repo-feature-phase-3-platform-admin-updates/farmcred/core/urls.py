from django.urls import path
from .views import (
    # Farmer Dashboard Views
    farmer_overview,
    farmer_transactions,
    farmer_transactions_chart,
    farmer_transfers,
    farmer_trust_breakdown,
    farmer_profile,
    farmer_loans,
    farmer_received_reviews,

    # Farmer Order Management Views
    farmer_orders_list,
    farmer_order_detail,
    farmer_confirm_delivery,

    # Investor Dashboard Views
    investor_farmers_list,
    investor_farmer_profile_detail,
    investor_review_farmer,
    investor_reviewed_farmers,
    investor_profile,
    investor_loans_list,
    loan_detail_roi,

    # Platform Lender Dashboard Views (NEW)
    platform_lender_profile,
    platform_lender_loans_list,

    # Buyer Dashboard Views
    buyer_profile,
    buyer_transactions_list,

    # Account Management Views
    delete_account,
)

urlpatterns = [
    # --- Farmer Dashboard Endpoints ---
    path('farmer/overview/', farmer_overview, name='farmer-overview'),
    path('farmer/transactions/', farmer_transactions, name='farmer-transactions'),
    path('farmer/transactions/chart/', farmer_transactions_chart, name='farmer-transactions-chart'),
    path('farmer/transfers/', farmer_transfers, name='farmer-transfers'),
    path('farmer/trust-breakdown/', farmer_trust_breakdown, name='farmer-trust-breakdown'),
    path('farmer/profile/', farmer_profile, name='farmer-profile'),
    path('farmer/loans/', farmer_loans, name='farmer-loans'),
    path('farmer/received-reviews/', farmer_received_reviews, name='farmer-received-reviews'),
    
    # --- Farmer Order Management Endpoints ---
    path('farmer/orders/', farmer_orders_list, name='farmer-orders-list'),
    path('farmer/orders/<int:pk>/', farmer_order_detail, name='farmer-order-detail'),
    path('farmer/orders/<int:pk>/confirm-delivery/', farmer_confirm_delivery, name='farmer-confirm-delivery'),
    
    path('loans/<int:pk>/roi/', loan_detail_roi, name='loan_detail_roi'),

    # --- Investor Dashboard Endpoints ---
    path('investor/farmers/', investor_farmers_list, name='investor-farmers-list'),
    path('investor/farmers/<int:pk>/profile/', investor_farmer_profile_detail, name='investor-farmer-detail'),
    path('investor/farmers/<int:pk>/review/', investor_review_farmer, name='investor-farmer-review'),
    path('investor/farmers/reviewed/', investor_reviewed_farmers, name='investor-reviewed-farmers'),
    path('investor/profile/', investor_profile, name='investor-profile'),
    path('investor/loans/', investor_loans_list, name='investor-loans-list'),

    # --- Platform Lender Dashboard Endpoints (NEW) ---
    path('platform-lender/profile/', platform_lender_profile, name='platform-lender-profile'),
    path('platform-lender/loans/', platform_lender_loans_list, name='platform-lender-loans-list'),

    # --- Buyer Dashboard Endpoints ---
    path('buyer/profile/', buyer_profile, name='buyer-profile'),
    path('buyer/transactions/', buyer_transactions_list, name='buyer-transactions-list'),

    # --- Account Management Endpoints ---
    path('delete-account/', delete_account, name='delete-account'),
]
