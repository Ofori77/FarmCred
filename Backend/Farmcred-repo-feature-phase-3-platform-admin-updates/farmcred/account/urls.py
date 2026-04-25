from django.urls import path
from .views import register_user, CustomTokenObtainPairView, logout_user, CustomTokenRefreshView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', register_user, name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', logout_user, name='logout'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'), # Use the new custom view
]
