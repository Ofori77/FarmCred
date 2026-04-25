# ussd_web_api/permissions.py
from rest_framework import permissions
from django.db.models import Q # Import Q for complex permission checks

class IsFarmer(permissions.BasePermission):
    """
    Custom permission to only allow farmers to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'farmer'

class IsInvestor(permissions.BasePermission):
    """
    Custom permission to only allow investors to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'investor'

# REMOVED: IsLender permission is no longer needed
# class IsLender(permissions.BasePermission):
#     """
#     Custom permission to only allow lenders to access the view.
#     """
#     def has_permission(self, request, view):
#         return request.user and request.user.is_authenticated and request.user.role == 'lender'

class IsBuyer(permissions.BasePermission):
    """
    Custom permission to only allow buyers to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'buyer'

class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow admin users to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

