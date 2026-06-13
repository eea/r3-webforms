# RN3 API Integration Setup

This document explains how the RN3 API integration has been set up in the frontend application.

## Files Created

### 1. Environment Configuration
**File:** `.env.local`
- Contains RN3 API credentials and base URL
- This file is gitignored for security
- Variables are prefixed with `VITE_` to be accessible in the browser

```env
VITE_RN3_API_URL=https://sandbox-api.reportnet.europa.eu
VITE_RN3_CUSTODIAN_USERNAME=fotios.kouretas.custodian@trasys.gr
VITE_RN3_CUSTODIAN_PASSWORD=1234
```

### 2. Type Definitions
**File:** `src/types/rn3.ts`
- TypeScript interfaces for RN3 API responses
- Includes: `RN3AuthResponse`, `RN3User`, `RN3Dataflow`, `RN3Dataset`, `RN3ApiError`

### 3. API Service
**File:** `src/services/rn3Api.ts`
- Complete API service with authentication handling
- Features:
  - Automatic token management (access & refresh tokens)
  - Request/response interceptors
  - Token auto-refresh before expiry
  - Generic HTTP methods (GET, POST, PUT, DELETE)
  - Pre-configured methods for dataflows and datasets

#### Key Methods:
- `authenticate(username?, password?)` - Login to RN3 API
- `getDataflows()` - Fetch all dataflows
- `getDataflow(id)` - Fetch specific dataflow
- `getDatasets(dataflowId)` - Fetch datasets for a dataflow
- `get<T>(endpoint)` - Generic GET request
- `post<T>(endpoint, data)` - Generic POST request
- `put<T>(endpoint, data)` - Generic PUT request
- `delete<T>(endpoint)` - Generic DELETE request
- `logout()` - Clear authentication tokens

### 4. Test Component
**File:** `src/components/RN3Test.tsx`
- Interactive UI for testing RN3 API connection
- Features:
  - Test connection button
  - Authentication button
  - Fetch dataflows button
  - Display API responses
  - Error handling with user-friendly messages

## Usage

### Starting the Development Server
```bash
cd FRONT
npm run dev
```

### Testing the API Connection

1. Open the application in your browser
2. Look for the "RN3 API Connection Test" card at the top
3. Click "Test Connection" to verify the API is reachable
4. Click "Authenticate" to login with credentials from `.env.local`
5. Once authenticated, click "Fetch Dataflows" to retrieve data

### Using the API Service in Your Components

```typescript
import { rn3Api } from '../services/rn3Api';

// In your component
const fetchData = async () => {
  try {
    // Authenticate first (only needed once)
    await rn3Api.authenticate();

    // Fetch dataflows
    const dataflows = await rn3Api.getDataflows();
    console.log(dataflows);

    // Or use generic methods
    const customData = await rn3Api.get('/custom/endpoint');
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

## Important Notes

### API Endpoints
The current implementation uses placeholder endpoints based on typical REST API patterns:
- `/auth/login` - Authentication endpoint
- `/auth/refresh` - Token refresh endpoint
- `/dataflows` - Dataflows list
- `/dataflows/:id` - Specific dataflow
- `/dataflows/:id/datasets` - Datasets for a dataflow

**You will need to update these endpoints** to match the actual RN3 API documentation once you have access to it.

### CORS Configuration
If you encounter CORS errors when connecting to the RN3 API:

1. Check if the RN3 API allows requests from your domain
2. You may need to add proxy configuration in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://sandbox-api.reportnet.europa.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

Then update the base URL in `.env.local`:
```env
VITE_RN3_API_URL=/api
```

### Security Considerations

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Production credentials** - Use different credentials for production
3. **Token storage** - Currently tokens are stored in memory. For production, consider using secure storage (httpOnly cookies or secure localStorage)

## Next Steps

1. **Get RN3 API Documentation** - Update endpoints to match actual API
2. **Test Authentication** - Verify the authentication flow works
3. **Implement Real Features** - Use the API service to build your actual forms
4. **Error Handling** - Add more robust error handling for production
5. **Loading States** - Add proper loading indicators throughout the app
6. **Consider Backend Middleware** - If you decide to use your backend as middleware later, you can easily swap the API service implementation

## Troubleshooting

### Authentication Fails
- Check credentials in `.env.local`
- Verify the API URL is correct
- Check browser console for detailed error messages
- Ensure authentication endpoint matches RN3 API docs

### CORS Errors
- Add proxy configuration (see above)
- Contact RN3 API administrators to whitelist your domain

### TypeScript Errors
- Make sure all dependencies are installed: `npm install`
- Update type definitions in `src/types/rn3.ts` to match actual API responses
