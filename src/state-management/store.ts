import { configureStore } from '@reduxjs/toolkit'
import storage from 'reduxjs-toolkit-persist/lib/storage'
import { persistStore, FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistCombineReducers } from 'reduxjs-toolkit-persist';

import AnimationSlice from './slices/AnimationSlice.ts'

const persistConfig = {
    key: "root",
    storage: storage,
    timeout: .25
};

const reducers = {
    animation: AnimationSlice,
};

const persistedReducer = persistCombineReducers(persistConfig, reducers);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
            ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),

});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch