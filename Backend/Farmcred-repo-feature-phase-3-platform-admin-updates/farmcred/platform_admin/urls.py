# platform_admin/urls.py

from django.urls import path, include
from . import views

urlpatterns = [
    # Order Management for Platform Lender
    path('orders/', views.platform_lender_list_orders, name='platform-lender-orders-list'),
    path('orders/<int:pk>/', views.platform_lender_retrieve_order_detail, name='platform-lender-order-detail'),
    
    # Dashboard Statistics
    path('dashboard-stats/', views.platform_lender_get_dashboard_stats, name='platform-lender-dashboard-stats'),
    
    # Admin/Superuser Dashboard Endpoints
    path('admin/', include('platform_admin.admin_urls')),
]

