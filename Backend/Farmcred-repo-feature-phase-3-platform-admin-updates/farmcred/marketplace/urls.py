# marketplace/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Produce Listings
    path('listings/', views.list_all_produce_listings, name='all_produce_listings'),
    path('farmer/listings/', views.farmer_produce_listings, name='farmer_produce_listings'),
    path('listings/<int:pk>/', views.public_produce_listing_detail, name='public_produce_listing_detail'),
    path('farmer/listings/<int:pk>/', views.farmer_produce_listing_detail, name='farmer_produce_listing_detail'),
    
    # FIX: Corrected URL pattern to include the listing's primary key
    path('initiate-order/<int:pk>/', views.initiate_purchase_order, name='initiate_purchase_order'),

    # Conversations
    path('conversations/', views.conversations_list_and_initiate, name='conversations_list_and_initiate'),
    path('conversations/<int:pk>/messages/', views.retrieve_conversation_messages, name='retrieve_conversation_messages'),
    path('conversations/<int:pk>/send-message/', views.send_message, name='send_message'),
]
