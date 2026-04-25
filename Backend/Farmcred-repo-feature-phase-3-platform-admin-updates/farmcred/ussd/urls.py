# ussd/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('callback/', views.ussd_callback, name='ussd_callback'),
    # Add other USSD-specific URLs if needed later
]
