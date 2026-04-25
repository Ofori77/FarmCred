# ussd_web_api/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # --- General / Authentication Endpoints ---
    # This is distinct as it uses USSD PIN for login, not password.
    path('login/', views.ussd_web_login, name='ussd_web_login'),
    # Utility for frontend to get available roles.
    path('user-roles/', views.get_user_roles, name='get_user_roles'),

    # --- Farmer Endpoints (Focused on USSD-like actions/flows) ---
    # Product management mirrors USSD update product flow
    path('farmer/products/', views.farmer_products, name='farmer_products_list_add'),
    path('farmer/products/update-price/', views.farmer_update_product_price, name='farmer_update_product_price'),
    path('farmer/products/remove/', views.farmer_remove_product, name='farmer_remove_product'),
    # Farmer initiates loan request (platform loan)
    path('farmer/request-loan/', views.farmer_request_loan, name='farmer_request_loan'),
    # Farmer initiates confirmation of loan repayment (for investor-lent loans)
    path('farmer/initiate-loan-repayment-confirmation/', views.farmer_initiate_loan_repayment_confirmation, name='farmer_initiate_loan_repayment_confirmation'),
    # Farmer toggles discoverability for investors
    path('farmer/toggle-discoverability/', views.farmer_toggle_discoverability, name='farmer_toggle_discoverability'),
    # Farmer shares stats/logs via SMS (USSD-like action)
    path('farmer/share-stats-logs/', views.share_stats_logs, name='farmer_share_stats_logs'),

    # --- Investor Endpoints (Focused on USSD-like actions/flows) ---
    # Investor browses discoverable farmers (part of USSD flow)
    path('investor/farmers/', views.investor_browse_farmers, name='investor_browse_farmers'),
    # Investor initiates a loan offer to a farmer
    path('investor/initiate-loan-offer/', views.investor_initiate_loan_offer, name='investor_initiate_loan_offer'),
    # Investor initiates a request to view farmer's trust details
    path('investor/initiate-trust-view/', views.investor_initiate_trust_view, name='investor_initiate_trust_view'),
    # Investor initiates confirmation of loan repayment received from a farmer
    path('investor/initiate-repayment-confirmation/', views.investor_initiate_repayment_confirmation, name='investor_initiate_repayment_confirmation'),

    # --- Buyer Endpoints (Focused on USSD-like actions/flows) ---
    # Buyer initiates a produce purchase from a farmer
    path('buyer/initiate-produce-purchase/', views.initiate_produce_purchase, name='initiate_produce_purchase'),

    # --- Pending Confirmation Endpoints (Cross-Role, central to USSD interaction model) ---
    # List confirmations targeting the authenticated user
    path('pending-confirmations/', views.list_pending_confirmations, name='list_pending_confirmations'),
    # Accept/deny a specific confirmation request
    path('pending-confirmations/<int:pk>/action/', views.confirm_request_action, name='confirm_request_action'),
    # Check status of a specific confirmation (for polling from frontend)
    path('pending-confirmations/<int:pk>/status/', views.get_confirmation_status, name='get_confirmation_status'),
]
