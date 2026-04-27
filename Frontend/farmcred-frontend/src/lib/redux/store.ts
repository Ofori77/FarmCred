import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

// Import all slices
import cartReducer from './features/cartSlice'
import marketplaceReducer from './features/marketplaceSlice'
import ordersReducer from './features/ordersSlice'
import userReducer from './features/userSlice'
import chatReducer from './features/chatSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    marketplace: marketplaceReducer,
    orders: ordersReducer,
    user: userReducer,
    chat: chatReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector 