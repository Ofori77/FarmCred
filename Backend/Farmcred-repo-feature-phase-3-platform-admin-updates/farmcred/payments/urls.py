# payments/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Order Management
    path('orders/initiate/', views.initiate_order, name='initiate_order'),
    path('orders/<int:order_id>/payment-callback/', views.payment_callback, name='payment_callback'),
    path('orders/<int:order_id>/confirm-delivery/', views.confirm_delivery, name='confirm_delivery'),
     path('orders/<int:order_id>/confirm-receipt/', views.confirm_receipt_and_release_funds, name='confirm_receipt_and_release_funds'),
    path('orders/<int:order_id>/cancel/', views.cancel_order, name='cancel_order'),
    path('orders/<int:pk>/', views.retrieve_order_detail, name='retrieve_order_detail'),
    path('my-orders/', views.list_my_orders, name='list_my_orders'),

    # Buyer Reviews
    path('reviews/', views.create_buyer_review, name='create_buyer_review'),
    path('my-reviews/', views.list_my_reviews, name='list_my_reviews'),

    # Dispute Resolution
    path('orders/disputes/', views.list_disputed_orders, name='list_disputed_orders'),
    path('orders/<int:order_id>/raise-dispute/', views.raise_dispute, name='raise_dispute'),
    path('orders/<int:order_id>/resolve-dispute/', views.resolve_dispute, name='resolve_dispute'), # NEW
]

