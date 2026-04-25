"""
URL configuration for farmcred project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# farmcred/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from account.views import register_user, CustomTokenObtainPairView # Import your custom token view

urlpatterns = [
    path('admin/', admin.site.urls),
    # Account app URLs
    path('api/register/', register_user, name='register'), # Your existing registration endpoint
    path('api/account/', include('account.urls')), # Include account app URLs
    # JWT Token Endpoints
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Core app URLs
    path('api/', include('core.urls')), # Assuming your core app has a urls.py
    # USSD app URLs
    path('ussd/', include('ussd.urls')), # Include your new USSD app URLs here
    path('api/ussd-web/', include('ussd_web_api.urls')),
    path('api/marketplace/', include('marketplace.urls')), # Include marketplace app URLs
    path('api/payments/', include('payments.urls')), # Include payments app URLs
    path('api/platform-admin/', include('platform_admin.urls')), # ADD THIS LINE
]
